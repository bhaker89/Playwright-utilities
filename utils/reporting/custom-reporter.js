const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * Custom Reporter for detailed test execution reporting
 * @implements {import('@playwright/test/reporter').Reporter}
 */
class CustomReporter {
  constructor() {
    /** @private @type {any[]} */
    this.results = [];
    /** @private @type {number} */
    this.startTime = 0;
  }

  /**
   * @returns {void}
   */
  onBegin() {
    this.startTime = Date.now();
    logger.info('Test execution started');
    console.log('🚀 Starting test execution...\n');
  }

  /**
   * @param {import('@playwright/test/reporter').TestCase} test
   * @returns {void}
   */
  onTestBegin(test) {
    logger.info(`Starting test: ${test.title}`);
    console.log(`▶️  Running: ${test.title}`);
  }

  /**
   * @param {import('@playwright/test/reporter').TestCase} test
   * @param {import('@playwright/test/reporter').TestResult} result
   * @returns {void}
   */
  onTestEnd(test, result) {
    const status = result.status === 'passed' ? '✅' : '❌';
    const duration = result.duration;

    logger.info(`Test finished: ${test.title} - ${result.status} (${duration}ms)`);
    console.log(`${status} ${test.title} (${duration}ms)`);

    this.results.push({
      title: test.title,
      status: result.status,
      duration: duration,
      error: result.error?.message,
      retries: result.retry,
    });

    if (result.status === 'failed') {
      console.log(`   Error: ${result.error?.message}\n`);
    }
  }

  /**
   * @param {import('@playwright/test/reporter').FullResult} result
   * @returns {void}
   */
  onEnd(result) {
    const duration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    logger.info('Test execution completed', {
      total: this.results.length,
      passed,
      failed,
      skipped,
      duration,
    });

    console.log('\n📊 Test Execution Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Generate JSON report
    const reportData = {
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        duration,
        status: result.status,
      },
      tests: this.results,
    };

    const reportPath = path.join(process.cwd(), 'test-results', 'custom-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    logger.info(`Custom report generated: ${reportPath}`);

    // Send notification (can be extended for Slack, Teams, etc.)
    if (failed > 0 && process.env.CI) {
      this.sendNotification(reportData);
    }
  }

  /**
   * @private
   * @param {any} reportData
   * @returns {void}
   */
  sendNotification(reportData) {
    // Placeholder for notification logic
    logger.info('Sending notification for test failures');
    // Implement Slack/Teams webhook here
  }
}

module.exports = CustomReporter;