const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const yauzl = require('yauzl');

/**
 * Extract ZIP file to destination directory
 * Only allows safe file types (no executables)
 */
async function extractZip(zipPath, destPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.on('entry', (entry) => {
        // Security: Reject potentially dangerous files
        const fileName = entry.fileName;
        const ext = path.extname(fileName).toLowerCase();
        
        // Block executables and scripts
        const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.app', '.dmg', '.pkg'];
        if (dangerousExts.includes(ext)) {
          zipfile.readEntry();
          return;
        }

        // Block paths that try to escape
        const fullPath = path.join(destPath, entry.fileName);
        if (!fullPath.startsWith(path.resolve(destPath))) {
          zipfile.readEntry();
          return;
        }

        if (/\/$/.test(fileName)) {
          // Directory entry
          fs.mkdirSync(fullPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              zipfile.readEntry();
              return;
            }

            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            const writeStream = fs.createWriteStream(fullPath);
            readStream.pipe(writeStream);
            writeStream.on('close', () => {
              zipfile.readEntry();
            });
          });
        }
      });

      zipfile.on('end', () => resolve(destPath));
      zipfile.on('error', reject);
      zipfile.readEntry();
    });
  });
}

/**
 * Create ZIP file from directory
 */
async function createZip(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

module.exports = {
  extractZip,
  createZip
};

