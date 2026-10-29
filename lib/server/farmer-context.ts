import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'

type Row = Record<string, unknown>

export type FarmerSummary = {
  name: string
  plots: number
  crops: { crop: string; plot: string; days: number }[]
}

const DAY_MS = 86_400_000
const MAX_CONTEXT_CHARS = 7000

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const num = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}
const inr = (value: number) => `Rs ${Math.round(value).toLocaleString('en-IN')}`
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const daysBetween = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS))

function agoLabel(days: number) {
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** Reads the signed-in farmer's profile, plots, crop cycles and logged activities into a prompt-ready brief. */
export async function loadFarmerContext(userId: string): Promise<{ text: string; summary: FarmerSummary }> {
  const supabase = getSupabaseAdmin()
  const now = Date.now()

  const [profileRes, plotsRes, cyclesRes, activitiesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('plots').select('*').eq('userId', userId).order('createdAt', { ascending: true }).limit(30),
    supabase.from('cycles').select('*').eq('userId', userId).order('sowingDate', { ascending: false }).limit(60),
    supabase.from('activities').select('*').eq('userId', userId).order('date', { ascending: false }).limit(120),
  ])

  const profile = (profileRes.data ?? {}) as Row
  const plots = (plotsRes.data ?? []) as Row[]
  const cycles = (cyclesRes.data ?? []) as Row[]
  const activities = (activitiesRes.data ?? []) as Row[]

  const name = str(profile.name)
  const summary: FarmerSummary = { name, plots: plots.length, crops: [] }
  const lines: string[] = []

  lines.push(`Today: ${dateLabel(new Date(now).toISOString())}`)
  const profileBits = [
    name && `name ${name}`,
    num(profile.landHolding) > 0 && `total land ${num(profile.landHolding)} acre`,
    str(profile.village) && `village ${str(profile.village)}`,
    str(profile.district) && `district ${str(profile.district)}`,
    str(profile.state) && `state ${str(profile.state)}`,
  ].filter(Boolean)
  lines.push(`Farmer: ${profileBits.length ? profileBits.join(', ') : 'profile details not filled in yet'}`)

  if (plots.length === 0) {
    lines.push('Plots: the farmer has not added any plot yet.')
  } else {
    lines.push(`Plots (${plots.length}):`)
  }

  for (const plot of plots) {
    const plotId = str(plot.id)
    const plotName = str(plot.plotName) || 'Unnamed plot'
    lines.push(`- ${plotName}: ${num(plot.area)} ${str(plot.areaUnit) || 'acre'}, soil ${str(plot.soilType) || 'unknown'}`)

    const plotCycles = cycles.filter((c) => str(c.plotId) === plotId)
    const active = plotCycles.find((c) => str(c.status).toLowerCase() !== 'harvested')
    const past = plotCycles.filter((c) => c !== active)

    if (active) {
      const crop = str(active.cropName) || 'crop'
      const sowing = str(active.sowingDate)
      const days = sowing ? daysBetween(sowing, now) : 0
      summary.crops.push({ crop, plot: plotName, days })
      const cycleActivities = activities.filter((a) => str(a.cycleId) === str(active.id))
      const spent = cycleActivities.reduce((sum, a) => sum + num(a.cost), 0)
      lines.push(
        `  Active crop: ${crop}${str(active.variety) ? ` (${str(active.variety)})` : ''}, sown ${sowing ? dateLabel(sowing) : 'date unknown'}${sowing ? `, day ${days} of the crop` : ''}.`,
      )
      lines.push(`  Spent so far on this crop: ${inr(spent)} across ${cycleActivities.length} logged activities.`)
      for (const a of cycleActivities.slice(0, 5)) {
        const when = str(a.date) ? agoLabel(daysBetween(str(a.date), now)) : 'unknown date'
        const note = str(a.description)
        lines.push(`  * ${str(a.type) || 'Activity'} (${inr(num(a.cost))}) ${when}${note ? `: ${note.slice(0, 80)}` : ''}`)
      }
      if (cycleActivities.length === 0) lines.push('  * No activities logged yet for this crop.')
    } else {
      lines.push('  No active crop on this plot right now.')
    }

    for (const c of past.slice(0, 2)) {
      const yieldQty = num(c.totalYield)
      const price = num(c.sellingPrice)
      const cost = num(c.totalCost)
      lines.push(
        `  Past crop: ${str(c.cropName) || 'crop'}, harvested ${str(c.harvestDate) ? dateLabel(str(c.harvestDate)) : 'earlier'}, yield ${yieldQty} ${str(c.yieldUnit) || 'quintal'}, selling price ${inr(price)} per unit, total cost ${inr(cost)}, approx revenue ${inr(yieldQty * price)}.`,
      )
    }
  }

  const recent = activities.slice(0, 6)
  if (recent.length > 0) {
    lines.push('Latest actions across all plots:')
    for (const a of recent) {
      const when = str(a.date) ? agoLabel(daysBetween(str(a.date), now)) : 'unknown date'
      lines.push(`- ${str(a.type) || 'Activity'} ${inr(num(a.cost))}, ${when}`)
    }
  }

  return { text: lines.join('\n').slice(0, MAX_CONTEXT_CHARS), summary }
}
