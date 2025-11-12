import { parse as parse5Parse, serializeOuter } from 'parse5'
import _parseInlineCSS from 'inline-style-parser'
import { conditionals } from '../index.js'

const classRegex = /\.([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\s*{([^}]*)}/g
const idRegex = /#([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\s*{([^}]*)}/g

export interface Position {
  line: number
  column: number
}

export interface Range {
  start: Position
  end: Position
}

export interface RangeInfo {
  element?: Range
  [className: string]: Range | undefined
}

export type ParseConfig = {
  onError?: (message: string) => void
  resolveFile?: (filePath: string) => string
}

/**
 * @param onError Callback function that will be called when parsing errors occur. The parser will still return a result, ignoring any elements that caused errors.
 */
export function parse(
  text: string,
  config?: ParseConfig,
): {
  element: ElementJson | string | undefined
  classes: Record<string, { origin?: string; content: Record<string, any> }>
  ranges: Record<string, Range>
} {
  const document = parse5Parse(text, { sourceCodeLocationInfo: true })

  const ranges: Record<string, Range> = {}
  let nextId = 1

  // First pass: annotate elements with data-uid and collect ranges
  const annotateElements = (node: any): void => {
    if (
      node.nodeName !== '#text' &&
      node.nodeName !== '#comment' &&
      node.sourceCodeLocation &&
      node.nodeName !== 'html' &&
      node.nodeName !== 'head' &&
      node.nodeName !== 'body' &&
      node.nodeName !== 'style' &&
      node.nodeName !== '#document' &&
      node.nodeName !== 'script'
    ) {
      const uid = `uid-${nextId++}`
      const loc = node.sourceCodeLocation

      // Store element range
      ranges[uid] = {
        start: { line: loc.startLine - 1, column: loc.startCol - 1 },
        end: { line: loc.endLine - 1, column: loc.endCol - 1 },
      }

      // Add data-uid attribute
      node.attrs = node.attrs || []
      node.attrs.push({ name: 'data-uid', value: uid })
    }

    // Process style elements to extract CSS ranges and ID styles
    if (node.nodeName === 'style' && node.childNodes && node.childNodes.length > 0) {
      const textNode = node.childNodes[0]
      if (textNode && textNode.nodeName === '#text') {
        extractCssRanges(textNode.value, node.sourceCodeLocation, ranges)
      }
    }

    if (node.childNodes) {
      node.childNodes.forEach(annotateElements)
    }
  }

  annotateElements(document)

  // Convert parse5 document directly to UIKit JSON
  const bodyElement = extractBodyFromDocument(document)

  // Process external CSS files and inline styles into a single target
  const mergedClasses: Record<string, { origin?: string; content: Record<string, any> }> = {}
  processLinkElements(document, config, mergedClasses)
  processInlineStyles(document, mergedClasses)

  return {
    element: toUikitElementJson(bodyElement, config),
    classes: mergedClasses,
    ranges,
  }
}

function mergeCssIntoTarget(
  cssText: string,
  target: Record<string, { origin?: string; content: Record<string, any> }>,
  origin?: string,
): void {
  // Extract regular CSS classes
  let match: RegExpExecArray | null
  while ((match = classRegex.exec(cssText)) != null) {
    const [, name, selector, classContent] = match
    if (name && classContent) {
      let entry = target[name]
      if (entry == null) {
        target[name] = entry = { content: {} }
        if (origin !== undefined) {
          entry.origin = origin
        }
      }
      let content = entry.content
      if (selector != null) {
        if (!(selector in content)) {
          content[selector] = {}
        }
        content = content[selector]
      }
      Object.assign(content, parseInlineCss(classContent))
    }
  }

  // Extract ID styles and treat them as classes with special prefix
  while ((match = idRegex.exec(cssText)) != null) {
    const [, idName, selector, classContent] = match
    if (idName && classContent) {
      const idClassName = `__id__${idName}`
      let entry = target[idClassName]
      if (entry == null) {
        target[idClassName] = entry = { content: {} }
        if (origin !== undefined) {
          entry.origin = origin
        }
      }
      let content = entry.content
      if (selector != null) {
        if (!(selector in content)) {
          content[selector] = {}
        }
        content = content[selector]
      }
      Object.assign(content, parseInlineCss(classContent))
    }
  }
}

function processLinkElements(
  document: any,
  config: ParseConfig | undefined,
  target: Record<string, { origin?: string; content: Record<string, any> }>,
): void {
  const resolveFile = config?.resolveFile
  if (resolveFile == null) {
    return
  }

  // Traverse the document tree looking for link elements
  const findLinkElements = (node: any): void => {
    if (node.nodeName === 'link' && node.attrs) {
      const refAttr = node.attrs.find((attr: any) => attr.name === 'ref')
      if (refAttr && refAttr.value) {
        try {
          const cssContent = resolveFile(refAttr.value)
          mergeCssIntoTarget(cssContent, target, refAttr.value)
        } catch (error) {
          if (config?.onError) {
            config.onError(
              `Error loading CSS file '${refAttr.value}': ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }
      }
    }

    if (node.childNodes) {
      node.childNodes.forEach(findLinkElements)
    }
  }

  findLinkElements(document)
}
function processInlineStyles(
  document: any,
  target: Record<string, { origin?: string; content: Record<string, any> }>,
): void {
  const traverseElements = (element: any): void => {
    if (element.nodeName === 'style' && element.childNodes) {
      // Extract text content from style element's text nodes
      const textContent = element.childNodes
        .filter((child: any) => child.nodeName === '#text')
        .map((child: any) => child.value || '')
        .join('')

      mergeCssIntoTarget(textContent, target)
    }

    if (element.childNodes) {
      for (const node of element.childNodes) {
        traverseElements(node)
      }
    }
  }

  traverseElements(document)
}

function extractCssRanges(cssText: string, styleLocation: any, ranges: Record<string, Range>): void {
  const styleStartLine = styleLocation.startLine - 1
  const styleStartCol = styleLocation.startCol - 1
  const lines = cssText.split('\n')

  // Extract class ranges
  const classRegex = /\.([a-zA-Z_][\w-]*)\s*{/g
  let match

  while ((match = classRegex.exec(cssText)) !== null) {
    const className = match[1]
    if (!className) continue
    const matchIndex = match.index ?? 0

    // Calculate position
    const { line, col } = calculatePosition(lines, matchIndex)
    const startLine = styleStartLine + line
    const startCol = line === 0 ? styleStartCol + col : col

    ranges[className] = {
      start: { line: startLine, column: startCol },
      end: { line: startLine, column: startCol + className.length + 1 },
    }
  }

  // Extract ID styles and treat them as classes with special prefix
  const idRuleRegex = /#([a-zA-Z_][\w-]*)\s*{/g

  while ((match = idRuleRegex.exec(cssText)) !== null) {
    const idName = match[1]
    if (!idName) continue
    const matchIndex = match.index ?? 0

    // Calculate position
    const { line, col } = calculatePosition(lines, matchIndex)
    const startLine = styleStartLine + line
    const startCol = line === 0 ? styleStartCol + col : col

    // Add ID style to ranges with special prefix
    const idClassName = `__id__${idName}`
    ranges[idClassName] = {
      start: { line: startLine, column: startCol },
      end: { line: startLine, column: startCol + idName.length + 1 }, // +1 for the # symbol
    }
  }
}

function calculatePosition(lines: string[], index: number): { line: number; col: number } {
  let charCount = 0
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i]?.length ?? 0
    if (charCount + lineLength >= index) {
      return { line: i, col: index - charCount }
    }
    charCount += lineLength + 1 // +1 for newline
  }
  return { line: lines.length - 1, col: 0 }
}

// Extract body content from parse5 document
function extractBodyFromDocument(document: any): any {
  const htmlNode = document.childNodes?.find((child: any) => child.nodeName === 'html')
  const bodyNode = htmlNode?.childNodes?.find((child: any) => child.nodeName === 'body')

  if (!bodyNode || !bodyNode.childNodes || bodyNode.childNodes.length === 0) {
    return null
  }

  // Filter out whitespace-only text nodes
  const validChildren = bodyNode.childNodes.filter((child: any) => {
    if (child.nodeName === '#text') {
      return (child.value || '').trim().length > 0
    }
    return true
  })

  // If body has a single valid child, return it directly
  if (validChildren.length === 1) {
    return validChildren[0]
  }

  // If multiple children, create a virtual container
  return {
    nodeName: 'div',
    childNodes: validChildren,
    attrs: [],
  }
}

// Helper to recursively remove data-uid attributes from parse5 nodes
function removeDataUidFromNode(node: any): any {
  if (!node || typeof node !== 'object') {
    return node
  }

  // Clone the node
  const clonedNode = { ...node }

  // Remove data-uid from attrs if present
  if (clonedNode.attrs) {
    clonedNode.attrs = clonedNode.attrs.filter((attr: any) => attr.name !== 'data-uid')
  }

  // Recursively clean children
  if (clonedNode.childNodes) {
    clonedNode.childNodes = clonedNode.childNodes.map((child: any) => removeDataUidFromNode(child))
  }

  return clonedNode
}

function toUikitElementJson(element: any, config: ParseConfig | undefined): ElementJson | string | undefined {
  if (!element) {
    return undefined
  }

  // Handle text nodes
  if (element.nodeName === '#text') {
    const text = (element.value || '').trim()
    if (text.length === 0) {
      return undefined
    }
    return text
  }

  // Skip comments and other non-element nodes
  if (element.nodeName === '#comment' || element.nodeName === 'head' || element.nodeName === '#document-type') {
    return undefined
  }

  // Handle element nodes
  const children = (element.childNodes || [])
    .map((node: any) => toUikitElementJson(node, config))
    .filter((elementJson: any) => elementJson != null)

  if (!element.nodeName || element.nodeName === '#document') {
    return children.length <= 1 ? children[0] : undefined
  }

  const sourceTag = element.nodeName.toLowerCase()
  if (sourceTag === 'style') {
    return undefined
  }
  // Only filter out link elements used for CSS imports (with ref attribute)
  // Allow link elements without ref to be processed as custom components
  if (sourceTag === 'link') {
    const hasRefAttr = element.attrs?.some((attr: any) => attr.name === 'ref')
    if (hasRefAttr) {
      return undefined
    }
  }

  let tag = sourceTag
  const properties = toUikitProperties(element.attrs || [])

  // Extract dataUid from attributes
  const dataUidAttr = element.attrs?.find((attr: any) => attr.name === 'data-uid')
  const dataUid = dataUidAttr?.value

  switch (tag) {
    case 'video':
    case 'textarea':
    case 'input':
      return {
        type: tag,
        sourceTag,
        properties,
        dataUid,
      }
    case 'img':
      const srcAttr = element.attrs?.find((attr: any) => attr.name === 'src')
      return {
        type: srcAttr?.value?.endsWith('.svg') ? 'svg' : 'image',
        sourceTag,
        properties,
        dataUid,
      }
    case 'svg':
      // For SVG, serialize without data-uid attributes
      const cleanedElement = removeDataUidFromNode(element)
      return {
        type: 'inline-svg',
        sourceTag,
        properties,
        text: serializeOuter(cleanedElement),
        dataUid,
      }
    case 'div':
      return {
        type: 'container',
        sourceTag,
        children,
        properties,
        dataUid,
      }
  }

  return {
    sourceTag,
    type: 'custom',
    children,
    properties,
    dataUid,
  }
}

export type ElementJson =
  | CustomElementJson
  | ContainerElementJson
  | ImageElementJson
  | InlineSvgElementJson
  | SvgElementJson
  | VideoElementJson
  | InputElementJson
  | TextareaElementJson

export type CustomElementJson = {
  type: 'custom'
  children: ReadonlyArray<ElementJson | string>
  properties: Record<string, any>
  sourceTag: string
  dataUid?: string
}

export type ContainerElementJson = {
  type: 'container'
  children: ReadonlyArray<ElementJson | string>
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type ImageElementJson = {
  type: 'image'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type InlineSvgElementJson = {
  type: 'inline-svg'
  text: string
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type SvgElementJson = {
  type: 'svg'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type VideoElementJson = {
  type: 'video'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type InputElementJson = {
  type: 'input'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

export type TextareaElementJson = {
  type: 'textarea'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  dataUid?: string
}

function toUikitProperties(attributes: Array<{ name: string; value: string }>): Record<string, any> {
  const properties: Record<string, any> = {}

  // Convert parse5 attrs array to object, excluding data-uid
  for (const attr of attributes) {
    if (attr.name !== 'data-uid') {
      properties[attr.name] = attr.value
    }
  }

  // Parse style attribute
  if (properties.style != null) {
    properties.style = parseInlineCss(properties.style) as any
  }
  for (const conditional of conditionals) {
    const colonKey = `${conditional}:style`
    if (properties[colonKey] == null) {
      continue
    }
    properties.style ??= {}
    properties.style[conditional] ??= {}
    Object.assign(properties.style[conditional], parseInlineCss(properties[colonKey]))
    delete properties[colonKey]
  }

  // Convert kebab-case to camelCase
  const finalProperties: Record<string, any> = {}
  for (const [key, value] of Object.entries(properties)) {
    finalProperties[kebabToCamelCase(key)] = value
  }

  return finalProperties
}

// Panel borderRadius properties that are strictly numeric and commonly use 'px' suffix
// These need px stripping since they are panel properties and not parsed as yoga properties
const panelProperties = new Set([
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopRadius',
  'borderLeftRadius',
  'borderRightRadius',
  'borderBottomRadius',
])

export function parseInlineCss(styleString: string) {
  const parsedStyle = _parseInlineCSS(styleString)
  const style: Record<string, string | number> = {}
  for (const parsedStyleEntry of parsedStyle) {
    if (parsedStyleEntry.type === 'comment') {
      continue
    }
    let key = kebabToCamelCase(parsedStyleEntry.property)
    //apply yoga property renamings
    if (key in yogaPropertyRenamings) {
      key = yogaPropertyRenamings[key as keyof typeof yogaPropertyRenamings]
    }

    // Only parse panel properties, leave Yoga properties as-is
    if (panelProperties.has(key)) {
      style[key] = parsePanelPropertyValue(key, parsedStyleEntry.value)
    } else {
      style[key] = parsedStyleEntry.value
    }
  }
  return style
}

/**
 * Parse borderRadius property values that need px unit stripping.
 * These are typed as strict numbers in uikit (unlike opacity/borderBend which support percentages).
 * - Numbers: returned as-is
 * - "Npx": stripped to number
 * - Other units (rem, em, etc.): kept as string with warning
 */
function parsePanelPropertyValue(propertyName: string, value: string): string | number {
  // Handle unitless numbers
  const numberMatch = value.match(/^-?\d+(?:\.\d+)?$/)
  if (numberMatch) {
    return parseFloat(value)
  }

  // Handle px units - strip to number
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (pxMatch) {
    return parseFloat(pxMatch[1]!)
  }

  // Warn about potentially unsupported units for borderRadius properties
  if (value.match(/^-?\d+(?:\.\d+)?(rem|em|pt|vh|vw|vmin|vmax|%)$/)) {
    console.warn(
      `Property "${propertyName}" with value "${value}" may not be supported. ` +
        `Border radius properties only support pixel values (use "10px" or "10").`,
    )
  }

  // Keep everything else as-is (percentages, colors, keywords, etc.)
  return value
}

const yogaPropertyRenamings = {
  rowGap: 'gapRow',
  columnGap: 'gapColumn',
  position: 'positionType',
  top: 'positionTop',
  left: 'positionLeft',
  right: 'positionRight',
  bottom: 'positionBottom',
}

function kebabToCamelCase(value: string) {
  return value.replace(/-./g, (match) => match[1]!.toUpperCase())
}
