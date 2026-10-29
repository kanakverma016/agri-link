import { jsonError, verifyUser } from '@/lib/server/verify-auth'

export async function GET(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return jsonError('Weather service is not configured (OPENWEATHER_API_KEY).', 503)

  const district = new URL(request.url).searchParams.get('district')?.trim()
  if (!district || district.length > 80) return jsonError('A valid district is required.', 400)

  const url = new URL('https://api.openweathermap.org/data/2.5/forecast')
  url.searchParams.set('q', `${district},IN`)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('appid', apiKey)

  const upstream = await fetch(url, { next: { revalidate: 900 } })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.ok ? 200 : upstream.status })
}
