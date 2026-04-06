const fs = require('fs');
const path = require('path');

async function globalSetup() {
  // Legacy dependency removal (Option B):
  // Keep this cleanup best-effort and self-contained so it never blocks test execution.
  try {
    const allureDir = path.resolve(process.cwd(), 'allure-results');
    const maxFiles = 500;

    if (!fs.existsSync(allureDir)) return;

    const files = fs
      .readdirSync(allureDir)
      .map((fileName) => {
        const absolutePath = path.join(allureDir, fileName);
        const stat = fs.statSync(absolutePath);
        return { absolutePath, mtimeMs: stat.mtimeMs, isFile: stat.isFile() };
      })
      .filter((entry) => entry.isFile);

    if (files.length <= maxFiles) return;

    files.sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
    const toDelete = files.slice(0, files.length - maxFiles);

    for (const entry of toDelete) {
      try {
        fs.unlinkSync(entry.absolutePath);
      } catch {
        // best-effort
      }
    }
  } catch {
    // best-effort
  }
}

module.exports = globalSetup;

