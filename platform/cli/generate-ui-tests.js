const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const excelParser = require('../parsers/excel-parser');
const uiGenerator = require('../generators/ui-generator');
const { logger } = require('../../utils/base/logger');

/**
 * CLI Entry Point for UI Test Generation
 */
const argv = yargs(hideBin(process.argv))
    .option('path', {
        alias: 'p',
        type: 'string',
        description: 'Path to the Excel/CSV test plan file',
        demandOption: true
    })
    .help()
    .argv;

async function run() {
    try {
        logger.info('🚀 Starting Automated UI Test Generation...');

        // 1. Parse Test Cases
        const testCases = excelParser.parse(argv.path);
        logger.info(`Found ${testCases.length} test cases to process.`);

        // 2. Generate Specs & POMs
        for (const testCase of testCases) {
            await uiGenerator.process(testCase);
        }

        logger.info('✅ Generation Complete!');
    } catch (error) {
        logger.error('❌ Generation Failed', error);
        process.exit(1);
    }
}

run();
