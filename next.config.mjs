/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Maps JS API runs in the browser, so the key must be inlined at build time.
  // Restrict GCP_API_KEY_2 by HTTP referrer in Google Cloud since it ships to clients.
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.GCP_API_KEY_2 ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  },
  images: {
    qualities: [50, 70, 75],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
