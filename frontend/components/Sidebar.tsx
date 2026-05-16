"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Activity, ChevronLeft, ChevronRight, LayoutDashboard, Lock, LogOut, Ruler, Settings, TrendingUp, User, X } from "lucide-react"
import { DEFAULT_SUBSCRIPTION, fetchSubscriptionStatus, hasPlanAccess, type SubscriptionInfo } from "@/lib/subscription"
import { appPath } from "@/lib/api"
import { useTranslation } from "react-i18next"

type SidebarProps = {
  mobileOpen?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const normalizedPathname = pathname?.startsWith("/healthhub") ? pathname.replace("/healthhub", "") || "/" : pathname
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION)

  useEffect(() => {
    fetchSubscriptionStatus().then(setSubscription).catch(() => setSubscription(DEFAULT_SUBSCRIPTION))
  }, [])

  const hasPredictions = hasPlanAccess(subscription.plan_type, subscription.subscription_status, "pro")
  const hasCoaching = hasPlanAccess(subscription.plan_type, subscription.subscription_status, "enterprise")

  const navItems = useMemo(() => [
    { href: "/dashboard", icon: LayoutDashboard, label: t('common.dashboard') },
    { href: "/measurements", icon: Ruler, label: t('common.measurements') },
    { href: "/profile", icon: User, label: t('common.profile') },
    { href: "/settings/profile", icon: Settings, label: t('common.settings') },
  ], [t])

  const premiumItems = useMemo(
    () => [
      { href: hasPredictions ? "/predictions" : "/pricing", icon: TrendingUp, label: hasPredictions ? t('common.predictions') : t('navigation.premium_locked', { feature: t('common.predictions'), plan: 'Pro' }), locked: !hasPredictions },
      { href: hasCoaching ? "/coaching" : "/pricing", icon: Lock, label: hasCoaching ? t('common.coaching') : t('navigation.premium_locked', { feature: t('common.coaching'), plan: 'Enterprise' }), locked: !hasCoaching },
    ],
    [hasPredictions, hasCoaching, t],
  )

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push(appPath("/"))
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />

      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-200 md:w-full md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 shadow-sm"><Activity className="h-4 w-4 text-white" /></div>
            {!collapsed && <div>
              <p className="text-sm font-semibold text-gray-900">{t('navigation.app_name')}</p>
              <p className="text-xs text-slate-500">{t('navigation.app_tagline')}</p>
            </div>}
          </div>
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              <button type="button" onClick={onToggleCollapse} className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600" aria-label="Toggle sidebar">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            )}
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden" aria-label={t('navigation.close_menu')}><X className="h-4 w-4" /></button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 md:px-2 md:py-3">
          {[...navItems, ...premiumItems].map((item) => {
            const isActive = normalizedPathname === item.href || normalizedPathname?.startsWith(item.href + "/")
            const Icon = item.icon as any
            return (
              <Link key={item.href} href={appPath(item.href)} onClick={onClose} className={`group flex items-center rounded-xl border px-3 py-2.5 transition ${isActive ? "border-blue-100 bg-blue-50 text-blue-700" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"} ${collapsed ? 'justify-center' : ''}`} title={item.label}>
                <Icon className="h-5 w-5" />
                {!collapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                {!collapsed && (item as any).locked && <span className="ml-2 text-xs text-amber-600">{t('navigation.upgrade')}</span>}
              </Link>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 pb-3 space-y-3">
            {!hasPlanAccess(subscription.plan_type, subscription.subscription_status, 'pro') && (
              <Link href={appPath('/pricing')} className="block rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.unlock_predictions')}</p>
                <p className="mt-1 text-xs text-gray-700">{t('dashboard.predictions_description')}</p>
                <span className="mt-2 inline-block text-xs font-semibold text-blue-700">{t('dashboard.upgrade_to_pro')}</span>
              </Link>
            )}
            {!hasPlanAccess(subscription.plan_type, subscription.subscription_status, 'enterprise') && (
              <Link href={appPath('/pricing')} className="block rounded-xl border border-purple-200 bg-purple-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{t('dashboard.unlock_coaching')}</p>
                <p className="mt-1 text-xs text-gray-700">{t('dashboard.coaching_description')}</p>
                <span className="mt-2 inline-block text-xs font-semibold text-purple-700">{t('dashboard.upgrade_to_enterprise')}</span>
              </Link>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 p-3">
          <button onClick={handleLogout} className={`flex w-full items-center rounded-xl border border-transparent px-3 py-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${collapsed ? 'justify-center' : ''}`} title={t('common.logout')}>
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3 text-sm font-medium">{t('common.logout')}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
