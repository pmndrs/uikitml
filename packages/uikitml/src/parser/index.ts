import { parse as parse5Parse, serializeOuter } from 'parse5'
import _parseInlineCSS from 'inline-style-parser'
import { htmlElements } from './defaults.js'
import { conditionals } from '../index.js'

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

  // Process link elements with ref attributes and collect additional CSS classes
  const additionalClasses = processLinkElements(document, config)

  // Convert parse5 document directly to UIKit JSON
  const bodyElement = extractBodyFromDocument(document)

  // Merge inline styles with external CSS
  const inlineClasses = toUikitClassesJson(document)
  const mergedClasses = mergeCssClasses(inlineClasses, additionalClasses)

  return {
    element: toUikitElementJson(bodyElement, config),
    classes: mergedClasses,
    ranges,
  }
}

function parseCss(text: string) {
  const result: Array<{ name: string; selector: string | undefined; style: Record<string, string> }> = []
  // Extract regular CSS classes
  let match: RegExpExecArray | null
  while ((match = classRegex.exec(text)) != null) {
    const [, name, selector, classContent] = match
    if (name && classContent) {
      result.push({ name, selector, style: parseInlineCss(classContent) })
    }
  }

  // Extract ID styles and treat them as classes with special prefix
  while ((match = idRegex.exec(text)) != null) {
    const [, idName, selector, classContent] = match
    if (idName && classContent) {
      const idClassName = `__id__${idName}`
      result.push({ name: idClassName, selector, style: parseInlineCss(classContent) })
    }
  }

  return result
}

function processLinkElements(
  document: any,
  config: ParseConfig | undefined,
): Record<string, { origin?: string; content: Record<string, any> }> {
  const linkClasses: Record<string, { origin?: string; content: Record<string, any> }> = {}

  const resolveFile = config?.resolveFile
  if (resolveFile == null) {
    return linkClasses
  }

  // Traverse the document tree looking for link elements
  const findLinkElements = (node: any): void => {
    if (node.nodeName === 'link' && node.attrs) {
      const refAttr = node.attrs.find((attr: any) => attr.name === 'ref')
      if (refAttr && refAttr.value) {
        try {
          const cssContent = resolveFile(refAttr.value)
          const parsedClasses = parseCss(cssContent)

          // Merge parsed classes into linkClasses
          for (const { name, style } of parsedClasses) {
            if (linkClasses[name]) {
              // Merge class content if it already exists
              Object.assign(linkClasses[name].content, style)
            } else {
              linkClasses[name] = {
                origin: refAttr.value,
                content: style,
              }
            }
          }
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
  return linkClasses
}
function mergeCssClasses(
  inlineClasses: Record<string, { origin?: string; content: Record<string, any> }>,
  linkClasses: Record<string, { origin?: string; content: Record<string, any> }>,
): Record<string, { origin?: string; content: Record<string, any> }> {
  const merged = { ...linkClasses }

  // Merge inline classes (these take precedence over link classes)
  for (const [className, classData] of Object.entries(inlineClasses)) {
    if (merged[className]) {
      // Deep merge content, with inline styles taking precedence
      merged[className] = {
        ...merged[className],
        content: { ...merged[className].content, ...classData.content },
      }
    } else {
      merged[className] = classData
    }
  }

  return merged
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

function toUikitClassesJson(element: any) {
  const classesList = toUikitClassesList(element)
  const result: Record<string, { origin?: string; content: Record<string, any> }> = {}
  for (const { name, selector, style } of classesList) {
    let entry = result[name]
    if (entry == null) {
      result[name] = entry = { content: {} }
    }
    let content = entry.content
    if (selector != null) {
      if (!(selector in content)) {
        content[selector] = {}
      }
      content = content[selector]
    }

    Object.assign(content, style)
  }
  return result
}

const classRegex = /\.([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\s*{([^}]*)}/g
const idRegex = /#([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\s*{([^}]*)}/g

function toUikitClassesList(
  element: any,
): Array<{ name: string; selector: string | undefined; style: Record<string, string> }> {
  const result: Array<{ name: string; selector: string | undefined; style: Record<string, string> }> = []

  if (element.nodeName === 'style' && element.childNodes) {
    // Extract text content from style element's text nodes
    const textContent = element.childNodes
      .filter((child: any) => child.nodeName === '#text')
      .map((child: any) => child.value || '')
      .join('')

    result.push(...parseCss(textContent))
  }

  if (element.childNodes) {
    for (const node of element.childNodes) {
      result.push(...toUikitClassesList(node))
    }
  }

  return result
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
  if (sourceTag === 'style' || sourceTag === 'link') {
    return undefined
  }

  let tag = sourceTag
  const properties = toUikitProperties(element.attrs || [])
  let defaultProperties = {}

  // Extract dataUid from attributes
  const dataUidAttr = element.attrs?.find((attr: any) => attr.name === 'data-uid')
  const dataUid = dataUidAttr?.value

  if (tag in htmlElements) {
    const { convertTo, defaultProperties: htmlDefaultProperties } = htmlElements[tag]!
    tag = convertTo ?? 'div'
    defaultProperties = htmlDefaultProperties ?? defaultProperties
  }

  switch (tag) {
    case 'video':
    case 'input':
      return {
        type: tag,
        sourceTag,
        properties,
        defaultProperties,
        dataUid,
      }
    case 'img':
      const srcAttr = element.attrs?.find((attr: any) => attr.name === 'src')
      return {
        type: srcAttr?.value?.endsWith('.svg') ? 'svg' : 'image',
        sourceTag,
        properties,
        defaultProperties,
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
        defaultProperties,
        dataUid,
      }
    case 'div':
      return {
        type: 'container',
        sourceTag,
        children,
        properties,
        defaultProperties,
        dataUid,
      }
  }

  return {
    sourceTag,
    type: 'custom',
    children,
    properties,
    defaultProperties,
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

export type CustomElementJson = {
  type: 'custom'
  children: ReadonlyArray<ElementJson | string>
  properties: Record<string, any>
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type ContainerElementJson = {
  type: 'container'
  children: ReadonlyArray<ElementJson | string>
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type ImageElementJson = {
  type: 'image'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type InlineSvgElementJson = {
  type: 'inline-svg'
  text: string
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type SvgElementJson = {
  type: 'svg'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type VideoElementJson = {
  type: 'video'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
  dataUid?: string
}

export type InputElementJson = {
  type: 'input'
  properties: Record<string, any>
  //for re-converting to .uikitml
  sourceTag: string
  defaultProperties: Record<string, any>
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

export function parseInlineCss(styleString: string) {
  const parsedStyle = _parseInlineCSS(styleString)
  const style: Record<string, string> = {}
  for (const parsedStyleEntry of parsedStyle) {
    if (parsedStyleEntry.type === 'comment') {
      continue
    }
    let key = kebabToCamelCase(parsedStyleEntry.property)
    //apply yoga property renamings
    if (key in yogaPropertyRenamings) {
      key = yogaPropertyRenamings[key as keyof typeof yogaPropertyRenamings]
    }
    style[key] = parsedStyleEntry.value
  }
  return style
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
