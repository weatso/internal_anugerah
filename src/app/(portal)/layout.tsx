'use client'

import { useState } from 'react'
import { UserProvider } from '@/components/providers/UserProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <UserProvider>
      <div className="flex h-screen overflow-hidden bg-[--color-bg-primary] relative">

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile unless open */}
        <div className={`
          fixed inset-y-0 left-0 z-30 lg:relative lg:flex lg:shrink-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>

      </div>
    </UserProvider>
  )
}
