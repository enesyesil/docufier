console.log('[PRELOAD] Preload script starting...');

const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Electron modules loaded');
console.log('[PRELOAD] contextBridge available:', typeof contextBridge !== 'undefined');
console.log('[PRELOAD] ipcRenderer available:', typeof ipcRenderer !== 'undefined');

// Define IPC channels directly (avoiding require path issues in preload)
const IPC_CHANNELS = {
  OPEN_DOCF: 'open-docf',
  EXPORT_DOCF: 'export-docf',
  SELECT_FOLDER: 'select-folder',
  SELECT_FILE: 'select-file',
  LOAD_DOCUMENT: 'load-document',
  DOCUMENT_LOADED: 'document-loaded',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  EXPORT_PROGRESS: 'export-progress',
  EXPORT_COMPLETE: 'export-complete',
  EXPORT_ERROR: 'export-error',
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log('[PRELOAD] Attempting to expose electronAPI...');
  
  contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),
    selectFile: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILE),
    exportDocf: (data) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_DOCF, data),
    openDocf: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_DOCF, filePath),
    
    // Document loading
    onLoadDocument: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.LOAD_DOCUMENT, (event, data) => callback(data));
    },
    
    // Export progress
    onExportProgress: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.EXPORT_PROGRESS, (event, data) => callback(data));
    },
    
    onExportComplete: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.EXPORT_COMPLETE, (event, data) => callback(data));
    },
    
    onExportError: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.EXPORT_ERROR, (event, data) => callback(data));
    },
    
    // Settings
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
    saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
    
    // File reading for viewer
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // List files in directory
    listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
    
    // Close current document
    closeDocument: () => ipcRenderer.invoke('close-document'),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
  });
  
  console.log('[PRELOAD] Electron API exposed successfully');
  console.log('[PRELOAD] window.electronAPI should now be available');
  
  // Verify it was actually exposed
  setTimeout(() => {
    console.log('[PRELOAD] Verification: electronAPI exposed =', typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined');
  }, 100);
  
} catch (error) {
  console.error('[PRELOAD] Failed to expose Electron API:', error);
  console.error('[PRELOAD] Error details:', error.stack);
  console.error('[PRELOAD] Error name:', error.name);
  console.error('[PRELOAD] Error message:', error.message);
}

