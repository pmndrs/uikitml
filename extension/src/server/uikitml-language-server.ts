import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Hover,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { UIKitMLValidator } from './uikitml-validator';
import { UIKitMLCompletionProvider } from './uikitml-completion';
import { UIKitMLHoverProvider } from './uikitml-hover';
import { kitRegistry } from './kit-registry';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create validator, completion provider, and hover provider
const validator = new UIKitMLValidator();
const completionProvider = new UIKitMLCompletionProvider();
const hoverProvider = new UIKitMLHoverProvider();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['<', ' ', '=', '"', "'", ':', ';']
      },
      // Tell the client that this server supports hover
      hoverProvider: true
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  // Initialize kit registry
  kitRegistry.initialize().catch(err => {
    connection.console.error('Failed to initialize kit registry: ' + err);
  });

  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The UIKitML settings
interface UIKitMLSettings {
  validate: boolean;
  completion: boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: UIKitMLSettings = { validate: true, completion: true };
let globalSettings: UIKitMLSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<UIKitMLSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <UIKitMLSettings>(
      (change.settings.uikitml || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<UIKitMLSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'uikitml'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // Get the settings for this document
  const settings = await getDocumentSettings(textDocument.uri);
  
  if (!settings.validate) {
    // Clear diagnostics if validation is disabled
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    return;
  }

  // Validate the document
  const diagnostics = validator.validateDocument(textDocument);
  
  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onCompletion(
  async (_textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
    // Get the settings for this document
    const settings = await getDocumentSettings(_textDocumentPosition.textDocument.uri);
    
    if (!settings.completion) {
      return [];
    }

    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
      return [];
    }

    return completionProvider.provideCompletions(document, _textDocumentPosition.position);
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    return completionProvider.resolveCompletionItem(item);
  }
);

// This handler provides hover information for elements
connection.onHover(
  (_textDocumentPosition: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
      return null;
    }

    return hoverProvider.provideHover(document, _textDocumentPosition.position);
  }
);


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();