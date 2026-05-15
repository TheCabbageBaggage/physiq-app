'use client'

import { useMemo, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import '@/lib/i18n'
import { syncLanguageFromProfile } from '@/lib/i18n'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const normalized = pathname?.startsWith('/healthhub') ? pathname.replace('/healthhub', '') || '/' : pathname
  const isAuthPage = useMemo(() => normalized === '/' || normalized === '/login' || normalized === '/register', [normalized])

  useEffect(() => {
    // Check authentication on client side
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    
    // If not authenticated and not on auth page, redirect to login
    if (!token && !isAuthPage) {
      router.push('/healthhub/login')
      return
    }
    
    syncLanguageFromProfile()
  }, [pathname, isAuthPage, router])

  // Show loading while checking auth
  if (isAuthenticated === null && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  if (isAuthPage) {
    return <main className="min-h-screen bg-gray-50">{children}</main>
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex md:w-64 md:shrink-0">
        <Sidebar />
      </div>

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <footer className="border-t border-gray-200 px-4 py-4 md:px-6 text-xs md:text-sm text-gray-500">
          Physiq v2 &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
