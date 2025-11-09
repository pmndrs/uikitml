import React, { useState, useEffect } from 'react'

export interface PropertyInputProps {
  label: string
  value: any
  originalValue: any
  onChange: (value: any) => void
  type?: 'text' | 'number' | 'select' | 'color'
  options?: string[]
  disabled?: boolean
}

export const PropertyInput: React.FC<PropertyInputProps> = ({
  label,
  value,
  originalValue,
  onChange,
  type = 'text',
  options,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState<string>('')

  // Update local value when prop value changes
  useEffect(() => {
    const isUnset = value === undefined || value === null || value === ''
    setLocalValue(isUnset ? '' : String(value))
  }, [value])

  // Validation function for different property types
  const validateValue = (inputValue: string): boolean => {
    if (inputValue === '' || inputValue === 'unset') {
      return true // Empty values are always valid (will be treated as unset)
    }

    // For number types, allow pure numbers or numbers with units (px, %, em, etc.)
    if (type === 'number') {
      // Match number optionally followed by unit (%, px, em, rem, vh, vw, etc.)
      const numberWithUnitRegex = /^-?\d*\.?\d+(%|px|em|rem|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?$/
      return numberWithUnitRegex.test(inputValue.trim())
    }

    // For color types, allow hex, rgb, rgba, hsl, hsla, and named colors
    if (type === 'color') {
      const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-zA-Z]+)$/
      return colorRegex.test(inputValue.trim())
    }

    // For text fields, most values are valid
    return true
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === '' ? undefined : e.target.value
    onChange(newValue)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  const handleInputBlur = () => {
    const trimmedValue = localValue.trim()

    if (validateValue(trimmedValue)) {
      // Valid value - convert and update
      let newValue: any
      if (trimmedValue === '' || trimmedValue === 'unset') {
        newValue = undefined
      } else if (type === 'number') {
        // Keep the value as string to preserve units like "100%" or "10px"
        newValue = trimmedValue
      } else {
        newValue = trimmedValue
      }
      onChange(newValue)
    } else {
      // Invalid value - restore previous value
      const isUnset = value === undefined || value === null || value === ''
      setLocalValue(isUnset ? '' : String(value))
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // Trigger validation
    }
  }

  // Only show as modified if there's an original value entry in userData
  const isModified = originalValue !== undefined

  // Check if value is unset (undefined or null)
  const isUnset = value === undefined || value === null || value === ''
  const placeholder = isUnset ? 'unset' : undefined

  return (
    <div className="property-row">
      <label>{label}</label>
      {type === 'select' && options ? (
        <select value={isUnset ? '' : value} onChange={handleSelectChange} className={isModified ? 'modified' : ''}>
          <option value="">unset</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type === 'color' ? 'color' : 'text'}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className={isModified ? 'modified' : ''}
        />
      )}
    </div>
  )
}
