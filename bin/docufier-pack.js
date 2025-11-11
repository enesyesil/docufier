#!/usr/bin/env node

/**
 * Docufier CLI Pack Tool
 * 
 * Usage: npx docufier-pack <folder> -o <output.docf>
 *        node bin/docufier-pack.js <folder> -o <output.docf>
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Import shared logic from main process
const { exportDocf } = require('../src/main/fileHandler');
const { generateManifest } = require('../src/main/manifest');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Docufier Pack CLI

Usage:
  docufier-pack <folder> -o <output.docf>
  docufier-pack <folder> --output <output.docf>
  docufier-pack <folder> -o <output.docf> --manifest <manifest.json>

Options:
  -o, --output <file>    Output .docf file path (required)
  -m, --manifest <file> Path to existing manifest.json (optional)
  -h, --help            Show this help message

Examples:
  docufier-pack ./mydocs -o myproject.docf
  docufier-pack ./mydocs -o myproject.docf --manifest ./custom-manifest.json
`);
    process.exit(0);
  }
  
  // Parse arguments
  let sourceFolder = null;
  let outputPath = null;
  let manifestPath = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-o' || arg === '--output') {
      outputPath = args[++i];
    } else if (arg === '-m' || arg === '--manifest') {
      manifestPath = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!sourceFolder) {
        sourceFolder = arg;
      }
    }
  }
  
  // Validate arguments
  if (!sourceFolder) {
    console.error('Error: Source folder is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }
  
  if (!outputPath) {
    console.error('Error: Output path is required (use -o or --output)');
    console.error('Run with --help for usage information');
    process.exit(1);
  }
  
  // Resolve paths
  sourceFolder = path.resolve(sourceFolder);
  outputPath = path.resolve(outputPath);
  
  // Check source folder exists
  try {
    const stats = await fs.promises.stat(sourceFolder);
    if (!stats.isDirectory()) {
      console.error(`Error: "${sourceFolder}" is not a directory`);
      process.exit(1);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Folder "${sourceFolder}" not found`);
      process.exit(1);
    }
    throw err;
  }
  
  // Load manifest if provided
  let manifest = null;
  if (manifestPath) {
    try {
      const manifestContent = await readFile(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
    } catch (err) {
      console.error(`Error: Failed to load manifest from "${manifestPath}"`);
      console.error(err.message);
      process.exit(1);
    }
  }
  
  // Export
  console.log(`Packaging "${sourceFolder}"...`);
  console.log(`Output: ${outputPath}`);
  
  try {
    const result = await exportDocf(sourceFolder, outputPath, manifest);
    console.log(`\n✓ Successfully created ${outputPath}`);
    console.log(`  Title: ${result.manifest.title}`);
    console.log(`  Entry: ${result.manifest.entryFile}`);
  } catch (err) {
    console.error(`\n✗ Error: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = { main };

