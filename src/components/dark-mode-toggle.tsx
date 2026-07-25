'use client'

import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="px-2"
      aria-label="Toggle dark mode"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </Button>
  )
}
