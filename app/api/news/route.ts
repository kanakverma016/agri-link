import { jsonError, verifyUser } from '@/lib/server/verify-auth'

const QUERY =
  'farmer OR crop OR agriculture OR mandi OR msp OR farming OR fertilizer OR irrigation OR tractor'

export async function GET(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) return jsonError('News service is not configured (NEWSDATA_API_KEY).', 503)

  const lang = new URL(request.url).searchParams.get('lang')
  if (lang !== 'en' && lang !== 'hi') return jsonError('Unsupported language.', 400)

  const url = new URL('https://newsdata.io/api/1/news')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('qInTitle', QUERY)
  url.searchParams.set('country', 'in')
  url.searchParams.set('language', lang)

  const upstream = await fetch(url, { next: { revalidate: 900 } })
  const data = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return jsonError(`NewsData.io API error: ${data?.results?.message || upstream.statusText}`, upstream.status)
  }
  return Response.json({ results: data?.results ?? [] })
}
