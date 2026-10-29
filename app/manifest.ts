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
      { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    prefer_related_applications: false,
    shortcuts: [
      { name: 'Mandi Prices', url: '/mandi', icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'My Plots', url: '/my-plots', icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'Ask an Expert', url: '/questions', icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }] },
    ],
  }
}
