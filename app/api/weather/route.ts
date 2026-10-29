import { jsonError, verifyUser } from '@/lib/server/verify-auth'

export async function GET(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const apiKeys = getWeatherApiKeys()
  if (apiKeys.length === 0) return jsonError('Weather service is not configured (OPENWEATHER_API_KEY).', 503)

  const district = new URL(request.url).searchParams.get('district')?.trim()
  if (!district || district.length > 80) return jsonError('A valid district is required.', 400)

  let lastStatus = 502
  let lastData: unknown = { message: 'Weather service unavailable.' }

  for (const apiKey of apiKeys) {
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast')
    url.searchParams.set('q', `${district},IN`)
    url.searchParams.set('units', 'metric')
    url.searchParams.set('appid', apiKey)

    try {
      const upstream = await fetch(url, { next: { revalidate: 900 } })
      const data = await upstream.json()
      if (upstream.ok) return Response.json(data, { status: 200 })

      lastStatus = upstream.status
      lastData = data
      // Only a rejected key is worth retrying with the next one.
      if (upstream.status !== 401 && upstream.status !== 429) break
    } catch {
      lastStatus = 502
    }
  }

  return Response.json(lastData, { status: lastStatus })
}

function getWeatherApiKeys(): string[] {
  const keys = [
    process.env.OPENWEATHER_API_KEY,
    ...(process.env.OPENWEATHER_API_KEY_FALLBACKS ?? '').split(','),
  ]
    .map((key) => key?.trim().replace(/^["']|["']$/g, ''))
    .filter((key): key is string => Boolean(key))

  // Working fallbacks first would waste no requests, but keep the primary first for predictability.
  return Array.from(new Set(keys))
}
