import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gray Duck',
  description: 'A real-world animal discovery game.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
