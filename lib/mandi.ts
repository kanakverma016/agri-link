export const LOCATION_DATA: Record<string, string[]> = {
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Prayagraj', 'Bareilly', 'Gorakhpur', 'Jhansi', 'Kanpur', 'Lucknow', 'Meerut', 'Moradabad', 'Varanasi'],
  'Madhya Pradesh': ['Bhopal', 'Gwalior', 'Indore', 'Jabalpur', 'Rewa', 'Sagar', 'Ujjain'],
  Bihar: ['Bhagalpur', 'Gaya', 'Muzaffarpur', 'Patna', 'Purnia'],
  Rajasthan: ['Ajmer', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur'],
  Haryana: ['Ambala', 'Faridabad', 'Gurugram', 'Hisar', 'Karnal', 'Rohtak'],
  Punjab: ['Amritsar', 'Jalandhar', 'Ludhiana', 'Patiala'],
}

export const COMMON_CROPS = [
  { name: 'Potato', icon: 'ph-plant', bg: 'bg-amber-100', fg: 'text-amber-700' },
  { name: 'Onion', icon: 'ph-flower-lotus', bg: 'bg-purple-100', fg: 'text-purple-600' },
  { name: 'Tomato', icon: 'ph-orange', bg: 'bg-red-100', fg: 'text-red-600' },
  { name: 'Wheat', icon: 'ph-grains', bg: 'bg-yellow-100', fg: 'text-yellow-700' },
  { name: 'Paddy', icon: 'ph-bowl-food', bg: 'bg-lime-100', fg: 'text-lime-700' },
  { name: 'Mustard', icon: 'ph-flower', bg: 'bg-yellow-100', fg: 'text-yellow-600' },
  { name: 'Sugarcane', icon: 'ph-tree', bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  { name: 'Maize', icon: 'ph-grains', bg: 'bg-orange-100', fg: 'text-orange-600' },
  { name: 'Brinjal', icon: 'ph-plant', bg: 'bg-violet-100', fg: 'text-violet-700' },
  { name: 'Cauliflower', icon: 'ph-flower-lotus', bg: 'bg-stone-100', fg: 'text-stone-600' },
  { name: 'Cabbage', icon: 'ph-leaf', bg: 'bg-green-100', fg: 'text-green-700' },
  { name: 'Carrot', icon: 'ph-carrot', bg: 'bg-orange-100', fg: 'text-orange-600' },
  { name: 'Mango', icon: 'ph-orange-slice', bg: 'bg-amber-100', fg: 'text-amber-600' },
  { name: 'Apple', icon: 'ph-cherries', bg: 'bg-rose-100', fg: 'text-rose-600' },
  { name: 'Banana', icon: 'ph-moon', bg: 'bg-yellow-100', fg: 'text-yellow-600' },
]

export const CROP_TRANSLATIONS: Record<string, string> = {
  आलू: 'Potato', प्याज: 'Onion', टमाटर: 'Tomato', गेहूँ: 'Wheat', धान: 'Paddy', सरसों: 'Mustard',
  मक्का: 'Maize', चना: 'Gram', बाजरा: 'Bajra', गन्ना: 'Sugarcane', कपास: 'Cotton', अरहर: 'Arhar',
  सोयाबीन: 'Soyabean', जौ: 'Barley', मटर: 'Peas', बैंगन: 'Brinjal', फूलगोभी: 'Cauliflower',
  पत्तागोभी: 'Cabbage', भिंडी: 'Okra', लौकी: 'Bottle Gourd', तोरई: 'Ridge Gourd', करेला: 'Bitter Gourd',
  खीरा: 'Cucumber', मूली: 'Radish', गाजर: 'Carrot', पालक: 'Spinach', मेथी: 'Fenugreek',
  'हरी मिर्च': 'Green Chilli', अदरक: 'Ginger', लहसुन: 'Garlic', आम: 'Mango', सेब: 'Apple',
  केला: 'Banana', संतरा: 'Orange', अंगूर: 'Grape', अमरूद: 'Guava', अनार: 'Pomegranate',
  पपीता: 'Papaya', अनानास: 'Pineapple', तरबूज: 'Watermelon', खरबूजा: 'Muskmelon',
}

const FRUIT_KEYWORDS = [
  'apple', 'banana', 'mango', 'orange', 'grape', 'guava', 'pomegranate', 'papaya', 'pineapple',
  'watermelon', 'muskmelon', 'litchi', 'chikoo', 'strawberry', 'plum', 'peach', 'pear', 'cherry',
]

export const toEnglishCrop = (input: string) => CROP_TRANSLATIONS[input.trim()] ?? input.trim()
export const isFruit = (englishName: string) => FRUIT_KEYWORDS.includes(englishName.toLowerCase())

export type PriceRow = {
  market: string
  variety: string
  minPrice: number
  maxPrice: number
  modalPrice: number
  date: string
}

const LINE_REGEX =
  /([\w\s.-]+(?:\([\w\s.-]+\))?):?\s*(.*?)\s*-\s*Min\s*₹?(\d+)\s*-\s*Max\s*₹?(\d+)\s*-\s*Modal\s*₹?(\d+)\s*-\s*(?:DATE\s*\()?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i

export function parseMandiPrices(text: string): PriceRow[] {
  const rows: PriceRow[] = []
  for (const line of text.split('\n').map((l) => l.trim())) {
    if (!line || !(line.includes('Min') || line.includes('Modal'))) continue
    const m = line.match(LINE_REGEX)
    if (!m) continue
    rows.push({
      market: m[1].trim().replace(/\*+$/, '').trim(),
      variety: m[2].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '') || 'N/A',
      minPrice: parseInt(m[3], 10),
      maxPrice: parseInt(m[4], 10),
      modalPrice: parseInt(m[5], 10),
      date: m[6],
    })
  }
  return rows
}
