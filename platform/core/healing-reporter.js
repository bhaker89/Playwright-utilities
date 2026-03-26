const { logger } = require('../../utils/base/logger');
const fs = require('fs');
const path = require('path');

/**
 * HealingReporter
 * Custom Playwright Reporter for Self-Healing Analytics
 * 
 * Tracks:
 * - Healing success/failure rates
 * - Stage-wise performance metrics
 * - Cost estimation for AI calls
 * - Registry hit rates
 * - Top healed elements
 */
class HealingReporter {
    constructor(options = {}) {
        this.outputFile = options.outputFile || 'reports/healing-analytics.json';
        this.outputDir = path.dirname(this.outputFile);
        
        // Initialize metrics
        this.metrics = {
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                testsWithHealing: 0,
                totalHealingAttempts: 0,
                successfulHeals: 0,
                failedHeals: 0,
                healingSuccessRate: 0,
                totalHealingTime: 0,
                avgHealingTime: 0,
                estimatedCost: 0,
                registryHitRate: 0
            },
            stageBreakdown: {
                stage1: { attempts: 0, successes: 0, failures: 0, totalTime: 0, avgTime: 0 },
                stage2: { attempts: 0, successes: 0, failures: 0, totalTime: 0, avgTime: 0 },
                stage3: { attempts: 0, successes: 0, failures: 0, totalTime: 0, avgTime: 0, cost: 0 }
            },
            healingEvents: [],
            topHealedElements: [],
            costAnalysis: {
                aiProvider: process.env.AI_PROVIDER || 'anthropic',
                aiModel: process.env.AI_MODEL || 'claude-3-sonnet-20240229',
                stage3Calls: 0,
                estimatedCostPerCall: 0.003,
                totalCost: 0
            },
            performanceMetrics: {
                fastestHeal: null,
                slowestHeal: null,
                avgStage1Time: 0,
                avgStage2Time: 0,
                avgStage3Time: 0
            }
        };

        this.healedElements = new Map(); // Track frequency of healed elements
        this.startTime = Date.now();
    }

    /**
     * Playwright Reporter Hooks
     */
    
    onBegin(config, suite) {
        this.config = config;
        logger.info('🔬 Healing Analytics Reporter: Started');
        this._ensureReportDirectory();
    }

    onTestBegin(test) {
        this.metrics.summary.totalTests++;
        test._healingData = {
            healingAttempts: 0,
            successfulHeals: 0,
            failedHeals: 0,
            stages: []
        };
    }

    onTestEnd(test, result) {
        if (result.status === 'passed') {
            this.metrics.summary.passedTests++;
        } else if (result.status === 'failed') {
            this.metrics.summary.failedTests++;
        }

        // Aggregate healing data from test
        if (test._healingData && test._healingData.healingAttempts > 0) {
            this.metrics.summary.testsWithHealing++;
            this.metrics.summary.totalHealingAttempts += test._healingData.healingAttempts;
            this.metrics.summary.successfulHeals += test._healingData.successfulHeals;
            this.metrics.summary.failedHeals += test._healingData.failedHeals;
        }
    }

    onEnd(result) {
        this._calculateFinalMetrics();
        this._generateReport();
        this._printSummary();
        logger.info('🔬 Healing Analytics Reporter: Finished');
    }

    /**
     * Custom Methods for Healing Event Tracking
     * Called by SmartLocator during healing process
     */

    /**
     * Track a healing attempt
     * @param {Object} event - Healing event data
     */
    trackHealingAttempt(event) {
        const {
            testName,
            pageName,
            elementName,
            originalSelector,
            stage,
            success,
            newSelector,
            duration,
            error
        } = event;

        // Record event
        this.metrics.healingEvents.push({
            timestamp: new Date().toISOString(),
            testName,
            pageName,
            elementName,
            originalSelector,
            stage,
            success,
            newSelector,
            duration,
            error
        });

        // Update stage metrics
        const stageKey = `stage${stage}`;
        this.metrics.stageBreakdown[stageKey].attempts++;
        this.metrics.stageBreakdown[stageKey].totalTime += duration;

        if (success) {
            this.metrics.stageBreakdown[stageKey].successes++;
            
            // Track element frequency
            const elementKey = `${pageName}.${elementName}`;
            const count = this.healedElements.get(elementKey) || 0;
            this.healedElements.set(elementKey, count + 1);

            // Track performance extremes
            if (!this.metrics.performanceMetrics.fastestHeal || 
                duration < this.metrics.performanceMetrics.fastestHeal.duration) {
                this.metrics.performanceMetrics.fastestHeal = {
                    element: elementName,
                    stage,
                    duration
                };
            }

            if (!this.metrics.performanceMetrics.slowestHeal || 
                duration > this.metrics.performanceMetrics.slowestHeal.duration) {
                this.metrics.performanceMetrics.slowestHeal = {
                    element: elementName,
                    stage,
                    duration
                };
            }
        } else {
            this.metrics.stageBreakdown[stageKey].failures++;
        }

        // Track AI costs for Stage 3
        if (stage === 3) {
            this.metrics.costAnalysis.stage3Calls++;
        }
    }

    /**
     * Calculate final aggregated metrics
     * @private
     */
    _calculateFinalMetrics() {
        const { summary, stageBreakdown, costAnalysis } = this.metrics;

        // Success rate
        if (summary.totalHealingAttempts > 0) {
            summary.healingSuccessRate = 
                ((summary.successfulHeals / summary.totalHealingAttempts) * 100).toFixed(2);
        }

        // Total healing time
        summary.totalHealingTime = 
            stageBreakdown.stage1.totalTime +
            stageBreakdown.stage2.totalTime +
            stageBreakdown.stage3.totalTime;

        // Average healing time
        if (summary.successfulHeals > 0) {
            summary.avgHealingTime = Math.round(summary.totalHealingTime / summary.successfulHeals);
        }

        // Registry hit rate (Stage 1 successes / total attempts)
        if (summary.totalHealingAttempts > 0) {
            summary.registryHitRate = 
                ((stageBreakdown.stage1.successes / summary.totalHealingAttempts) * 100).toFixed(2);
        }

        // Stage-wise average times
        Object.keys(stageBreakdown).forEach(stage => {
            const data = stageBreakdown[stage];
            if (data.attempts > 0) {
                data.avgTime = Math.round(data.totalTime / data.attempts);
            }
        });

        // Cost estimation
        costAnalysis.totalCost = 
            (costAnalysis.stage3Calls * costAnalysis.estimatedCostPerCall).toFixed(4);
        summary.estimatedCost = costAnalysis.totalCost;

        // Performance metrics averages
        this.metrics.performanceMetrics.avgStage1Time = stageBreakdown.stage1.avgTime;
        this.metrics.performanceMetrics.avgStage2Time = stageBreakdown.stage2.avgTime;
        this.metrics.performanceMetrics.avgStage3Time = stageBreakdown.stage3.avgTime;

        // Top healed elements
        this.metrics.topHealedElements = Array.from(this.healedElements.entries())
            .map(([element, count]) => {
                const [page, name] = element.split('.');
                return { page, element: name, healCount: count };
            })
            .sort((a, b) => b.healCount - a.healCount)
            .slice(0, 10);
    }

    /**
     * Generate JSON report file
     * @private
     */
    _generateReport() {
        const reportData = {
            reportGeneratedAt: new Date().toISOString(),
            testDuration: Date.now() - this.startTime,
            ...this.metrics
        };

        try {
            fs.writeFileSync(
                this.outputFile,
                JSON.stringify(reportData, null, 2),
                'utf8'
            );
            logger.info(`📊 Healing Analytics saved to: ${this.outputFile}`);
        } catch (err) {
            logger.error('Failed to save healing analytics report', err);
        }

        // Also generate a CSV for easy Excel analysis
        this._generateCSVReport(reportData);
    }

    /**
     * Generate CSV report for healing events
     * @private
     */
    _generateCSVReport(reportData) {
        const csvPath = this.outputFile.replace('.json', '.csv');
        const headers = [
            'Timestamp',
            'Test',
            'Page',
            'Element',
            'Original Selector',
            'Stage',
            'Success',
            'New Selector',
            'Duration (ms)',
            'Error'
        ].join(',');

        const rows = reportData.healingEvents.map(event => {
            return [
                event.timestamp,
                `"${event.testName}"`,
                event.pageName,
                `"${event.elementName}"`,
                `"${event.originalSelector}"`,
                event.stage,
                event.success,
                `"${event.newSelector || ''}"`,
                event.duration,
                `"${event.error || ''}"`
            ].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');

        try {
            fs.writeFileSync(csvPath, csvContent, 'utf8');
            logger.info(`📊 CSV Report saved to: ${csvPath}`);
        } catch (err) {
            logger.error('Failed to save CSV report', err);
        }
    }

    /**
     * Print summary to console
     * @private
     */
    _printSummary() {
        const { summary, stageBreakdown, costAnalysis, topHealedElements } = this.metrics;

        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║           🩹 SELF-HEALING ANALYTICS SUMMARY                  ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        
        console.log('📊 Test Overview:');
        console.log(`   Total Tests:          ${summary.totalTests}`);
        console.log(`   ✅ Passed:            ${summary.passedTests}`);
        console.log(`   ❌ Failed:            ${summary.failedTests}`);
        console.log(`   🩹 With Healing:      ${summary.testsWithHealing}`);
        console.log('');

        console.log('🔧 Healing Performance:');
        console.log(`   Total Attempts:       ${summary.totalHealingAttempts}`);
        console.log(`   ✅ Successful:        ${summary.successfulHeals}`);
        console.log(`   ❌ Failed:            ${summary.failedHeals}`);
        console.log(`   Success Rate:         ${summary.healingSuccessRate}%`);
        console.log(`   Avg Healing Time:     ${summary.avgHealingTime}ms`);
        console.log('');

        console.log('🎯 Stage Breakdown:');
        console.log(`   Stage 1 (Registry):   ${stageBreakdown.stage1.successes}/${stageBreakdown.stage1.attempts} (${stageBreakdown.stage1.avgTime}ms avg)`);
        console.log(`   Stage 2 (Fuzzy):      ${stageBreakdown.stage2.successes}/${stageBreakdown.stage2.attempts} (${stageBreakdown.stage2.avgTime}ms avg)`);
        console.log(`   Stage 3 (AI):         ${stageBreakdown.stage3.successes}/${stageBreakdown.stage3.attempts} (${stageBreakdown.stage3.avgTime}ms avg)`);
        console.log(`   Registry Hit Rate:    ${summary.registryHitRate}%`);
        console.log('');

        console.log('💰 Cost Analysis:');
        console.log(`   AI Provider:          ${costAnalysis.aiProvider}`);
        console.log(`   AI Model:             ${costAnalysis.aiModel}`);
        console.log(`   Stage 3 Calls:        ${costAnalysis.stage3Calls}`);
        console.log(`   Estimated Cost:       $${costAnalysis.totalCost}`);
        console.log('');

        if (topHealedElements.length > 0) {
            console.log('🏆 Top Healed Elements:');
            topHealedElements.slice(0, 5).forEach((item, idx) => {
                console.log(`   ${idx + 1}. ${item.page}.${item.element} (${item.healCount}x)`);
            });
            console.log('');
        }

        console.log('📁 Reports:');
        console.log(`   JSON: ${this.outputFile}`);
        console.log(`   CSV:  ${this.outputFile.replace('.json', '.csv')}`);
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    }

    /**
     * Ensure report directory exists
     * @private
     */
    _ensureReportDirectory() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Static method to create event from SmartLocator
     */
    static createEvent(data) {
        return {
            timestamp: new Date().toISOString(),
            ...data
        };
    }
}

/**
 * Singleton instance for global access
 * SmartLocator can call: healingReporter.trackHealingAttempt(event)
 */
let reporterInstance = null;

function getReporterInstance(options) {
    if (!reporterInstance) {
        reporterInstance = new HealingReporter(options);
    }
    return reporterInstance;
}

module.exports = HealingReporter;
module.exports.getReporterInstance = getReporterInstance;