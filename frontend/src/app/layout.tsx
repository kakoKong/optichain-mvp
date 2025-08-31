import './globals.css'
import { ThemeProvider } from 'next-themes'
import type { Metadata } from 'next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"     // will set data-theme="light|gray|dark" on <html>
          defaultTheme="gray"
          enableSystem={false}
          themes={['light','gray','dark']}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  title: {
    default: 'OptiChain',
    template: '%s | OptiChain',
  },
  icons: {
    icon: '/OptichainLogo2.png',

  },
  description: 'Your Smart Inventory Copilot',
}