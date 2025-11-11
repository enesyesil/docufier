// Shared constants across main and renderer processes

const MANIFEST_FILENAME = 'manifest.json';
const DOCS_FOLDER = 'docs';
const TEMP_PREFIX = 'docufier-';

// Manifest schema
const REQUIRED_MANIFEST_FIELDS = ['title', 'entryFile'];
const OPTIONAL_MANIFEST_FIELDS = ['theme', 'version', 'author'];

// IPC Channels
const IPC_CHANNELS = {
  // File operations
  OPEN_DOCF: 'open-docf',
  EXPORT_DOCF: 'export-docf',
  SELECT_FOLDER: 'select-folder',
  SELECT_FILE: 'select-file',
  
  // Viewer operations
  LOAD_DOCUMENT: 'load-document',
  DOCUMENT_LOADED: 'document-loaded',
  
  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  
  // Export progress
  EXPORT_PROGRESS: 'export-progress',
  EXPORT_COMPLETE: 'export-complete',
  EXPORT_ERROR: 'export-error',
};

// Allowed file extensions in docs folder
const ALLOWED_EXTENSIONS = [
  '.md', '.markdown',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.css', '.js',
  '.json', '.txt'
];

module.exports = {
  MANIFEST_FILENAME,
  DOCS_FOLDER,
  TEMP_PREFIX,
  REQUIRED_MANIFEST_FIELDS,
  OPTIONAL_MANIFEST_FIELDS,
  IPC_CHANNELS,
  ALLOWED_EXTENSIONS
};

