export type Category = 'mandi' | 'storage' | 'shop'

export type Place = {
  id: string
  name: string
  lat: number
  lng: number
  category: Category
  timings: string
  phone?: string
}

export const DEFAULT_COORDS = { lat: 28.9845, lng: 77.7064 }

export const PLACES: Place[] = [
  { id: 'meerut_mandi', name: 'Meerut Mandi', lat: 28.978, lng: 77.712, category: 'mandi', timings: '9:00 AM - 6:00 PM' },
  { id: 'kithore_mandi', name: 'Kithore Mandi', lat: 28.885, lng: 77.896, category: 'mandi', timings: '10:00 AM - 5:00 PM' },
  { id: 'sardhana_mandi', name: 'Sardhana Mandi', lat: 29.141, lng: 77.615, category: 'mandi', timings: '9:30 AM - 5:30 PM' },
  { id: 'star_storage', name: 'Star Cold Storage', lat: 28.995, lng: 77.731, category: 'storage', timings: 'Mon-Sat, 10-5', phone: '+91 98765 43210' },
  { id: 'jain_warehouse', name: 'Jain Warehouse', lat: 28.95, lng: 77.68, category: 'storage', timings: '10:00 AM - 6:00 PM', phone: '+91 91234 56789' },
  { id: 'kisan_storage', name: 'Kisan Cold Storage', lat: 29.135, lng: 77.63, category: 'storage', timings: '24/7 (Seasonal)', phone: '+91 99988 77665' },
  { id: 'gupta_khad', name: 'Gupta Khad Bhandar', lat: 28.98, lng: 77.7, category: 'shop', timings: '8:00 AM - 8:00 PM' },
  { id: 'punia_seeds', name: 'Punia Seeds', lat: 28.975, lng: 77.715, category: 'shop', timings: '9:00 AM - 7:00 PM' },
  { id: 'tractor_parts', name: 'Tractor Parts Agency', lat: 28.99, lng: 77.695, category: 'shop', timings: '10:00 AM - 6:00 PM' },
]

export const PRICES: Record<string, Record<string, number>> = {
  apple: { meerut_mandi: 120, kithore_mandi: 115, sardhana_mandi: 122 },
  potato: { meerut_mandi: 20, kithore_mandi: 22 },
  wheat: { sardhana_mandi: 2400, meerut_mandi: 2350 },
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    0.5 -
    Math.cos(dLat) / 2 +
    (Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * (1 - Math.cos(dLon))) / 2
  return R * 2 * Math.asin(Math.sqrt(h))
}
