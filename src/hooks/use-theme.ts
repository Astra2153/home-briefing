import { useState } from 'react'

type Theme = 'light' | 'dark'

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Storage can be blocked (private mode, embedded views). The theme still works.
  }
}

function initial(): Theme {
  let theme: Theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch {
    // Fall back to the system setting
  }
  apply(theme)
  return theme
}

/** Follows the system on first visit, then remembers the user's choice. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    apply(next) // before the re-render, so anything reading CSS variables sees the new values
    setTheme(next)
  }
  return { theme, toggle }
}
