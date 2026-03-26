const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * Utility to manage and prune test result artifacts
 */
class CleanupHelper {
    /**
     * Prune files in a directory if they exceed a certain count
     * @param {string} dirPath - Path to the results directory
     * @param {number} maxFiles - Maximum number of files to keep
     */
    static pruneDirectory(dirPath, maxFiles = 200) {
        const absolutePath = path.resolve(dirPath);

        if (!fs.existsSync(absolutePath)) {
            logger.debug(`Cleanup: Directory not found, skipping: ${dirPath}`);
            return;
        }

        try {
            const files = fs.readdirSync(absolutePath)
                .filter(file => !file.startsWith('.')) // Ignore hidden files
                .map(file => {
                    const filePath = path.join(absolutePath, file);
                    const stats = fs.statSync(filePath);
                    return { name: file, path: filePath, mtime: stats.mtime };
                });

            if (files.length > maxFiles) {
                logger.info(`Cleanup: Pruning ${dirPath}. Current count: ${files.length}, Limit: ${maxFiles}`);

                // Sort by modification time (oldest first)
                const sorted = files.sort((a, b) => a.mtime - b.mtime);
                const toDelete = sorted.slice(0, files.length - maxFiles);

                toDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (err) {
                        logger.error(`Cleanup: Failed to delete ${file.path}`, err);
                    }
                });

                logger.info(`Cleanup: Successfully pruned ${toDelete.length} files from ${dirPath}.`);
            }
        } catch (error) {
            logger.error(`Cleanup: Error pruning directory ${dirPath}`, error);
        }
    }

    /**
     * Complete wipe of a directory
     * @param {string} dirPath 
     */
    static clearDirectory(dirPath) {
        const absolutePath = path.resolve(dirPath);
        if (fs.existsSync(absolutePath)) {
            logger.info(`Cleanup: Wiping directory ${dirPath}`);
            fs.rmSync(absolutePath, { recursive: true, force: true });
            fs.mkdirSync(absolutePath, { recursive: true });
        }
    }
}

module.exports = { CleanupHelper };
