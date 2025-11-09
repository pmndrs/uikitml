import { Hover, Position, MarkupKind } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { kitRegistry, KitName } from './kit-registry'
import { isValidHTMLTag } from '../shared/uikitml-definitions'

export class UIKitMLHoverProvider {
  provideHover(document: TextDocument, position: Position): Hover | null {
    const text = document.getText()
    const offset = document.offsetAt(position)

    // Find the tag at the current position
    const tagInfo = this.getTagAtPosition(text, offset)

    if (!tagInfo) {
      return null
    }

    const { tagName } = tagInfo

    // Check if this is a natively supported HTML tag
    const isNativeTag = isValidHTMLTag(tagName.toLowerCase())

    if (isNativeTag) {
      return this.getHoverForNativeTag(tagName)
    }

    // Check if this component exists in any kit
    const kits = kitRegistry.getKitsForComponent(tagName)

    if (kits && kits.length > 0) {
      return this.getHoverForKitComponent(tagName, kits)
    }

    // Tag is neither native nor in kits - show fallback warning
    return this.getHoverForUnsupportedTag(tagName)
  }

  private getHoverForNativeTag(tagName: string): Hover {
    const tagMap: Record<string, string> = {
      div: 'container',
      img: 'image or svg (based on file extension)',
      svg: 'inline-svg',
      video: 'video',
      input: 'input',
      textarea: 'textarea',
      style: 'CSS styles (processed but not rendered)',
    }

    const mappedType = tagMap[tagName.toLowerCase()] || tagName

    const markdown = [
      `**${tagName}** (Native HTML element)`,
      '',
      `Maps to: \`${mappedType}\``,
      '',
      'This element is natively supported by the uikitml parser.',
    ].join('\n')

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: markdown,
      },
    }
  }

  private getHoverForKitComponent(tagName: string, kits: KitName[]): Hover {
    // Format the kit names nicely
    const kitList = kits.map((kit) => `\`${kit}\``).join(', ')
    const pluralSuffix = kits.length > 1 ? 's' : ''

    const markdown = [`**${tagName}** (Kit component)`, '', `Available in kit${pluralSuffix}: ${kitList}`].join('\n')

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: markdown,
      },
    }
  }

  private getHoverForUnsupportedTag(tagName: string): Hover {
    const markdown = [
      `**${tagName}** ⚠️`,
      '',
      '**Warning:** This element is not a supported HTML tag and is not found in any installed kit.',
      '',
      'It will **fall back to a `<div>` container** during parsing.',
      '',
      'Available kits: `uikit-default`, `uikit-lucide`, `uikit-horizon`',
    ].join('\n')

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: markdown,
      },
    }
  }

  private getTagAtPosition(text: string, offset: number): { tagName: string; start: number; end: number } | null {
    // Find all tag occurrences
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)\b[^>]*>/g
    let match

    while ((match = tagRegex.exec(text)) !== null) {
      const fullMatch = match[0]
      const tagName = match[1]
      const startOffset = match.index
      const endOffset = match.index + fullMatch.length

      // Check if the cursor is within this tag
      if (offset >= startOffset && offset <= endOffset) {
        // Further check: is the cursor specifically on the tag name?
        const tagNameStartInMatch = fullMatch.indexOf(tagName, fullMatch.startsWith('</') ? 2 : 1)
        const tagNameStart = startOffset + tagNameStartInMatch
        const tagNameEnd = tagNameStart + tagName.length

        // Only show hover if cursor is on the tag name itself
        if (offset >= tagNameStart && offset <= tagNameEnd) {
          return {
            tagName,
            start: tagNameStart,
            end: tagNameEnd,
          }
        }
      }
    }

    return null
  }
}
