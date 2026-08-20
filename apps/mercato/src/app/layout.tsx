import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '@/lib/i18n/register-dictionary-loader'
import { AppProviders } from '@/components/AppProviders'

import { detectLocale, loadDictionary } from '@open-mercato/shared/lib/i18n/server'
import { resolveForcedLocale } from '@open-mercato/shared/lib/i18n/locale'

// Шрифты сайта asystemreg.com. Переменные названы как у апстрима (--font-geist-*),
// чтобы токены темы подхватились без правки классов интерфейса; next/font кладёт
// файлы в собственную раздачу — внешний CDN шрифтов запрещён политикой CSP.
const sans = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-geist-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-geist-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'asystem ERP',
  description: 'AI-supportive, modular ERP foundation for product & service companies',
  icons: {
    icon: '/open-mercato.svg',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await detectLocale()
  const dict = await loadDictionary(locale)
  const localeLocked = resolveForcedLocale(process.env) !== null
  const demoModeEnabled = process.env.DEMO_MODE !== 'false'
  const noticeBarsEnabled = process.env.OM_INTEGRATION_TEST !== 'true'
  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          key="om-theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('om-theme');
                  var theme = stored === 'dark' ? 'dark'
                    : stored === 'light' ? 'light'
                    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning data-gramm="false">
        <AppProviders locale={locale} dict={dict} localeLocked={localeLocked} demoModeEnabled={demoModeEnabled} noticeBarsEnabled={noticeBarsEnabled}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
