const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');

const { extractZip, createZip } = require('./zipHandler');
const { loadManifest, validateEntryFile, generateManifest, saveManifest } = require('./manifest');
const { DOCS_FOLDER, TEMP_PREFIX } = require('../shared/constants');

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

/**
 * Open .docf file: extract and validate
 */
async function openDocf(docfPath) {
  // Create temporary directory
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
  
  try {
    // Extract ZIP
    await extractZip(docfPath, tempDir);
    
    // Load and validate manifest
    const manifest = await loadManifest(tempDir);
    
    // Validate entry file exists
    const docsPath = path.join(tempDir, DOCS_FOLDER);
    await validateEntryFile(docsPath, manifest.entryFile);
    
    return {
      tempDir,
      manifest,
      docsPath
    };
  } catch (err) {
    // Cleanup on error
    await cleanupTempDir(tempDir).catch(() => {});
    throw err;
  }
}

/**
 * Export folder as .docf file
 */
async function exportDocf(sourceFolder, outputPath, manifest = null) {
  const steps = {
    scanning: 'Scanning folder structure...',
    validating: 'Validating documentation...',
    creating: 'Creating manifest...',
    compressing: 'Compressing files...',
    complete: 'Complete!'
  };

  // Step 1: Scan folder
  const progressCallback = (step, message) => {
    // This will be handled by IPC in the main process
    console.log(`[${step}] ${message}`);
  };

  progressCallback('scanning', steps.scanning);
  
  // Check if docs folder exists
  const docsPath = path.join(sourceFolder, DOCS_FOLDER);
  try {
    const stats = await stat(docsPath);
    if (!stats.isDirectory()) {
      throw new Error(`${DOCS_FOLDER} is not a directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`${DOCS_FOLDER} folder not found. Please ensure your documentation is in a "${DOCS_FOLDER}" folder.`);
    }
    throw err;
  }

  // Step 2: Validate structure
  progressCallback('validating', steps.validating);
  
  // Check for at least one markdown file
  const files = await readdir(docsPath);
  const hasMarkdown = files.some(f => f.toLowerCase().endsWith('.md') || f.toLowerCase().endsWith('.markdown'));
  
  if (!hasMarkdown) {
    throw new Error(`No Markdown files found in ${DOCS_FOLDER} folder`);
  }

  // Step 3: Create or validate manifest
  progressCallback('creating', steps.creating);
  
  let finalManifest;
  if (manifest) {
    // Validate provided manifest
    const { validateManifest, validateEntryFile: validateEntry } = require('./manifest');
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    await validateEntry(docsPath, manifest.entryFile);
    finalManifest = manifest;
  } else {
    // Auto-generate manifest
    finalManifest = await generateManifest(sourceFolder);
  }

  // Save manifest to source folder (temporary, will be included in ZIP)
  await saveManifest(sourceFolder, finalManifest);

  // Step 4: Create ZIP
  progressCallback('compressing', steps.compressing);
  
  await createZip(sourceFolder, outputPath);

  // Remove manifest from source (it's now in the ZIP)
  const manifestPath = path.join(sourceFolder, 'manifest.json');
  try {
    await unlink(manifestPath);
  } catch (err) {
    // Ignore if already deleted or doesn't exist
  }

  progressCallback('complete', steps.complete);
  
  return {
    path: outputPath,
    manifest: finalManifest
  };
}

/**
 * Cleanup temporary directory
 */
async function cleanupTempDir(tempDir) {
  if (!tempDir || !tempDir.includes(TEMP_PREFIX)) {
    return; // Safety check
  }

  try {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Error cleaning up temp directory:', err);
  }
}

module.exports = {
  openDocf,
  exportDocf,
  cleanupTempDir
};

