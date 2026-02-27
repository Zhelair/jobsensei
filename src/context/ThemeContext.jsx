import React, { createContext, useContext, useState, useEffect } from 'react'

export const THEMES = {
  DARK: 'dark',
  DAYLIGHT: 'daylight',
  MYSPACE: 'myspace',
}

export const THEME_META = {
  [THEMES.DARK]: { label: 'Dark', icon: 'Moon' },
  [THEMES.DAYLIGHT]: { label: 'Daylight', icon: 'Sun' },
  [THEMES.MYSPACE]: { label: 'Neon', icon: 'Sparkles' },
}

const THEME_ORDER = [THEMES.DARK, THEMES.DAYLIGHT, THEMES.MYSPACE]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('js_theme') || THEMES.DARK
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('js_theme', theme)
  }, [theme])

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme)
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
