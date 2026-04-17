'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('light', !dark)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !next)
  }

  return (
    <button
      onClick={toggle}
      id="theme-toggle"
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/5 transition-all"
    >
      {isDark ? (
        <><Sun className="w-4 h-4" /><span>Light Mode</span></>
      ) : (
        <><Moon className="w-4 h-4" /><span>Dark Mode</span></>
      )}
    </button>
  )
}
