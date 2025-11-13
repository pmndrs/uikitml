import { Component, Container, Image, Input, Text, Video, Svg, StyleSheet, Textarea } from '@pmndrs/uikit'
import { ContainerElementJson, ElementJson } from '../parser/index.js'
import { computed } from '@preact/signals-core'
import { htmlKit } from './html.js'

export interface Kit {
  [componentName: string]: new (props?: any) => Component
}
export function interpret(
  parseResult: {
    element: ElementJson | string | undefined
    classes: Record<string, { origin?: string; content: Record<string, any> }>
  },
  kit?: Kit,
) {
  if (!parseResult.element) {
    return null
  }

  // Add parsed CSS classes to the global StyleSheet
  for (const [className, classData] of Object.entries(parseResult.classes)) {
    if (classData && typeof classData === 'object' && 'content' in classData) {
      StyleSheet[className] = classData.content as Record<string, any>
    }
  }

  const kitEntries = Object.entries(htmlKit)
  if (kit != null) {
    kitEntries.unshift(...Object.entries(kit))
  }

  return interpretElement(parseResult.element, kitEntries)
}

function interpretElement(json: ElementJson | string, kit?: Array<[string, new (props?: any) => Component]>) {
  if (json === null || json === undefined) {
    return null
  }

  if (typeof json === 'string') {
    const text: Text = new Text({
      text: computed(() => (text.parentContainer.value?.properties.value as any).text ?? json),
      alignSelf: 'stretch',
      flexGrow: 1,
    })
    return text
  }

  const properties = { ...json.properties }
  if (properties.style && typeof properties.style === 'object') {
    Object.assign(properties, properties.style)
    delete properties.style
  }

  const elementId: string | undefined = properties.id
  let element: Component

  switch (json.type) {
    case 'container':
      element = createContainerElement(json, properties)
      break

    case 'custom':
      element = createCustomElement(json, properties, kit)
      break

    case 'image':
      element = createImageElement(json, properties)
      break

    case 'svg':
      element = createSvgElement(json, properties)
      break

    case 'inline-svg':
      element = createInlineSvgElement(json, properties)
      break

    case 'video':
      element = createVideoElement(json, properties)
      break

    case 'input':
      element = createInputElement(json, properties)
      break

    case 'textarea':
      element = createTextareaElement(json, properties)
      break

    default:
      //omit the kit intentionally because we are falling back to an unknown uikit kit component
      element = createCustomElement(json, properties)
      break
  }

  if (elementId) {
    element.userData.id = elementId
  }

  if (json.sourceTag) {
    element.userData.sourceTag = json.sourceTag
  }

  if (json.dataUid) {
    element.userData.dataUid = json.dataUid
  }

  // Preserve data-* attributes in userData, removing data prefix and lowercasing first letter
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('data')) {
      // Remove 'data' prefix and lowercase the first letter of the remaining part
      const userDataKey = key.slice(4, 5).toLowerCase() + key.slice(5)
      element.userData[userDataKey] = value
    }
  }

  if (properties.class) {
    const classNames = (properties.class as string).split(' ').filter((name) => name.trim())
    element.classList.add(...classNames)
  }

  if (element instanceof Container) {
    ;(json as ContainerElementJson).children.forEach((childElementJson: ElementJson | string) => {
      const childElement = interpretElement(childElementJson, kit)
      if (childElement) {
        element.add(childElement)
      }
    })
  }

  return element
}

function createContainerElement(
  _json: ElementJson & { type: 'container' },
  properties: Record<string, any>,
): Container | Text {
  return new Container(properties)
}

function createCustomElement(
  json: ElementJson & { type: 'custom' },
  properties: Record<string, any>,
  kit?: Array<[string, new (props?: any) => Component]>,
): Component {
  const componentName = json.sourceTag
  const CustomComponent = kit == null ? undefined : kit.find(([name]) => name.toLowerCase() === componentName)?.[1]

  if (CustomComponent) {
    const element = new CustomComponent(properties)
    element.userData.customElement = {
      componentName,
      sourceTag: json.sourceTag,
    }
    return element
  } else {
    const element = new Container(properties)
    element.userData.customElement = {
      componentName,
      sourceTag: json.sourceTag,
    }
    //console.warn(`Custom component '${componentName}' not found in kit, falling back to Container`)
    return element
  }
}

function createImageElement(_json: ElementJson & { type: 'image' }, properties: Record<string, any>): Image {
  if (!properties.src) {
    console.warn('Image element missing src property')
    properties.src = ''
  }

  return new Image(properties as any)
}

function createSvgElement(_json: ElementJson & { type: 'svg' }, properties: Record<string, any>): Svg {
  if (!properties.src) {
    console.warn('SVG element missing src property')
    properties.src = ''
  }

  return new Svg(properties)
}

function createInlineSvgElement(json: ElementJson & { type: 'inline-svg' }, properties: Record<string, any>): Svg {
  const svgText = json.text || ''
  return new Svg({
    ...properties,
    content: svgText,
  })
}

function createVideoElement(_json: ElementJson & { type: 'video' }, properties: Record<string, any>): Video {
  if (!properties.src) {
    console.warn('Video element missing src property')
    properties.src = ''
  }

  return new Video(properties)
}

function createTextareaElement(_json: ElementJson & { type: 'textarea' }, properties: Record<string, any>): Input {
  return new Textarea(properties)
}

function createInputElement(_json: ElementJson & { type: 'input' }, properties: Record<string, any>): Input {
  return new Input(properties)
}

export function getElementDescription(json: ElementJson | string): string {
  if (typeof json === 'string') {
    return `Text: "${json.substring(0, 20)}${json.length > 20 ? '...' : ''}"`
  }

  switch (json.type) {
    case 'container':
      return `Container (${json.sourceTag})`
    case 'custom':
      return `Custom: ${json.sourceTag}`
    case 'image':
      return `Image: ${json.properties?.src || 'no src'}`
    case 'svg':
      return `SVG: ${json.properties?.src || 'no src'}`
    case 'inline-svg':
      return `Inline SVG (${json.text?.length || 0} chars)`
    case 'video':
      return `Video: ${json.properties?.src || 'no src'}`
    case 'input':
    case 'textarea':
      return `Input (${json.sourceTag}${json.properties?.multiline ? ', multiline' : ''})`
    default:
      return `Unknown: ${(json as any).type}`
  }
}
