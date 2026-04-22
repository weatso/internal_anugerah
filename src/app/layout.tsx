import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Anugerah OS',
    default: 'Anugerah Ventures — Internal OS',
  },
  description: 'Platform manajemen operasional internal Anugerah Ventures dan seluruh divisinya.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors theme="dark" />
      </body>
    </html>
  )
}
