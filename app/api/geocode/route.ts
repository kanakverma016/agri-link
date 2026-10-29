import { jsonError, verifyUser } from '@/lib/server/verify-auth'

export async function GET(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)
  const apiKey =
    process.env.GCP_API_KEY_2 ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return jsonError('Geocoding is not configured.', 503)

  const address = new URL(request.url).searchParams.get('address')?.trim().slice(0, 160)
  if (!address) return jsonError('Address is required.', 400)

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
    { cache: 'no-store' },
  )
  if (!res.ok) return jsonError('Geocoding request failed.', 502)
  const data = (await res.json()) as { status: string; results?: { geometry: { location: { lat: number; lng: number } } }[] }
  const loc = data.results?.[0]?.geometry.location
  if (data.status !== 'OK' || !loc) return jsonError('Geocoding failed.', 404)
  return Response.json({ lat: loc.lat, lng: loc.lng })
}
