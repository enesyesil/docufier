// Export wizard functionality
let currentWizardStep = 0;
let exportData = {
  sourceFolder: null,
  manifest: null,
  outputPath: null
};

const wizardSteps = [
  'folder-selection',
  'manifest-editor',
  'progress',
  'complete'
];

function initExportWizard() {
  const exportBtn = document.getElementById('export-btn');
  const exportWelcomeBtn = document.getElementById('export-welcome-btn');
  const closeExportBtn = document.getElementById('close-export-btn');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', () => showExportWizard());
  }
  
  if (exportWelcomeBtn) {
    exportWelcomeBtn.addEventListener('click', () => showExportWizard());
  }
  
  if (closeExportBtn) {
    closeExportBtn.addEventListener('click', () => hideExportWizard());
  }
  
  // Listen for export events
  if (window.electronAPI) {
    window.electronAPI.onExportComplete((data) => {
      showCompleteStep(data);
    });
    
    window.electronAPI.onExportError((data) => {
      showError(data.message);
    });
  } else {
    console.warn('electronAPI not available - export features may not work');
  }
}

function showExportWizard() {
  const exportScreen = document.getElementById('export-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  const viewerScreen = document.getElementById('viewer-screen');
  
  welcomeScreen.classList.remove('active');
  viewerScreen.classList.remove('active');
  exportScreen.classList.add('active');
  
  currentWizardStep = 0;
  exportData = { sourceFolder: null, manifest: null, outputPath: null };
  
  renderWizardStep();
}

function hideExportWizard() {
  const exportScreen = document.getElementById('export-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  
  exportScreen.classList.remove('active');
  welcomeScreen.classList.add('active');
}

function renderWizardStep() {
  const content = document.getElementById('export-wizard-content');
  if (!content) return;
  
  switch (currentWizardStep) {
    case 0:
      renderFolderSelectionStep(content);
      break;
    case 1:
      renderManifestEditorStep(content);
      break;
    case 2:
      renderProgressStep(content);
      break;
    case 3:
      renderCompleteStep(content);
      break;
  }
}

function renderFolderSelectionStep(container) {
  container.innerHTML = `
    <div class="wizard-step active">
      <h3>Select Documentation Folder</h3>
      <p>Choose the folder containing your ${exportData.sourceFolder ? 'docs' : 'documentation'} folder with Markdown files.</p>
      <div class="wizard-form-group">
        <label>Folder Path</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="folder-path-input" value="${exportData.sourceFolder || ''}" readonly>
          <button class="btn btn-primary" id="browse-folder-btn">Browse</button>
        </div>
      </div>
      <div class="wizard-actions">
        <button class="btn" onclick="hideExportWizard()">Cancel</button>
        <button class="btn btn-primary" id="next-folder-btn" ${!exportData.sourceFolder ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;
  
  const browseBtn = document.getElementById('browse-folder-btn');
  const nextBtn = document.getElementById('next-folder-btn');
  const folderInput = document.getElementById('folder-path-input');
  
  browseBtn.addEventListener('click', async () => {
    try {
      browseBtn.disabled = true;
      browseBtn.textContent = 'Loading...';
      
      if (!window.electronAPI) {
        showError('Electron API not available. Please restart the app.');
        return;
      }

      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        exportData.sourceFolder = folder;
        folderInput.value = folder;
        nextBtn.disabled = false;
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
      showError(`Failed to select folder: ${err.message || 'Unknown error'}`);
    } finally {
      browseBtn.disabled = false;
      browseBtn.textContent = 'Browse';
    }
  });
  
  nextBtn.addEventListener('click', () => {
    currentWizardStep = 1;
    renderWizardStep();
  });
}

function renderManifestEditorStep(container) {
  // Auto-generate manifest (this would normally call the main process)
  const defaultManifest = {
    title: exportData.sourceFolder ? exportData.sourceFolder.split(/[/\\]/).pop() : 'My Documentation',
    entryFile: 'README.md',
    version: '1.0.0',
    theme: 'light'
  };
  
  if (!exportData.manifest) {
    exportData.manifest = defaultManifest;
  }
  
  container.innerHTML = `
    <div class="wizard-step active">
      <h3>Document Information</h3>
      <p>Edit the document metadata. Title and entry file are required.</p>
      <div class="wizard-form-group">
        <label for="manifest-title">Title *</label>
        <input type="text" id="manifest-title" value="${exportData.manifest.title}" required>
      </div>
      <div class="wizard-form-group">
        <label for="manifest-entry">Entry File *</label>
        <input type="text" id="manifest-entry" value="${exportData.manifest.entryFile}" placeholder="README.md" required>
        <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
          The main Markdown file to display (must exist in docs folder)
        </small>
      </div>
      <div class="wizard-form-group">
        <label for="manifest-version">Version</label>
        <input type="text" id="manifest-version" value="${exportData.manifest.version || '1.0.0'}">
      </div>
      <div class="wizard-form-group">
        <label for="manifest-author">Author (optional)</label>
        <input type="text" id="manifest-author" value="${exportData.manifest.author || ''}">
      </div>
      <div class="wizard-actions">
        <button class="btn" onclick="currentWizardStep = 0; renderWizardStep();">Back</button>
        <button class="btn btn-primary" id="next-manifest-btn">Export</button>
      </div>
    </div>
  `;
  
  const nextBtn = document.getElementById('next-manifest-btn');
  const titleInput = document.getElementById('manifest-title');
  const entryInput = document.getElementById('manifest-entry');
  const versionInput = document.getElementById('manifest-version');
  const authorInput = document.getElementById('manifest-author');
  
  nextBtn.addEventListener('click', () => {
    // Validate
    if (!titleInput.value.trim() || !entryInput.value.trim()) {
      showError('Title and entry file are required');
      return;
    }
    
    exportData.manifest = {
      title: titleInput.value.trim(),
      entryFile: entryInput.value.trim(),
      version: versionInput.value.trim() || '1.0.0',
      author: authorInput.value.trim() || undefined
    };
    
    // Prompt for save location
    startExport();
  });
}

function startExport() {
  currentWizardStep = 2;
  renderWizardStep();
  
  // Start export process (outputPath will be determined by save dialog in main process)
  window.electronAPI.exportDocf({
    sourceFolder: exportData.sourceFolder,
    outputPath: null, // Will trigger save dialog
    manifest: exportData.manifest
  }).then(result => {
    if (result.canceled) {
      // User canceled, go back
      currentWizardStep = 1;
      renderWizardStep();
    } else if (result.success) {
      exportData.outputPath = result.path;
      currentWizardStep = 3;
      renderWizardStep();
    }
  }).catch(err => {
    showError(err.message || 'Export failed');
    currentWizardStep = 1;
    renderWizardStep();
  });
}

function renderProgressStep(container) {
  container.innerHTML = `
    <div class="wizard-step active">
      <h3>Exporting...</h3>
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
      </div>
      <p id="progress-message">Preparing export...</p>
      <div class="wizard-actions" style="justify-content: center;">
        <button class="btn" id="cancel-export-btn" disabled>Cancel</button>
      </div>
    </div>
  `;
  
  // Simulate progress (in real implementation, this would come from IPC events)
  let progress = 0;
  const progressFill = document.getElementById('progress-fill');
  const progressMessage = document.getElementById('progress-message');
  
  const messages = [
    'Scanning folder structure...',
    'Validating documentation...',
    'Creating manifest...',
    'Compressing files...',
    'Complete!'
  ];
  
  const interval = setInterval(() => {
    progress += 20;
    if (progress > 100) progress = 100;
    
    progressFill.style.width = progress + '%';
    const messageIndex = Math.min(Math.floor(progress / 25), messages.length - 1);
    progressMessage.textContent = messages[messageIndex];
    
    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 500);
}

function renderCompleteStep(container) {
  container.innerHTML = `
    <div class="wizard-step active">
      <h3>Export Complete!</h3>
      <p style="margin: 20px 0;">Your .docf file has been created successfully.</p>
      <div class="wizard-form-group">
        <label>File Location</label>
        <input type="text" value="${exportData.outputPath || ''}" readonly>
      </div>
      <div class="wizard-actions">
        <button class="btn btn-primary" onclick="hideExportWizard()">Done</button>
      </div>
    </div>
  `;
}

function showCompleteStep(data) {
  if (data.path) {
    exportData.outputPath = data.path;
  }
  currentWizardStep = 3;
  renderWizardStep();
}

function showError(message) {
  const errorModal = document.getElementById('error-modal');
  const errorMessage = document.getElementById('error-message');
  if (errorModal && errorMessage) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
  }
}

// Wait for electronAPI to be available
function waitForElectronAPI(callback, maxAttempts = 50, attempt = 0) {
  console.log(`[WIZARD] Checking for electronAPI (attempt ${attempt + 1}/${maxAttempts})...`);
  console.log(`[WIZARD] window.electronAPI exists:`, typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined');
  
  if (window.electronAPI) {
    console.log('[WIZARD] electronAPI found!');
    callback();
    return;
  }
  
  if (attempt >= maxAttempts - 1) {
    console.error('[WIZARD] electronAPI not available after waiting');
    console.error('[WIZARD] window object:', typeof window);
    console.error('[WIZARD] window.electronAPI:', typeof window !== 'undefined' ? typeof window.electronAPI : 'window undefined');
    callback(); // Still call to initialize, but with warning
    return;
  }
  
  setTimeout(() => waitForElectronAPI(callback, maxAttempts, attempt + 1), 100);
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    waitForElectronAPI(initExportWizard);
  });
} else {
  waitForElectronAPI(initExportWizard);
}

// Export for global access
window.exportWizard = {
  show: showExportWizard,
  hide: hideExportWizard
};

