'use client'

import { Menu, Search, Bell, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="search"
                placeholder={t('common.search')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
          </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <LanguageSwitcher compact />
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
            <HelpCircle className="h-5 w-5" />
          </button>
          <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}
