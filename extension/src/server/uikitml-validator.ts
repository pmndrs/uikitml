import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  isValidHTMLTag,
  isValidCustomElement,
  isValidAttribute,
  isValidCSSProperty,
  VOID_ELEMENTS
} from '../shared/uikitml-definitions';
import { kitRegistry } from './kit-registry';

export class UIKitMLValidator {
  
  validateDocument(textDocument: TextDocument): Diagnostic[] {
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];
    
    // Parse and validate HTML structure
    this.validateHTMLStructure(text, textDocument, diagnostics);
    
    // Validate CSS in style tags
    this.validateCSS(text, textDocument, diagnostics);
    
    return diagnostics;
  }
  
  private validateHTMLStructure(text: string, document: TextDocument, diagnostics: Diagnostic[]): void {
    // Find all HTML tags, but exclude those inside <svg> elements
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-_]*)\b[^>]*>/g;
    let match;
    
    // Track if we're inside an SVG element
    let svgDepth = 0;
    
    while ((match = tagRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const originalTagName = match[1];
      const tagName = originalTagName.toLowerCase();
      const startOffset = match.index;
      const endOffset = match.index + fullMatch.length;
      
      const startPos = document.positionAt(startOffset);
      const endPos = document.positionAt(endOffset);
      
      // Track SVG depth
      if (tagName === 'svg' && !fullMatch.startsWith('</')) {
        svgDepth++;
      } else if (tagName === 'svg' && fullMatch.startsWith('</')) {
        svgDepth = Math.max(0, svgDepth - 1);
      }
      
      // Skip tags inside SVG
      if (svgDepth > 0 && tagName !== 'svg') {
        continue;
      }
      
      // Skip closing tags for validation (we only validate opening tags)
      if (fullMatch.startsWith('</')) {
        continue;
      }
      
      // Validate tag name
      // First check if it's a valid HTML tag
      if (!isValidHTMLTag(tagName)) {
        // Not a standard HTML tag, check if it exists in any kit
        const kitsContainingComponent = kitRegistry.getKitsForComponent(originalTagName);

        if (!kitsContainingComponent) {
          // Not in any kit, check if it's a valid custom element format
          if (!isValidCustomElement(originalTagName)) {
            // Invalid format, show warning
            let message = `Element '${originalTagName}' is not found in any kit and may not be supported.`;

            // Check for common custom element errors
            if (originalTagName !== originalTagName.toLowerCase()) {
              message += ` Custom elements must be lowercase.`;
            } else if (originalTagName.includes('_')) {
              message += ` Custom elements cannot contain underscores.`;
            } else {
              message += ` Available kits: uikit-default, uikit-lucide, uikit-horizon.`;
            }

            diagnostics.push({
              severity: DiagnosticSeverity.Warning,
              range: {
                start: startPos,
                end: endPos
              },
              message,
              source: 'uikitml'
            });
          }
          // If it's a valid custom element format but not in kits, it might be custom - don't warn
        }
        // If found in kits, it's valid - no diagnostic needed
      }
      
      // Validate attributes within this tag
      this.validateAttributes(fullMatch, tagName, startOffset, document, diagnostics);
      
      // Validate void element usage
      if (VOID_ELEMENTS.has(tagName) && !fullMatch.includes('/>')) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: startPos,
            end: endPos
          },
          message: `Element '${tagName}' is a void element and should be self-closing.`,
          source: 'uikitml'
        });
      }

      // Warn when non-void elements use self-closing syntax (HTML ignores '/>' here)
      // This commonly breaks custom elements like 'ui-input' or 'ui-checkbox'.
      if (!VOID_ELEMENTS.has(tagName) && /\/\s*>$/.test(fullMatch)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: startPos, end: endPos },
          message: `Element '${originalTagName}' should not be self-closing. Use a separate closing tag (e.g., <${originalTagName}></${originalTagName}>).`,
          source: 'uikitml'
        });
      }
    }
  }
  
  private validateAttributes(tagContent: string, tagName: string, tagStartOffset: number, document: TextDocument, diagnostics: Diagnostic[]): void {
    // Extract attributes from tag content
    const attrRegex = /\s+([a-zA-Z][a-zA-Z0-9-_]*)\s*=\s*["']([^"']*)["']/g;
    let match;
    
    while ((match = attrRegex.exec(tagContent)) !== null) {
      const attrName = match[1];
      const attrValue = match[2];
      const attrStartOffset = tagStartOffset + match.index;
      const attrEndOffset = attrStartOffset + match[0].length;
      
      const startPos = document.positionAt(attrStartOffset);
      const endPos = document.positionAt(attrEndOffset);
      
      // Validate attribute name
      if (!isValidAttribute(attrName)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: startPos,
            end: endPos
          },
          message: `Attribute '${attrName}' may not be supported in uikitml.`,
          source: 'uikitml'
        });
      }
      
      // Validate style attribute content
      if (attrName === 'style') {
        this.validateInlineCSS(attrValue, attrStartOffset + match[0].indexOf(attrValue), document, diagnostics);
      }
      
      // Validate src attribute for images
      if (attrName === 'src' && tagName === 'img') {
        if (!attrValue || attrValue.trim() === '') {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: startPos,
              end: endPos
            },
            message: `Image element requires a valid 'src' attribute.`,
            source: 'uikitml'
          });
        }
      }
    }
  }
  
  private validateCSS(text: string, document: TextDocument, diagnostics: Diagnostic[]): void {
    // Find style tags and validate their content
    const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    
    while ((match = styleTagRegex.exec(text)) !== null) {
      const styleContent = match[1];
      const styleStartOffset = match.index + match[0].indexOf(styleContent);
      
      this.validateCSSContent(styleContent, styleStartOffset, document, diagnostics);
    }
  }
  
  private validateInlineCSS(cssText: string, startOffset: number, document: TextDocument, diagnostics: Diagnostic[]): void {
    this.validateCSSContent(cssText, startOffset, document, diagnostics);
  }
  
  private validateCSSContent(cssText: string, startOffset: number, document: TextDocument, diagnostics: Diagnostic[]): void {
    // Match CSS rules (selector { declarations })
    // Supports class selectors with optional pseudo-classes like .heading:dark
    const ruleRegex = /([.#][a-zA-Z0-9_-]+(?:::[a-zA-Z0-9_-]+|:[a-zA-Z0-9_-]+)?)\s*\{([^}]*)\}/g;
    let ruleMatch;

    while ((ruleMatch = ruleRegex.exec(cssText)) !== null) {
      const declarationsBlock = ruleMatch[2];
      const blockStartOffset = startOffset + ruleMatch.index + ruleMatch[0].indexOf('{') + 1;

      // Now validate the declarations inside this rule
      this.validateCSSDeclarations(declarationsBlock, blockStartOffset, document, diagnostics);
    }

    // Also handle inline style attribute content (no selectors, just declarations)
    // This regex checks if the content looks like inline styles (no curly braces)
    if (!cssText.includes('{') && !cssText.includes('}')) {
      this.validateCSSDeclarations(cssText, startOffset, document, diagnostics);
    }
  }

  private validateCSSDeclarations(cssText: string, startOffset: number, document: TextDocument, diagnostics: Diagnostic[]): void {
    // Parse CSS declarations
    const declarationRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);?/g;
    let match;

    while ((match = declarationRegex.exec(cssText)) !== null) {
      const property = match[1].trim();
      const value = match[2].trim();
      const propStartOffset = startOffset + match.index;
      const propEndOffset = propStartOffset + match[0].length;

      const startPos = document.positionAt(propStartOffset);
      const endPos = document.positionAt(propEndOffset);

      // Validate CSS property
      if (!isValidCSSProperty(property)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: startPos,
            end: endPos
          },
          message: `CSS property '${property}' may not be supported in uikitml.`,
          source: 'uikitml'
        });
      }

      // Validate some common CSS values
      this.validateCSSValue(property, value, propStartOffset, propEndOffset, document, diagnostics);
    }
  }
  
  private validateCSSValue(property: string, value: string, startOffset: number, endOffset: number, document: TextDocument, diagnostics: Diagnostic[]): void {
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(endOffset);
    
    // Validate display values
    if (property === 'display') {
      const validDisplayValues = ['flex', 'none', 'contents', 'block', 'inline', 'inline-block'];
      if (!validDisplayValues.includes(value)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: startPos, end: endPos },
          message: `Display value '${value}' may not be supported. Use: ${validDisplayValues.join(', ')}.`,
          source: 'uikitml'
        });
      }
    }
    
    // Validate flex-direction values
    if (property === 'flex-direction') {
      const validFlexDirections = ['row', 'row-reverse', 'column', 'column-reverse'];
      if (!validFlexDirections.includes(value)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: startPos, end: endPos },
          message: `Flex-direction value '${value}' may not be supported. Use: ${validFlexDirections.join(', ')}.`,
          source: 'uikitml'
        });
      }
    }
    
    // Validate position values
    if (property === 'position') {
      const validPositions = ['static', 'relative', 'absolute', 'fixed'];
      if (!validPositions.includes(value)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: startPos, end: endPos },
          message: `Position value '${value}' may not be supported. Use: ${validPositions.join(', ')}.`,
          source: 'uikitml'
        });
      }
    }
  }
}
