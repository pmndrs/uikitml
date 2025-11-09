import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { html as beautifyHtml } from "js-beautify";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.3)", // Light yellow background
  border: "1px solid yellow", // Optional border
});

function bringDocumentToFront(
  documentUri: vscode.Uri,
  rangeInfo: {
    start: vscode.Position;
    end: vscode.Position;
  }
) {
  const openEditors = vscode.window.visibleTextEditors;
  // Find the editor with the document you want
  const targetEditor = openEditors.find(
    (editor) => editor.document.uri.toString() === documentUri.toString()
  );
  if (targetEditor) {
    // If the document is already open, reveal the range and focus on it
    const range = new vscode.Range(
      rangeInfo.start,
      rangeInfo.end ?? rangeInfo.start
    );
    targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    targetEditor.setDecorations(decorationType, [range]);
    activeEditor = targetEditor;
    vscode.window.showTextDocument(
      targetEditor.document,
      targetEditor.viewColumn
    );
  }
}

let currentPanel: vscode.WebviewPanel | undefined;
let currentDocument: vscode.TextDocument | undefined;
let activeEditor: vscode.TextEditor | undefined;
let client: LanguageClient;

// Function to clear decorations
function clearDecorations() {
  if (activeEditor) {
    activeEditor.setDecorations(decorationType, []);
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Start the Language Server
  startLanguageServer(context);

  // Register document formatting provider for uikitml files
  // Uses js-beautify to format as HTML
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('uikitml', {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): vscode.TextEdit[] {
        const text = document.getText();

        try {
          // Format using js-beautify HTML formatter
          const formatted = beautifyHtml(text, {
            indent_size: options.tabSize,
            indent_char: options.insertSpaces ? ' ' : '\t',
            max_preserve_newlines: 2,
            preserve_newlines: true,
            indent_inner_html: true,
            wrap_line_length: 100,
            wrap_attributes: 'auto',
            end_with_newline: true,
          });

          // Replace the entire document with formatted content
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
          );

          return [vscode.TextEdit.replace(fullRange, formatted)];
        } catch (error) {
          console.error('Failed to format uikitml document:', error);
          vscode.window.showErrorMessage('Failed to format document: ' + error);
          return [];
        }
      }
    })
  );

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    activeEditor = editor;
    if (editor) {
      const document = editor.document;
      const fileName = document.fileName;
      const fileTypeMatch = path.extname(fileName).toLowerCase() === ".uikitml";
      // Check if the document is a .uikitml file
      if (fileTypeMatch && document !== currentDocument) {
        currentDocument = document;
        if (currentPanel) {
          updateWebviewContent(currentPanel, document);
        }
      }
    }
  });

  // Clear decorations when user starts typing
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (activeEditor && event.document === activeEditor.document) {
      clearDecorations();
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("uikit-preview.showPreview", () => {
      const document = vscode.window.activeTextEditor?.document;

      if (
        !document ||
        path.extname(document.fileName).toLowerCase() !== ".uikitml"
      ) {
        return;
      }
      if (currentPanel) {
        // If a panel already exists, just update the document mapping
        if (currentDocument !== document) {
          currentDocument = document;
          updateWebviewContent(currentPanel, document);
        }
        // Move the panel to the right column if needed
        if (
          currentPanel.viewColumn === vscode.window.activeTextEditor?.viewColumn
        ) {
          currentPanel.reveal(vscode.ViewColumn.Two);
        } else {
          currentPanel.reveal();
        }
      } else {
        // Create a new panel
        currentDocument = document;
        currentPanel = createWebviewPanel(context, document);
      }
    })
  );
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === currentDocument && currentPanel) {
      updateWebviewContent(currentPanel, event.document);
    }
  });
}
function createWebviewPanel(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): vscode.WebviewPanel {
  const basename = path.basename(document.fileName);
  const panel = vscode.window.createWebviewPanel(
    "uikitPreview",
    `${basename} (UIKit)`,
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
  const htmlPath = path.join(
    context.extensionPath,
    "dist",
    "webview",
    "index.html"
  );
  const html = fs.readFileSync(htmlPath, "utf8");
  panel.webview.html = html;
  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  panel.webview.onDidReceiveMessage(
    (message) => {
      const { json, command } = message;
      if (command === "request-content") {
        updateWebviewContent(panel, document);
      } else if (command === "jump-to") {
        if (message.rangeInfo) {
          if (currentDocument) {
            const rangeInfo = {
              start: new vscode.Position(
                message.rangeInfo.start.line,
                message.rangeInfo.start.column
              ),
              end: new vscode.Position(
                message.rangeInfo.end.line,
                message.rangeInfo.end.column
              ),
            };
            bringDocumentToFront(currentDocument.uri, rangeInfo);
          }
        }
      } else if (command === "apply-changes") {
        const { changedProperties, rangeInfo } = message;
        console.log(
          "Applying property changes:",
          JSON.stringify({ changedProperties, rangeInfo }, null, 2)
        );

        if (currentDocument && rangeInfo) {
          // Get the current editor for the document
          const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document === currentDocument
          );

          if (editor) {
            // Create range from rangeInfo
            const range = new vscode.Range(
              new vscode.Position(rangeInfo.start.line, rangeInfo.start.column),
              new vscode.Position(rangeInfo.end.line, rangeInfo.end.column)
            );

            // Get the element text from the specified range
            const elementText = currentDocument.getText(range);
            console.log("Original element text:", elementText);

            // Apply the property changes to the element
            const modifiedElement = applyInlineStyles(
              elementText,
              changedProperties
            );
            console.log("Modified element text:", modifiedElement);

            if (modifiedElement && modifiedElement !== elementText) {
              // Replace the element with the modified version
              const edit = new vscode.WorkspaceEdit();
              edit.replace(currentDocument.uri, range, modifiedElement);

              // Apply the edit and then format the document
              vscode.workspace.applyEdit(edit).then(() => {
                // Bring the document to front first, then format
                console.log("Bringing document to front and formatting");
                if (currentDocument) {
                  vscode.window
                    .showTextDocument(currentDocument, editor.viewColumn)
                    .then(() => {
                      vscode.commands.executeCommand(
                        "editor.action.formatDocument"
                      );
                    });
                }
              });
            }
          }
        }
      } else if (command === "gen-config") {
        vscode.window
          .showSaveDialog({
            defaultUri: vscode.Uri.file(document.fileName),
            filters: { JavaScript: ["js", "jsx"], TypeScript: ["ts", "tsx"] },
          })
          .then((uri) => {
            if (uri) {
              // Get the file extension
              const extension = path.extname(uri.fsPath).toLowerCase();
              if (extension === ".js" || extension === ".jsx") {
                const fileString = `export const uiConfig = /** @type {const} */ (${JSON.stringify(
                  json,
                  null,
                  2
                )});`;
                fs.writeFileSync(uri.fsPath, fileString);
                vscode.window.showInformationMessage(
                  "UIKit config (JS) generated successfully!"
                );
              } else if (extension === ".ts" || extension === ".tsx") {
                const fileString = `export const uiConfig = ${JSON.stringify(
                  json,
                  null,
                  2
                )} as const;`;

                fs.writeFileSync(uri.fsPath, fileString);
                vscode.window.showInformationMessage(
                  "UIKit config (TS) generated successfully!"
                );
              }
            }
          });
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}
async function updateWebviewContent(
  panel: vscode.WebviewPanel,
  document: vscode.TextDocument
) {
  const basename = path.basename(document.fileName);
  panel.title = `${basename} (UIKit)`;

  panel.webview.postMessage({
    command: "update",
    text: document.getText(),
  });
}

export function modifyElementProperty(
  elementText: string,
  property: string,
  value: any
): string | null {
  // Parse the element tag to extract attributes (handle self-closing elements)
  const tagMatch = elementText.match(/^<([^>\s]+)([^>]*?)(\/?)>/);
  if (!tagMatch) {
    return null;
  }

  const tagName = tagMatch[1];
  const attributesText = tagMatch[2];
  const isSelfClosing = tagMatch[3] === "/";
  const restOfElement = elementText.substring(tagMatch[0].length);

  // Parse existing attributes
  const attributes = parseAttributes(attributesText);

  // Apply the property change
  if (
    property === "width" ||
    property === "height" ||
    property === "padding" ||
    property === "paddingTop" ||
    property === "marginTop" ||
    property === "borderTopLeftRadius" ||
    property === "borderTopRightRadius" ||
    property === "borderBottomLeftRadius" ||
    property === "borderBottomRightRadius" ||
    property === "borderWidth" ||
    property === "borderTopWidth" ||
    property === "opacity" ||
    property === "gapRow" ||
    property === "gapColumn" ||
    property === "positionTop" ||
    property === "positionLeft" ||
    property === "positionRight"
  ) {
    // Numeric properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  } else if (
    property === "backgroundColor" ||
    property === "color" ||
    property === "borderColor"
  ) {
    // Color properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  } else if (
    property === "display" ||
    property === "flexDirection" ||
    property === "justifyContent" ||
    property === "alignItems" ||
    property === "positionType"
  ) {
    // Enum properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  }

  // Rebuild the element
  const newAttributesText = serializeAttributes(attributes);
  if (isSelfClosing) {
    return `<${tagName}${newAttributesText} />`;
  } else {
    return `<${tagName}${newAttributesText}>${restOfElement}`;
  }
}

export function parseAttributes(
  attributesText: string
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const regex = /\s+([a-zA-Z-]+)(?:\s*=\s*["']([^"']*)["'])?/g;
  let match;

  while ((match = regex.exec(attributesText)) !== null) {
    const attrName = match[1];
    const attrValue = match[2] || "";
    attributes[attrName] = attrValue;
  }

  return attributes;
}

export function updateStyleAttribute(
  attributes: Record<string, string>,
  property: string,
  value: any
) {
  const currentStyle = attributes.style || "";
  const styleProps = parseStyleString(currentStyle);

  // Convert UIKit property names to CSS property names
  const cssProperty = convertUIKitPropertyToCSS(property);

  // Set the new value
  if (value !== undefined && value !== null && value !== "") {
    styleProps[cssProperty] = String(value);
  } else {
    delete styleProps[cssProperty];
  }

  // Serialize back to style string
  attributes.style = serializeStyleProps(styleProps);
}

export function convertUIKitPropertyToCSS(property: string): string {
  // Map UIKit property names to CSS property names
  const propertyMap: Record<string, string> = {
    // Border radius properties
    borderTopLeftRadius: "border-top-left-radius",
    borderTopRightRadius: "border-top-right-radius",
    borderBottomLeftRadius: "border-bottom-left-radius",
    borderBottomRightRadius: "border-bottom-right-radius",

    // Border width properties
    borderWidth: "border-width",
    borderTopWidth: "border-top-width",
    borderRightWidth: "border-right-width",
    borderBottomWidth: "border-bottom-width",
    borderLeftWidth: "border-left-width",

    // Border color properties
    borderColor: "border-color",
    borderTopColor: "border-top-color",
    borderRightColor: "border-right-color",
    borderBottomColor: "border-bottom-color",
    borderLeftColor: "border-left-color",

    // Background properties
    backgroundColor: "background-color",

    // Text properties
    color: "color",
    fontSize: "font-size",
    fontWeight: "font-weight",
    textAlign: "text-align",

    // Layout properties
    display: "display",
    flexDirection: "flex-direction",
    justifyContent: "justify-content",
    alignItems: "align-items",

    // Spacing properties
    padding: "padding",
    paddingTop: "padding-top",
    paddingRight: "padding-right",
    paddingBottom: "padding-bottom",
    paddingLeft: "padding-left",
    margin: "margin",
    marginTop: "margin-top",
    marginRight: "margin-right",
    marginBottom: "margin-bottom",
    marginLeft: "margin-left",

    // Gap properties
    gapRow: "row-gap",
    gapColumn: "column-gap",
    gap: "gap",

    // Position properties
    positionType: "position",
    positionTop: "top",
    positionRight: "right",
    positionBottom: "bottom",
    positionLeft: "left",

    // Size properties
    width: "width",
    height: "height",
    minWidth: "min-width",
    minHeight: "min-height",
    maxWidth: "max-width",
    maxHeight: "max-height",

    // Other properties
    opacity: "opacity",
    zIndex: "z-index",
  };

  // Return mapped property or convert camelCase to kebab-case as fallback
  return (
    propertyMap[property] || property.replace(/([A-Z])/g, "-$1").toLowerCase()
  );
}

export function parseStyleString(styleStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  if (!styleStr) {
    return props;
  }

  const declarations = styleStr.split(";").filter((d) => d.trim());
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(":");
    if (colonIndex > 0) {
      const prop = decl.substring(0, colonIndex).trim();
      const value = decl.substring(colonIndex + 1).trim();
      props[prop] = value;
    }
  }

  return props;
}

export function serializeStyleProps(props: Record<string, string>): string {
  return Object.entries(props)
    .filter(([_, value]) => value.trim())
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");
}

export function serializeAttributes(
  attributes: Record<string, string>
): string {
  return Object.entries(attributes)
    .filter(([_, value]) => value !== undefined)
    .map(([name, value]) => {
      if (value === "") {
        return ` ${name}`;
      }
      return ` ${name}="${value}"`;
    })
    .join("");
}

export function applyInlineStyles(
  elementText: string,
  changedProperties: Record<string, any>
): string | null {
  // Parse the element tag to extract attributes
  const tagMatch = elementText.match(/^<([^>\s]+)([^>]*?)(\/?)>/);
  if (!tagMatch) {
    return null;
  }

  const tagName = tagMatch[1];
  const attributesText = tagMatch[2];
  const isSelfClosing = tagMatch[3] === "/";
  const restOfElement = elementText.substring(tagMatch[0].length);

  // Parse existing attributes
  const attributes = parseAttributes(attributesText);

  // Apply each changed property to the style attribute
  for (const [property, value] of Object.entries(changedProperties)) {
    updateStyleAttribute(attributes, property, value);
  }

  // Rebuild the element
  const newAttributesText = serializeAttributes(attributes);
  if (isSelfClosing) {
    return `<${tagName}${newAttributesText} />`;
  } else {
    return `<${tagName}${newAttributesText}>${restOfElement}`;
  }
}

function startLanguageServer(context: vscode.ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

  // The debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server only for uikitml documents
    documentSelector: [{ scheme: "file", language: "uikitml" }],
    synchronize: {
      // Notify the server about file changes to '.uikitml' files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.uikitml"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "uikitMLLanguageServer",
    "UIKitML Language Server",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
