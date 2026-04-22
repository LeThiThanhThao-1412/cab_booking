import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { Header } from '@/components/layout/header'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'Cab Booking - Đặt xe nhanh chóng, an toàn',
  description: 'Dịch vụ đặt xe công nghệ hàng đầu Việt Nam',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <QueryProvider>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  )
}