import React from 'react'
import { useComponentStore } from '../store'

export const ColorSchemeToggle: React.FC = () => {
  const { colorScheme, setColorScheme } = useComponentStore()

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light')
  }

  return (
    <button
      className="color-scheme-toggle"
      onClick={toggleColorScheme}
      title={`Switch to ${colorScheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {colorScheme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
