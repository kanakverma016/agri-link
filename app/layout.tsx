import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import Script from 'next/script'
import { cookies } from 'next/headers'
import { AuthProvider } from '@/components/providers/auth-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { DEFAULT_LANG, LANG_COOKIE, isLang } from '@/lib/i18n/config'
import { PwaRegister } from '@/components/pwa'
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
  appleWebApp: { capable: true, title: 'SmartKrishi', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#047857',
}

const themeInit = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute('content','#0b1512')}}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const stored = (await cookies()).get(LANG_COOKIE)?.value
  const lang = isLang(stored) ? stored : DEFAULT_LANG
  return (
    <html lang={lang} suppressHydrationWarning className={`${nunito.variable} bg-[#ecf4f0] dark:bg-[#0b1512]`}>
      <body className="font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <LanguageProvider initialLang={lang}>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
