/**
 * Root Layout Component
 * 
 * This component defines the root layout for the HealthHub application.
 * Includes the sidebar navigation, header, and main content area.
 * 
 * Features:
 * - Dark sidebar with navigation links
 * - Responsive design for mobile and desktop
 * - Consistent color scheme (primary blue #0066CC)
 * - Authentication state management
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Physiq v2 - Body Intelligence Dashboard',
  description: 'Track your body composition, view progress, and get personalized recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
