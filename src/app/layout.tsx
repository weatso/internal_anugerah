import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { UserProvider } from '@/components/providers/UserProvider'
import { ThemeProvider } from 'next-themes'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <UserProvider>
            {children}
            <Toaster richColors position="top-right" />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
