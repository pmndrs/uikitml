import React, { useState, useRef, useEffect } from 'react'
import { useComponentStore, KitName } from '../store'

const kitOptions: { value: KitName; label: string }[] = [
  { value: 'uikit-default', label: 'Default' },
  { value: 'uikit-horizon', label: 'Horizon' },
  { value: 'uikit-lucide', label: 'Lucide Icons' },
]

export const KitSelector: React.FC = () => {
  const { selectedKits, setSelectedKits } = useComponentStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleKit = (kit: KitName) => {
    if (selectedKits.includes(kit)) {
      setSelectedKits(selectedKits.filter((k) => k !== kit))
    } else {
      setSelectedKits([...selectedKits, kit])
    }
  }

  const getDisplayText = () => {
    if (selectedKits.length === 0) return 'No kits selected'
    if (selectedKits.length === kitOptions.length) return 'All kits'
    return `${selectedKits.length} kit${selectedKits.length > 1 ? 's' : ''}`
  }

  return (
    <div className="kit-selector" ref={dropdownRef}>
      <button className="kit-selector-button" onClick={() => setIsOpen(!isOpen)}>
        <span>{getDisplayText()}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="kit-selector-dropdown">
          {kitOptions.map((option) => (
            <label key={option.value} className="kit-option">
              <input
                type="checkbox"
                checked={selectedKits.includes(option.value)}
                onChange={() => toggleKit(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
