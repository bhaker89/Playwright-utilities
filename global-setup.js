const { CleanupHelper } = require('./utils/base/cleanup-helper');

async function globalSetup(config) {
    // Prune allure-results if they exceed 500 files
    // (Allure creates many small files per test)
    CleanupHelper.pruneDirectory('allure-results', 500);
}

module.exports = globalSetup;
