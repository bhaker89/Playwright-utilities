const fs = require('fs');
const path = require('path');

class CleanupHelper {
  /**
   * Prunes files in a directory if file count exceeds maxFiles.
   *
   * - Keeps the newest files (by mtime)
   * - Deletes the oldest files first
   * - No-op if directory does not exist
   */
  static pruneDirectory(directoryPath, maxFiles) {
    if (!directoryPath || !maxFiles || maxFiles <= 0) return;

    const resolvedDirectoryPath = path.resolve(process.cwd(), directoryPath);
    if (!fs.existsSync(resolvedDirectoryPath)) return;

    const fileEntries = fs
      .readdirSync(resolvedDirectoryPath)
      .map((fileName) => {
        const absoluteFilePath = path.join(resolvedDirectoryPath, fileName);
        const stat = fs.statSync(absoluteFilePath);
        return {
          fileName,
          absoluteFilePath,
          mtimeMs: stat.mtimeMs,
          isFile: stat.isFile(),
        };
      })
      .filter((entry) => entry.isFile);

    if (fileEntries.length <= maxFiles) return;

    // Sort oldest -> newest
    fileEntries.sort((a, b) => a.mtimeMs - b.mtimeMs);

    const numberOfFilesToDelete = fileEntries.length - maxFiles;
    const filesToDelete = fileEntries.slice(0, numberOfFilesToDelete);

    for (const fileEntry of filesToDelete) {
      try {
        fs.unlinkSync(fileEntry.absoluteFilePath);
      } catch {
        // Best-effort cleanup; do not fail the test run for inability to delete.
      }
    }
  }
}

module.exports = { CleanupHelper };