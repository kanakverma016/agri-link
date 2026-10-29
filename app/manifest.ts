import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SmartKrishi - Your Digital Farming Partner',
    short_name: 'SmartKrishi',
    description:
      'Live mandi prices, B2B marketplace, logistics, crop plots, schemes and community for farmers.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ecf4f0',
    theme_color: '#047857',
    categories: ['agriculture', 'business', 'productivity'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mandi Prices', url: '/mandi', icons: [{ src: '/icons/192', sizes: '192x192' }] },
      { name: 'My Plots', url: '/my-plots', icons: [{ src: '/icons/192', sizes: '192x192' }] },
      { name: 'Ask an Expert', url: '/questions', icons: [{ src: '/icons/192', sizes: '192x192' }] },
    ],
  }
}
