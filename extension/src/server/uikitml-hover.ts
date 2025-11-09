import { Hover, Position, MarkupKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { kitRegistry, KitName } from './kit-registry';

export class UIKitMLHoverProvider {
  provideHover(document: TextDocument, position: Position): Hover | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Find the tag at the current position
    const tagInfo = this.getTagAtPosition(text, offset);

    if (!tagInfo) {
      return null;
    }

    const { tagName } = tagInfo;

    // Check if this component exists in any kit
    const kits = kitRegistry.getKitsForComponent(tagName);

    if (!kits || kits.length === 0) {
      return null;
    }

    // Format the kit names nicely
    const kitList = kits.map(kit => `\`${kit}\``).join(', ');
    const pluralSuffix = kits.length > 1 ? 's' : '';

    const markdown = [
      `**${tagName}**`,
      '',
      `Available in kit${pluralSuffix}: ${kitList}`
    ].join('\n');

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: markdown
      }
    };
  }

  private getTagAtPosition(text: string, offset: number): { tagName: string; start: number; end: number } | null {
    // Find all tag occurrences
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)\b[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];
      const startOffset = match.index;
      const endOffset = match.index + fullMatch.length;

      // Check if the cursor is within this tag
      if (offset >= startOffset && offset <= endOffset) {
        // Further check: is the cursor specifically on the tag name?
        const tagNameStartInMatch = fullMatch.indexOf(tagName, fullMatch.startsWith('</') ? 2 : 1);
        const tagNameStart = startOffset + tagNameStartInMatch;
        const tagNameEnd = tagNameStart + tagName.length;

        // Only show hover if cursor is on the tag name itself
        if (offset >= tagNameStart && offset <= tagNameEnd) {
          return {
            tagName,
            start: tagNameStart,
            end: tagNameEnd
          };
        }
      }
    }

    return null;
  }
}
