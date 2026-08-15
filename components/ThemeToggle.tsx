'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const initialTheme = savedTheme || 'dark'
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  function applyTheme(newTheme: 'light' | 'dark') {
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
      root.style.setProperty('--background', '#ffffff')
      root.style.setProperty('--foreground', '#0a0a0a')
      root.style.setProperty('--muted', '#f5f5f5')
      root.style.setProperty('--border', '#e5e5e5')
      root.style.setProperty('--accent', '#6366f1')
      root.style.setProperty('--accent-hover', '#4f46e5')
    } else {
      root.classList.add('dark')
      root.style.setProperty('--background', '#0a0a0a')
      root.style.setProperty('--foreground', '#fafafa')
      root.style.setProperty('--muted', '#1a1a1a')
      root.style.setProperty('--border', '#2a2a2a')
      root.style.setProperty('--accent', '#6366f1')
      root.style.setProperty('--accent-hover', '#818cf8')
    }
  }

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors touch-manipulation"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-[var(--foreground)]" />
      ) : (
        <Moon size={20} className="text-[var(--foreground)]" />
      )}
    </button>
  )
}
