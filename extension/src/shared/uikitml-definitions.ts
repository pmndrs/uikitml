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
// Includes both standard CSS and custom uikit properties for 3D rendering
export const SUPPORTED_CSS_PROPERTIES = new Set([
  // Layout (Yoga-based flexbox)
  'display',
  'position',
  'position-type',
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'position-top',
  'position-right',
  'position-bottom',
  'position-left',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'aspect-ratio',

  // Flexbox
  'flex-direction',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'flex-wrap',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'order',

  // Spacing
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-x',
  'margin-y',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-x',
  'padding-y',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'gap',
  'gap-row',
  'gap-column',
  'row-gap',
  'column-gap',

  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'vertical-align',
  'text-decoration',
  'text-transform',
  'letter-spacing',
  'word-spacing',
  'word-break',
  'white-space',
  'tab-size',
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
  'border-x-width',
  'border-y-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top-radius',
  'border-left-radius',
  'border-right-radius',
  'border-bottom-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-bend',

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
  'z-index-offset',

  // Transform properties (3D transforms)
  'transform-translate-x',
  'transform-translate-y',
  'transform-translate-z',
  'transform-rotate-x',
  'transform-rotate-y',
  'transform-rotate-z',
  'transform-scale',
  'transform-scale-x',
  'transform-scale-y',
  'transform-scale-z',
  'transform-origin-x',
  'transform-origin-y',

  // Scrollbar properties (custom uikit)
  'scrollbar-color',
  'scrollbar-width',
  'scrollbar-z-index',
  'scrollbar-border-radius',
  'scrollbar-border-top-radius',
  'scrollbar-border-left-radius',
  'scrollbar-border-right-radius',
  'scrollbar-border-bottom-radius',
  'scrollbar-border-top-left-radius',
  'scrollbar-border-top-right-radius',
  'scrollbar-border-bottom-left-radius',
  'scrollbar-border-bottom-right-radius',
  'scrollbar-border-width',
  'scrollbar-border-x-width',
  'scrollbar-border-y-width',
  'scrollbar-border-top-width',
  'scrollbar-border-right-width',
  'scrollbar-border-bottom-width',
  'scrollbar-border-left-width',
  'scrollbar-border-color',
  'scrollbar-border-bend',

  // Caret properties (custom uikit - text cursor)
  'caret-color',
  'caret-width',
  'caret-border-width',
  'caret-border-x-width',
  'caret-border-y-width',
  'caret-border-top-width',
  'caret-border-right-width',
  'caret-border-bottom-width',
  'caret-border-left-width',
  'caret-border-radius',
  'caret-border-top-radius',
  'caret-border-left-radius',
  'caret-border-right-radius',
  'caret-border-bottom-radius',
  'caret-border-top-left-radius',
  'caret-border-top-right-radius',
  'caret-border-bottom-left-radius',
  'caret-border-bottom-right-radius',
  'caret-border-color',
  'caret-border-bend',

  // Selection properties (custom uikit - text selection)
  'selection-color',
  'selection-border-width',
  'selection-border-x-width',
  'selection-border-y-width',
  'selection-border-top-width',
  'selection-border-right-width',
  'selection-border-bottom-width',
  'selection-border-left-width',
  'selection-border-radius',
  'selection-border-top-radius',
  'selection-border-left-radius',
  'selection-border-right-radius',
  'selection-border-bottom-radius',
  'selection-border-top-left-radius',
  'selection-border-top-right-radius',
  'selection-border-bottom-left-radius',
  'selection-border-bottom-right-radius',
  'selection-border-color',
  'selection-border-bend',

  // 3D rendering properties (custom uikit)
  'fill',
  'receive-shadow',
  'cast-shadow',
  'depth-test',
  'depth-write',
  'render-order',
  'panel-material-class',
  'pixel-size',

  // Size and anchor properties (custom uikit)
  'size-x',
  'size-y',
  'anchor-x',
  'anchor-y',
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
