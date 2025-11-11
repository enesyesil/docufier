# Docufier

A cross-platform desktop app that lets non-technical documentation maintainers easily create, open, and share portable Markdown-based documents.

Docufier makes Markdown docs behave like PDFs for technical or project manuals — simple to generate, simple to read, no setup required.

## Features

- **Export Documentation**: Package any folder containing Markdown files into a portable `.docf` file
- **View Documents**: Open `.docf` files instantly with a clean, offline viewer
- **Docsify Integration**: Beautiful documentation rendering with sidebar navigation, search, and TOC
- **Theme Support**: Light, dark, and system theme modes
- **Customizable**: Adjustable font size and line spacing
- **Fully Offline**: No internet required to view documents
- **File Association**: Double-click `.docf` files to open them automatically

## Installation

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app:
   ```bash
   npm start
   ```

### Building for macOS

```bash
npm run build:mac
```

This will create a `.dmg` installer in the `dist` folder.

## Usage

### Exporting a .docf File

1. Open Docufier
2. Click "Export as .docf" or "Export Folder as .docf"
3. Select the folder containing your `docs` folder with Markdown files
4. Fill in the document metadata (title, entry file, etc.)
5. Choose where to save the `.docf` file
6. Wait for the export to complete

### Opening a .docf File

- Double-click any `.docf` file (file association)
- Drag and drop a `.docf` file onto the app window
- Use "Open .docf File" button in the app

### CLI Tool

For advanced users or automation:

```bash
npx docufier-pack ./mydocs -o myproject.docf
```

Or use the local CLI:

```bash
node bin/docufier-pack.js ./mydocs -o myproject.docf
```

## .docf File Format

A `.docf` file is a ZIP archive containing:

- `/docs/` - Your Markdown files, images, and assets
- `manifest.json` - Document metadata (title, entry file, theme, etc.)

The format is safe and simple: nothing executes, everything is local.

## Project Structure

```
docufier/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.js    # Main entry point
│   │   ├── fileHandler.js  # .docf open/export logic
│   │   ├── zipHandler.js   # ZIP pack/unpack
│   │   └── manifest.js     # Manifest validation
│   ├── renderer/       # UI (vanilla JS)
│   │   ├── index.html
│   │   ├── viewer/     # Docsify viewer
│   │   ├── export/     # Export wizard
│   │   └── settings/   # Settings panel
│   ├── preload/        # Preload script
│   └── shared/         # Shared constants
├── bin/
│   └── docufier-pack.js  # CLI tool
└── assets/
    └── icons/          # App icons
```

## Requirements

- Node.js 20+
- Electron 31+
- macOS 13+ (for macOS builds)

## Development

The app uses:
- **Electron** for the desktop framework
- **Vanilla JavaScript** for the UI (lightweight, no framework overhead)
- **Docsify** for Markdown rendering (loaded from CDN)
- **electron-builder** for packaging

## License

MIT
