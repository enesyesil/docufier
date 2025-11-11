const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { openDocf, exportDocf, cleanupTempDir } = require('./fileHandler');
const { IPC_CHANNELS } = require('../shared/constants');

let mainWindow = null;
let currentDocfData = null;

function createWindow() {
  const preloadPath = path.resolve(__dirname, '../preload/preload.js');
  console.log('Preload script path:', preloadPath);
  console.log('Preload script exists:', fs.existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    titleBarStyle: 'hiddenInset', // macOS style
    show: false
  });

  // Debug: Log when preload script loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
    mainWindow.webContents.executeJavaScript('console.log("Window electronAPI available:", typeof window.electronAPI !== "undefined")')
      .catch(err => console.error('Error checking electronAPI:', err));
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Cleanup temp directory when window closes
  mainWindow.on('close', () => {
    if (currentDocfData && currentDocfData.tempDir) {
      cleanupTempDir(currentDocfData.tempDir).catch(console.error);
      currentDocfData = null;
    }
    // Don't trigger any navigation - just cleanup
  });
}

// Handle .docf file open (macOS)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    handleOpenDocf(filePath);
  } else {
    // Wait for window to be ready
    app.whenReady().then(() => {
      handleOpenDocf(filePath);
    });
  }
});

async function handleOpenDocf(filePath) {
  try {
    // Cleanup previous document if exists
    if (currentDocfData && currentDocfData.tempDir) {
      await cleanupTempDir(currentDocfData.tempDir);
      currentDocfData = null;
    }
    
    const docfData = await openDocf(filePath);
    currentDocfData = docfData;
    
    // Only send if window is ready and not destroyed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.LOAD_DOCUMENT, {
        tempDir: docfData.tempDir,
        manifest: docfData.manifest,
        docsPath: docfData.docsPath
      });
    }
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('Error Opening Document', 
        `Could not open .docf file:\n\n${err.message}`);
    }
  }
}

// IPC Handlers
ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Documentation Folder'
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (err) {
    console.error('Error in SELECT_FOLDER:', err);
    throw err;
  }
});

ipcMain.handle(IPC_CHANNELS.SELECT_FILE, async () => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Open .docf File',
      filters: [
        { name: 'Docufier Document', extensions: ['docf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (err) {
    console.error('Error in SELECT_FILE:', err);
    throw err;
  }
});

ipcMain.handle(IPC_CHANNELS.EXPORT_DOCF, async (event, { sourceFolder, outputPath, manifest }) => {
  try {
    // If outputPath is not provided, show save dialog
    if (!outputPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save .docf File',
        defaultPath: path.join(sourceFolder, 'documentation.docf'),
        filters: [
          { name: 'Docufier Document', extensions: ['docf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      outputPath = result.filePath;
    }

    const result = await exportDocf(sourceFolder, outputPath, manifest);
    
    // Send progress updates
    event.sender.send(IPC_CHANNELS.EXPORT_COMPLETE, {
      path: result.path,
      manifest: result.manifest
    });
    
    return { success: true, path: result.path };
  } catch (err) {
    event.sender.send(IPC_CHANNELS.EXPORT_ERROR, {
      message: err.message
    });
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.OPEN_DOCF, async (event, filePath) => {
  try {
    // Cleanup previous document
    if (currentDocfData && currentDocfData.tempDir) {
      await cleanupTempDir(currentDocfData.tempDir);
      currentDocfData = null;
    }

    const docfData = await openDocf(filePath);
    currentDocfData = docfData;
    
    // Only send if window exists and is ready
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.LOAD_DOCUMENT, {
        tempDir: docfData.tempDir,
        manifest: docfData.manifest,
        docsPath: docfData.docsPath
      });
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    const data = await fs.promises.readFile(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // Return defaults
    return {
      theme: 'system',
      fontSize: 'medium',
      lineSpacing: 'normal'
    };
  }
});

ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (event, settings) => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return { success: true };
});

// File reading for viewer (to bypass file:// protocol issues)
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// List files in directory
ipcMain.handle('list-files', async (event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const fileNames = files
      .filter(file => file.isFile())
      .map(file => file.name);
    return { success: true, files: fileNames };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Close current document
ipcMain.handle('close-document', async (event) => {
  try {
    if (currentDocfData && currentDocfData.tempDir) {
      await cleanupTempDir(currentDocfData.tempDir);
      currentDocfData = null;
    }
    return { success: true };
  } catch (err) {
    console.error('Error closing document:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup on quit
  if (currentDocfData && currentDocfData.tempDir) {
    cleanupTempDir(currentDocfData.tempDir).catch(console.error);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Final cleanup
  if (currentDocfData && currentDocfData.tempDir) {
    cleanupTempDir(currentDocfData.tempDir).catch(console.error);
  }
});

