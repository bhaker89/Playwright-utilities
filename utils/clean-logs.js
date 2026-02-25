#!/usr/bin/env node

/**
 * Log Cleanup Utility
 * 
 * This script provides manual log cleanup functionality.
 * It can be run directly or integrated into your test pipeline.
 * 
 * Usage:
 *   node utils/clean-logs.js                    - Clean logs with default settings (2MB or 2000 lines)
 *   node utils/clean-logs.js --all              - Delete all log files
 *   node utils/clean-logs.js --size 1           - Clean if combined.log > 1MB
 *   node utils/clean-logs.js --lines 1000       - Clean if combined.log > 1000 lines
 *   node utils/clean-logs.js --keep 5           - Keep 5 archived logs
 *   node utils/clean-logs.js --lines 500 --keep 2  - Custom line threshold and keep count
 */

const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');

// Parse command line arguments
const args = process.argv.slice(2);
const deleteAll = args.includes('--all');
const maxSizeMB = parseFloat(args[args.indexOf('--size') + 1] || 2);
const maxLines = parseInt(args[args.indexOf('--lines') + 1] || 2000);
const keepCount = parseInt(args[args.indexOf('--keep') + 1] || 3);

/**
 * Get human-readable file size
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const sizeInMB = stats.size / 1024 / 1024;
  return sizeInMB.toFixed(2);
}

/**
 * Get line count of a file
 */
function getLineCount(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

/**
 * Clean all log files
 */
function cleanAllLogs() {
  console.log('🧹 Cleaning all log files...\n');
  
  if (!fs.existsSync(logDir)) {
    console.log('✅ No logs directory found. Nothing to clean.');
    return;
  }

  const files = fs.readdirSync(logDir);
  let deletedCount = 0;

  files.forEach(file => {
    const filePath = path.join(logDir, file);
    if (fs.statSync(filePath).isFile()) {
      const size = getFileSize(filePath);
      fs.unlinkSync(filePath);
      console.log(`   ❌ Deleted: ${file} (${size} MB)`);
      deletedCount++;
    }
  });

  console.log(`\n✅ Cleaned ${deletedCount} log file(s)\n`);
}

/**
 * Archive a log file with timestamp
 */
function archiveLogFile(logFilePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const fileName = path.basename(logFilePath);
  const archivePath = path.join(logDir, `${fileName}.${timestamp}.old`);
  
  fs.renameSync(logFilePath, archivePath);
  return archivePath;
}

/**
 * Clean logs based on size and line count thresholds
 */
function cleanLogsBySize() {
  console.log('🧹 Checking log files for cleanup...\n');
  
  if (!fs.existsSync(logDir)) {
    console.log('✅ No logs directory found. Nothing to clean.');
    return;
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const logFiles = ['combined.log', 'error.log'];
  let cleaned = false;

  logFiles.forEach(logFile => {
    const logFilePath = path.join(logDir, logFile);
    
    if (fs.existsSync(logFilePath)) {
      const stats = fs.statSync(logFilePath);
      const currentSizeMB = stats.size / 1024 / 1024;
      const lineCount = getLineCount(logFilePath);
      
      const exceedsSize = stats.size > maxSizeBytes;
      const exceedsLines = lineCount > maxLines;
      
      console.log(`📄 ${logFile}:`);
      console.log(`   Size: ${currentSizeMB.toFixed(2)} MB (threshold: ${maxSizeMB} MB)`);
      console.log(`   Lines: ${lineCount.toLocaleString()} (threshold: ${maxLines.toLocaleString()})`);
      
      if (exceedsSize || exceedsLines) {
        const reason = exceedsSize 
          ? `Exceeds size limit (${currentSizeMB.toFixed(2)} MB > ${maxSizeMB} MB)`
          : `Exceeds line limit (${lineCount} > ${maxLines})`;
        
        const archivePath = archiveLogFile(logFilePath);
        fs.writeFileSync(logFilePath, ''); // Create new empty file
        console.log(`   ⚠️  ${reason}`);
        console.log(`   ✅ Archived to: ${path.basename(archivePath)}`);
        console.log(`   ✅ Created new empty ${logFile}`);
        cleaned = true;
      } else {
        console.log(`   ✅ Within limits`);
      }
      console.log('');
    } else {
      console.log(`📄 ${logFile}: Not found\n`);
    }
  });

  // Clean old archived logs
  console.log(`🗂️  Checking archived logs (keeping ${keepCount} most recent)...\n`);
  cleanOldArchivedLogs();

  if (!cleaned) {
    console.log('\n✅ All log files are within limits. No cleanup needed.\n');
  } else {
    console.log('\n✅ Log cleanup completed!\n');
  }
}

/**
 * Clean old archived log files
 */
function cleanOldArchivedLogs() {
  try {
    const files = fs.readdirSync(logDir);
    
    // Get all archived logs
    const archivedLogs = files
      .filter(file => file.endsWith('.old'))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        time: fs.statSync(path.join(logDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first

    console.log(`   Found ${archivedLogs.length} archived log file(s)`);

    // Keep only the most recent ones
    if (archivedLogs.length > keepCount) {
      const toDelete = archivedLogs.slice(keepCount);
      toDelete.forEach(log => {
        const size = getFileSize(log.path);
        fs.unlinkSync(log.path);
        console.log(`   ❌ Deleted old archive: ${log.name} (${size} MB)`);
      });
      console.log(`   ✅ Kept ${keepCount} most recent archived log(s)`);
    } else {
      console.log(`   ✅ All archived logs are within the keep limit`);
    }
  } catch (error) {
    console.error('❌ Error cleaning old archived logs:', error.message);
  }
}

/**
 * Display log statistics
 */
function showLogStats() {
  console.log('📊 Log Directory Statistics\n');
  console.log(`   Directory: ${logDir}\n`);
  
  if (!fs.existsSync(logDir)) {
    console.log('   No logs directory found.\n');
    return;
  }

  const files = fs.readdirSync(logDir);
  let totalSize = 0;

  console.log('   Files:');
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    if (fs.statSync(filePath).isFile()) {
      const size = getFileSize(filePath);
      const lines = getLineCount(filePath);
      const sizeNum = parseFloat(size);
      totalSize += sizeNum;
      const linesStr = lines > 0 ? `${lines.toLocaleString()} lines` : '';
      console.log(`     • ${file.padEnd(40)} ${size.padStart(8)} MB  ${linesStr}`);
    }
  });

  console.log(`\n   Total Size: ${totalSize.toFixed(2)} MB`);
  console.log(`   Total Files: ${files.length}\n`);
}

// Main execution
console.log('\n╔═══════════════════════════════════════╗');
console.log('║    Log Cleanup Utility v1.0           ║');
console.log('╚═══════════════════════════════════════╝\n');

if (deleteAll) {
  cleanAllLogs();
} else {
  showLogStats();
  cleanLogsBySize();
}

console.log('Done! 🎉\n');