import { CompletionItem, CompletionItemKind, Position, InsertTextFormat, MarkupKind } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  getHTMLTagCompletions,
  getAttributeCompletions,
  getCSSPropertyCompletions,
  VOID_ELEMENTS,
} from '../shared/uikitml-definitions'

export class UIKitMLCompletionProvider {
  provideCompletions(document: TextDocument, position: Position): CompletionItem[] {
    const text = document.getText()
    const offset = document.offsetAt(position)
    const lineText = document.getText({
      start: { line: position.line, character: 0 },
      end: position,
    })

    // Determine context and provide appropriate completions
    if (this.isInStyleTag(text, offset)) {
      return this.provideCSSCompletions(lineText)
    }

    if (this.isInStyleAttribute(lineText)) {
      return this.provideCSSCompletions(lineText)
    }

    if (this.isInAttributeValue(lineText)) {
      return this.provideAttributeValueCompletions(lineText)
    }

    if (this.isInTagAttributes(lineText)) {
      const tagName = this.getCurrentTagName(lineText)
      return this.provideAttributeCompletions(tagName)
    }

    if (this.isInTagName(lineText)) {
      return this.provideTagCompletions()
    }

    return []
  }

  resolveCompletionItem(item: CompletionItem): CompletionItem {
    // Add additional information to completion items
    if (item.data === 'html-tag') {
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `UIKitML element: **${item.label}**\n\nSupported in uikitml for building 3D UIs.`,
      }
    } else if (item.data === 'css-property') {
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `CSS property: **${item.label}**\n\nSupported in uikitml for styling 3D UI components.`,
      }
    }

    return item
  }

  private isInStyleTag(text: string, offset: number): boolean {
    const beforeOffset = text.substring(0, offset)
    const lastStyleOpen = beforeOffset.lastIndexOf('<style')
    const lastStyleClose = beforeOffset.lastIndexOf('</style>')

    return lastStyleOpen > lastStyleClose
  }

  private isInStyleAttribute(lineText: string): boolean {
    // Check if we're inside a style attribute
    const styleMatch = lineText.match(/style\s*=\s*["']([^"']*)$/)
    return !!styleMatch
  }

  private isInAttributeValue(lineText: string): boolean {
    // Check if we're inside an attribute value (between quotes)
    const quoteCount = (lineText.match(/"/g) || []).length
    return quoteCount % 2 === 1
  }

  private isInTagAttributes(lineText: string): boolean {
    // Check if we're inside a tag's attributes
    const tagMatch = lineText.match(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*$/)
    return !!tagMatch
  }

  private isInTagName(lineText: string): boolean {
    // Check if we're typing a tag name
    return lineText.endsWith('<') || /(<\/?)([a-zA-Z][a-zA-Z0-9-]*)$/.test(lineText)
  }

  private getCurrentTagName(lineText: string): string {
    const tagMatch = lineText.match(/<([a-zA-Z][a-zA-Z0-9-]*)/)
    return tagMatch ? tagMatch[1] : ''
  }

  private provideTagCompletions(): CompletionItem[] {
    const tags = getHTMLTagCompletions()

    return tags.map((tag) => {
      const isVoid = VOID_ELEMENTS.has(tag)
      const insertText = isVoid ? `${tag} />` : `${tag}>$1</${tag}>`

      return {
        label: tag,
        kind: CompletionItemKind.Property,
        data: 'html-tag',
        insertText: insertText,
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: `UIKitML element: ${tag}`,
      }
    })
  }

  private provideAttributeCompletions(tagName: string): CompletionItem[] {
    const attributes = getAttributeCompletions(tagName)

    return attributes.map((attr) => ({
      label: attr,
      kind: CompletionItemKind.Property,
      data: 'attribute',
      insertText: `${attr}="$1"`,
      insertTextFormat: InsertTextFormat.Snippet,
      documentation: `Attribute: ${attr}`,
    }))
  }

  private provideAttributeValueCompletions(lineText: string): CompletionItem[] {
    // Provide specific value completions based on attribute
    if (lineText.includes('class=')) {
      return [
        { label: 'container', kind: CompletionItemKind.Value },
        { label: 'button', kind: CompletionItemKind.Value },
        { label: 'text', kind: CompletionItemKind.Value },
      ]
    }

    if (lineText.includes('type=')) {
      return [
        { label: 'text', kind: CompletionItemKind.Value },
        { label: 'button', kind: CompletionItemKind.Value },
        { label: 'submit', kind: CompletionItemKind.Value },
        { label: 'checkbox', kind: CompletionItemKind.Value },
        { label: 'radio', kind: CompletionItemKind.Value },
      ]
    }

    return []
  }

  private provideCSSCompletions(lineText: string): CompletionItem[] {
    // Check if we're typing a property name or value
    const propertyMatch = lineText.match(/([a-zA-Z-]+)\s*:\s*([^;]*)$/)

    if (propertyMatch) {
      // We're typing a value
      const property = propertyMatch[1]
      return this.provideCSSValueCompletions(property)
    } else {
      // We're typing a property name
      return this.provideCSSPropertyCompletions()
    }
  }

  private provideCSSPropertyCompletions(): CompletionItem[] {
    const properties = getCSSPropertyCompletions()

    return properties.map((prop) => ({
      label: prop,
      kind: CompletionItemKind.Property,
      data: 'css-property',
      insertText: `${prop}: $1;`,
      insertTextFormat: InsertTextFormat.Snippet,
      documentation: `CSS property: ${prop}`,
    }))
  }

  private provideCSSValueCompletions(property: string): CompletionItem[] {
    const valueCompletions: Record<string, string[]> = {
      display: ['flex', 'none', 'contents', 'block', 'inline', 'inline-block'],
      'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
      'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
      'align-items': ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
      position: ['static', 'relative', 'absolute', 'fixed'],
      'text-align': ['left', 'center', 'right', 'justify'],
      'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
      cursor: ['auto', 'pointer', 'default', 'text', 'move', 'not-allowed'],
      overflow: ['visible', 'hidden', 'scroll', 'auto'],
    }

    const values = valueCompletions[property] || []

    return values.map((value) => ({
      label: value,
      kind: CompletionItemKind.Value,
      insertText: value,
      documentation: `${property} value: ${value}`,
    }))
  }
}
