const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const { MANIFEST_FILENAME, DOCS_FOLDER, REQUIRED_MANIFEST_FIELDS } = require('../shared/constants');

/**
 * Validate manifest.json structure
 */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be a valid JSON object' };
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!manifest[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof manifest.title !== 'string' || manifest.title.trim() === '') {
    return { valid: false, error: 'Title must be a non-empty string' };
  }

  if (typeof manifest.entryFile !== 'string' || manifest.entryFile.trim() === '') {
    return { valid: false, error: 'Entry file must be a non-empty string' };
  }

  return { valid: true };
}

/**
 * Load and validate manifest from directory
 */
async function loadManifest(dirPath) {
  const manifestPath = path.join(dirPath, MANIFEST_FILENAME);
  
  try {
    const content = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content);
    const validation = validateManifest(manifest);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return manifest;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('manifest.json not found');
    }
    if (err instanceof SyntaxError) {
      throw new Error('manifest.json is not valid JSON');
    }
    throw err;
  }
}

/**
 * Validate that entry file exists in docs folder
 */
async function validateEntryFile(docsPath, entryFile) {
  const entryPath = path.join(docsPath, entryFile);
  
  try {
    const stats = await stat(entryPath);
    if (!stats.isFile()) {
      throw new Error(`Entry file "${entryFile}" is not a file`);
    }
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Entry file "${entryFile}" not found in docs folder`);
    }
    throw err;
  }
}

/**
 * Auto-generate manifest from folder structure
 */
async function generateManifest(folderPath) {
  const docsPath = path.join(folderPath, DOCS_FOLDER);
  
  // Check if docs folder exists
  try {
    const stats = await stat(docsPath);
    if (!stats.isDirectory()) {
      throw new Error(`${DOCS_FOLDER} is not a directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`${DOCS_FOLDER} folder not found`);
    }
    throw err;
  }

  // Find first markdown file as entry point
  const files = await readdir(docsPath);
  const mdFiles = files.filter(f => f.toLowerCase().endsWith('.md') || f.toLowerCase().endsWith('.markdown'));
  
  if (mdFiles.length === 0) {
    throw new Error(`No Markdown files found in ${DOCS_FOLDER} folder`);
  }

  // Prefer README.md, index.md, or first alphabetically
  let entryFile = mdFiles.find(f => f.toLowerCase() === 'readme.md') ||
                  mdFiles.find(f => f.toLowerCase() === 'index.md') ||
                  mdFiles[0];

  // Use folder name as title
  const title = path.basename(folderPath);

  return {
    title,
    entryFile,
    version: '1.0.0',
    theme: 'light'
  };
}

/**
 * Save manifest to directory
 */
async function saveManifest(dirPath, manifest) {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const manifestPath = path.join(dirPath, MANIFEST_FILENAME);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifestPath;
}

module.exports = {
  validateManifest,
  loadManifest,
  validateEntryFile,
  generateManifest,
  saveManifest
};

