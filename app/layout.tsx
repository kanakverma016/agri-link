import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { AuthProvider } from '@/components/providers/auth-provider'
import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/fill'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SmartKrishi - Your Digital Farming Partner',
    template: '%s | SmartKrishi',
  },
  description:
    'SmartKrishi (Agri-Link) connects farmers with live mandi prices, a B2B marketplace, logistics, crop plots, government schemes, insurance and a community feed.',
  applicationName: 'SmartKrishi',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#15803d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} bg-green-50`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
