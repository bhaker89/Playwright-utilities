const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { logger } = require('../../utils/base/logger');

/**
 * ExcelParser (CSV Fallback)
 * Parses test cases from a CSV/Excel format.
 * Currently using csv-parse as a zero-dependency baseline.
 */
class ExcelParser {
    /**
     * Parse the file at the given path
     * @param {string} filePath
     * @returns {Array<Object>}
     */
    parse(filePath) {
        logger.info(`Parsing test cases from: ${filePath}`);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const records = parse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            return records.map(record => ({
                title: record.Title || record.title,
                preconditions: record.Preconditions || record.preconditions || '',
                steps: this._parseSteps(record.Steps || record.steps || ''),
                expected: record.Expected || record.expected || ''
            }));
        } catch (error) {
            logger.error('Failed to parse Excel/CSV file', error);
            throw error;
        }
    }

    /**
     * Internal: Convert newline-separated steps into an array
     * @private
     */
    _parseSteps(stepsString) {
        return stepsString
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
}

module.exports = new ExcelParser();
