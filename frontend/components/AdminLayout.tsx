'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { apiUrl, getAuthToken, appPath } from '@/lib/api'
import { LayoutDashboard, Mail, PackageOpen, Percent, BarChart3, Shield, Menu, X } from 'lucide-react'

const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/messages/compose', icon: Mail, label: 'Email senden' },
  { href: '/admin/messages/history', icon: PackageOpen, label: 'Email-Verlauf' },
  { href: '/admin/pricing', icon: Percent, label: 'Pricing' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken()
        if (!token) {
          router.push(appPath('/'))
          return
        }
        const res = await fetch(apiUrl('/users/me'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Not authenticated')
        const user = await res.json()
        if (!user.is_admin) {
          router.push(appPath('/dashboard'))
          return
        }
        setIsAdmin(true)
      } catch {
        router.push(appPath('/'))
      }
    }
    checkAdmin()
  }, [router])

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Checking access...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Admin Panel</h2>
            <p className="text-xs text-gray-500">PhysIQ Management</p>
          </div>
          <button className="md:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={appPath(item.href)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <Link
            href={appPath('/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Shield className="h-4 w-4" />
            Back to User Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 flex items-center gap-3">
          <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
