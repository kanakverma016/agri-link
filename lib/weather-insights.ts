export type ForecastSlot = {
  dt: number
  pop?: number
  main: { temp: number; humidity?: number }
  clouds?: { all: number }
  wind?: { speed: number }
  weather: { main: string; description: string }[]
}

const WET_CONDITIONS = ['thunderstorm', 'rain', 'drizzle']

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// The provider reports probability of precipitation, which is often 0 for slots that are clearly
// humid and overcast. Blend it with cloud cover, humidity and the condition so the figure tracks
// the sky instead of sticking at zero.
export function slotRainChance(slot: ForecastSlot): number {
  const reported = clamp(slot.pop ?? 0, 0, 1) * 100
  const condition = slot.weather[0]?.main.toLowerCase() ?? ''
  const description = slot.weather[0]?.description.toLowerCase() ?? ''
  const clouds = slot.clouds?.all ?? 0
  const humidity = slot.main.humidity ?? 50

  let estimate = 0
  if (WET_CONDITIONS.some((c) => condition.includes(c))) {
    estimate = 60
    if (description.includes('light')) estimate = 50
    if (description.includes('heavy') || condition.includes('thunderstorm')) estimate = 85
    estimate += (humidity - 70) * 0.3
  } else {
    // Dry skies: scale from cloud cover, and only count it as a rain risk when the air is humid.
    const humidityFactor = clamp((humidity - 55) / 35, 0, 1)
    estimate = (clouds / 100) * 40 * humidityFactor
  }

  return Math.round(clamp(Math.max(reported, estimate), 0, 100))
}

export type DaySummary = {
  rainChance: number
  minTemp: number
  maxTemp: number
  main: string
  description: string
}

export function summarizeDay(slots: ForecastSlot[]): DaySummary {
  const temps = slots.map((s) => s.main.temp)
  const rainChance = Math.max(...slots.map(slotRainChance))

  // Show the most significant condition of the day rather than whichever slot came first.
  const rank = (s: ForecastSlot) => {
    const c = s.weather[0]?.main.toLowerCase() ?? ''
    if (c.includes('thunderstorm')) return 4
    if (WET_CONDITIONS.some((w) => c.includes(w))) return 3
    if (c.includes('clouds')) return 2
    return 1
  }
  const dominant = slots.reduce((best, s) => (rank(s) > rank(best) ? s : best), slots[0])

  return {
    rainChance,
    minTemp: Math.round(Math.min(...temps)),
    maxTemp: Math.round(Math.max(...temps)),
    main: dominant.weather[0]?.main ?? 'Clear',
    description: dominant.weather[0]?.description ?? '',
  }
}

export function dayAdvisory(day: DaySummary): string {
  if (day.main.toLowerCase().includes('thunderstorm'))
    return 'Thunderstorm likely. Keep crops harvested and stored, avoid field work and spraying.'
  if (day.rainChance >= 70)
    return 'Heavy rain likely. Delay spraying and fertilizer, clear field drainage, cover harvested produce.'
  if (day.rainChance >= 40)
    return 'Rain is possible. Postpone spraying and irrigation, and keep harvested produce covered.'
  if (day.rainChance >= 20)
    return 'Light showers possible. Plan spraying for a clear window and watch the sky.'
  if (day.maxTemp >= 38)
    return 'Very hot and dry. Irrigate early morning or evening and mulch to hold soil moisture.'
  return 'Dry weather. Good day for spraying, sowing and harvesting.'
}
