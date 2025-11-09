/**
 * UIKit Markup Language (uikitml) definitions and validation rules
 * Based on @pmndrs/uikitml parser capabilities
 */

export interface UIKitMLValidationError {
  message: string
  line: number
  column: number
  length: number
  severity: 'error' | 'warning' | 'info'
}

// Supported HTML element types in uikitml
// These are the ONLY tags that are natively supported by the @pmndrs/uikitml parser
// All other tags will be treated as custom components and must exist in a kit,
// or will fall back to a container element
export const SUPPORTED_HTML_TAGS = new Set([
  // Container element
  'div', // Maps to 'container'

  // Form elements
  'textarea', // Maps to 'textarea'
  'input', // Maps to 'input'

  // Media elements
  'img', // Maps to 'image' or 'svg' (based on extension)
  'video', // Maps to 'video'
  'svg', // Maps to 'inline-svg'

  // Special style element (processed but not rendered)
  'style',
])

// Elements that are self-closing/void
export const VOID_ELEMENTS = new Set(['img', 'input'])

// Standard HTML attributes that are commonly supported
export const SUPPORTED_ATTRIBUTES = new Set([
  // Global attributes
  'id',
  'class',
  'style',
  'title',
  'lang',
  'dir',

  // Data attributes (pattern)
  'data-*',

  // Event attributes (pattern)
  'on*',

  // Form attributes
  'type',
  'name',
  'value',
  'placeholder',
  'disabled',
  'required',
  'checked',
  'selected',
  'readonly',
  'multiple',
  'autocomplete',

  // Media attributes
  'src',
  'alt',
  'width',
  'height',
  'loading',
  'crossorigin',

  // Link attributes
  'href',
  'target',
  'rel',
  'download',

  // Layout attributes (converted to CSS properties)
  'tabindex',
  'role',
  'aria-*',
])

// CSS properties that are commonly supported in uikitml
export const SUPPORTED_CSS_PROPERTIES = new Set([
  // Layout
  'display',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',

  // Flexbox
  'flex-direction',
  'justify-content',
  'align-items',
  'align-content',
  'flex-wrap',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'align-self',
  'order',

  // Spacing
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'row-gap',
  'column-gap',

  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
  'letter-spacing',
  'word-spacing',
  'color',

  // Background and borders
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',

  // Visual effects
  'opacity',
  'visibility',
  'overflow',
  'cursor',
  'pointer-events',
  'transform',
  'transition',
  'animation',
  'z-index',
])

/**
 * Validates if a tag name is supported in uikitml
 */
export function isValidHTMLTag(tagName: string): boolean {
  return SUPPORTED_HTML_TAGS.has(tagName.toLowerCase())
}

/**
 * Validates if a tag is a valid custom element (kit-component format)
 */
export function isValidCustomElement(tagName: string): boolean {
  // Custom elements must be lowercase with at least one hyphen
  const customElementRegex = /^[a-z]+(-[a-z0-9]+)+$/
  return customElementRegex.test(tagName)
}

/**
 * Validates if an attribute name is supported
 */
export function isValidAttribute(attrName: string): boolean {
  const lowerAttr = attrName.toLowerCase()

  // Check exact matches
  if (SUPPORTED_ATTRIBUTES.has(lowerAttr)) {
    return true
  }

  // Check patterns
  if (lowerAttr.startsWith('data-') || lowerAttr.startsWith('aria-') || lowerAttr.startsWith('on')) {
    return true
  }

  return false
}

/**
 * Validates if a CSS property is supported
 */
export function isValidCSSProperty(propName: string): boolean {
  return SUPPORTED_CSS_PROPERTIES.has(propName.toLowerCase())
}

/**
 * Gets completion suggestions for HTML tags
 */
export function getHTMLTagCompletions(): string[] {
  return Array.from(SUPPORTED_HTML_TAGS).sort()
}

/**
 * Gets completion suggestions for attributes based on tag
 */
export function getAttributeCompletions(tagName: string): string[] {
  const baseAttrs = ['id', 'class', 'style']

  switch (tagName.toLowerCase()) {
    case 'img':
      return [...baseAttrs, 'src', 'alt', 'width', 'height', 'loading']
    case 'a':
      return [...baseAttrs, 'href', 'target', 'rel']
    case 'input':
      return [...baseAttrs, 'type', 'name', 'value', 'placeholder', 'disabled', 'required']
    case 'button':
      return [...baseAttrs, 'type', 'disabled', 'name', 'value']
    case 'video':
      return [...baseAttrs, 'src', 'controls', 'autoplay', 'loop', 'muted']
    default:
      return baseAttrs
  }
}

/**
 * Gets completion suggestions for CSS properties
 */
export function getCSSPropertyCompletions(): string[] {
  return Array.from(SUPPORTED_CSS_PROPERTIES).sort()
}
