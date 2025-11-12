# UIKitML for VS Code

Build 3D user interfaces with HTML-like markup and see them come to life in real-time.

UIKitML is a VS Code extension that brings visual development tools to [@pmndrs/uikit](https://github.com/pmndrs/uikit), enabling you to create Three.js-based 3D UIs with immediate visual feedback.

## Features

### 🎨 Three.js-Powered Inspector

A complete visual development environment for your 3D UIs.

**Features:**

- **Live 3D Preview** - Real-time Three.js rendering in a side-by-side view. Changes in your code instantly reflect in the 3D preview.
- **Visual Properties Inspector** - Click any element in the preview to select it. Edit properties like colors, dimensions, spacing, and layouts through an intuitive UI.
- **Click-to-Source Navigation** - Bidirectional sync between preview and code. Click an element's ID to jump directly to its source code with highlighting.
- **Two-way Sync** - Modify properties visually and watch your code update automatically, or edit code and see changes render immediately.

Open any `.uikitml` file and click the **Preview** button in the editor toolbar to launch the inspector.

---

### 🧠 UIKitML Language Server

Full language support with intelligent autocomplete, validation, and documentation.

**Features:**

- **Intelligent Autocomplete** - Context-aware suggestions for HTML tags, attributes, and CSS properties. Get completions for supported elements (`div`, `img`, `video`, `input`, `textarea`, `svg`) and kit components.
- **Smart Validation** - Real-time error checking warns you about unsupported tags and shows which kit components are available. Unsupported tags display warnings explaining they'll fall back to a `<div>` container during parsing.
- **Hover Documentation** - Hover over any tag to see whether it's a native HTML element, a kit component, or unsupported. Native elements show what they map to (e.g., `div` → `container`).
- **Document Formatting** - Auto-format your `.uikitml` files with proper indentation and structure using the built-in HTML formatter.
- **Emmet Support** - Write markup faster with Emmet abbreviations (e.g., `div.container>img+div.text`).

The language server runs automatically when you open `.uikitml` files.

---

### 🎁 Pre-styled Component Kits

Access ready-to-use component libraries with validation and discovery.

**Features:**

- **Multiple Kit Support** - Built-in support for `@pmndrs/uikit-default`, `@pmndrs/uikit-lucide` (icon components), and `@pmndrs/uikit-horizon` (pre-styled UI components).
- **Kit Discovery** - Validation automatically detects which kits contain components. Hover over any component tag to see which kits provide it.
- **Visual Kit Selector** - Toggle between different kits in the preview to see components render with different styles.
- **Extensible** - Works with any custom kit that follows the UIKit component structure.

Components from installed kits are automatically available in autocomplete and validated during development.

---

## Getting Started

1. **Install the extension** from the VS Code marketplace
2. **Create a `.uikitml` file** in your project
3. **Click the Preview button** in the editor toolbar (top right)
4. **Start building** your 3D UI with live feedback

### Example

```html
<div style="flex-direction: column; padding: 20px; background-color: #1a1a1a">
  <text style="font-size: 24px; color: white">Hello UIKit!</text>
  <input type="text" placeholder="Enter text..." />
  <button>Click me</button>
</div>
```

## Supported HTML Elements

The following native HTML elements are supported and map to UIKit components:

- `div` → `container`
- `img` → `image` or `svg` (based on file extension)
- `svg` → `inline-svg`
- `video` → `video`
- `input` → `input`
- `textarea` → `textarea`
- `style` → CSS styles (processed but not rendered)

All other elements must be provided by a kit or will fall back to a `<div>` container.

## Configuration

The extension provides the following settings:

- `uikitml.validate` - Enable/disable validation (default: `true`)
- `uikitml.completion` - Enable/disable autocomplete (default: `true`)

## Requirements

- VS Code 1.99.0 or higher
- Node.js and npm/pnpm (for kit dependencies in your project)

## Links

- [UIKit Documentation](https://github.com/pmndrs/uikit)
- [Report Issues](https://github.com/pmndrs/uikitml/issues)
- [Source Code](https://github.com/pmndrs/uikitml)

## License

MIT
