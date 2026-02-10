const { expect } = require('@playwright/test');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * @typedef {Object} VisualComparisonOptions
 * @property {number} [threshold]
 * @property {number} [maxDiffPixels]
 * @property {boolean} [fullPage]
 * @property {string[]} [mask]
 */

/**
 * Compare screenshots with baseline
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {VisualComparisonOptions} [options]
 * @returns {Promise<void>}
 */
async function compareScreenshot(page, name, options = {}) {
  const {
    threshold = 0.2,
    maxDiffPixels = 100,
    fullPage = false,
    mask = []
  } = options;

  // Mask dynamic elements
  if (mask.length > 0) {
    for (const selector of mask) {
      await page.locator(selector).evaluate((el) => {
        el.style.visibility = 'hidden';
      });
    }
  }

  // Take screenshot and compare
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    maxDiffPixels,
    threshold,
  });

  logger.info(`Visual comparison completed for: ${name}`);
}

/**
 * Compare two images pixel by pixel
 * @param {string} baselinePath
 * @param {string} currentPath
 * @param {string} diffPath
 * @param {number} [threshold=0.1]
 * @returns {number}
 */
function compareImages(baselinePath, currentPath, diffPath, threshold = 0.1) {
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const { width, height } = baseline;

  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  logger.info(`Image comparison: ${numDiffPixels} different pixels`);
  return numDiffPixels;
}

module.exports = {
  compareScreenshot,
  compareImages,
};