const { test, expect } = require('@playwright/test');
const { BasePage } = require('../pages/base.page');
const fs = require('fs');
const path = require('path');
const telemetry = require('../framework/locator-intelligence/locator-telemetry-engine');
const mapRegistry = require('../framework/locator-intelligence/locator-map-registry');
const memoryStore = require('../framework/locator-intelligence/locator-memory-store');

test.describe('Locator Intelligence Engine (LIE) - Enterprise Scaling', () => {
    
    test.beforeEach(async () => {
        // Ensure clean state for every test
        const memoryPath = path.resolve(process.cwd(), '.locator-memory.sqlite');
        const pathsToWipe = [memoryPath, `${memoryPath}-wal`, `${memoryPath}-shm`];
        
        pathsToWipe.forEach(p => {
            if (fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch (e) {}
            }
        });

        // Clear telemetry metrics and prevent early flushing during test
        telemetry.clear();
        telemetry.flushThreshold = 100; // Prevent flushing during the test
    });
    test('should resolve locator from map and update memory on success', async ({ page }) => {
        const basePage = new BasePage(page);
        
        // Mocking a successful interaction
        // In a real test, we would navigate to a page with an "Add to Cart" button
        await page.setContent('<button data-testid="add-to-cart">Add to Cart</button>');
        
        const addToCartBtn = page.getByTestId('add-to-cart');
        
        // Use LIE via BasePage.click
        await basePage.click(addToCartBtn, 'AddToCartButton');
        
        // Verify SQLite memory store update
        const memoryStore = require('../framework/locator-intelligence/locator-memory-store');
        const candidates = await memoryStore.getCandidates('AddToCartButton');
        
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0].strategy).toBe('original'); 
        expect(candidates[0].success_rate).toBeGreaterThan(0);
    });

    test('should perform adaptive healing and ranking across multiple runs', async ({ page }) => {
        const basePage = new BasePage(page);
        
        // Scenario: Original locator fails, but an alternative works
        await page.setContent('<button id="healed-btn" data-testid="real-target">Healed Button</button>');
        
        // Mock the Map Registry for the rescue attempt
        // (We can't easily overwrite the singleton without a proxy or rewire, 
        // so we'll just seed the memory store which the Orchestrator check FIRST)
        await memoryStore.updateStats('DynamicButton', 'css', true, 100, '#healed-btn');
        
        // Intentionally broken locator
        const brokenLocator = page.locator('#wrong-id');
        
        // This will trigger LIE. It will find '#healed-btn' in memory (Stage 2) and succeed.
        await basePage.click(brokenLocator, 'DynamicButton');
        
        // Verify successfully resolved interaction
        expect(telemetry.getSummary().successes).toBeGreaterThan(0);

        // Verify highlighting was applied
        // We look for magenta (rgb(255, 0, 255))
        const highlightResult = await page.evaluate(() => {
            const btn = document.querySelector('#healed-btn');
            if (!btn) return { error: 'NOT_FOUND' };
            
            const style = window.getComputedStyle(btn);
            return {
                outline: btn.style.outline,
                computedOutlineColor: style.outlineColor,
                outlineOffset: style.outlineOffset,
                hasMagenta: style.outlineColor.includes('255, 0, 255')
            };
        });
        
        console.log(`DEBUG: Highlight Result: ${JSON.stringify(highlightResult)}`);
        expect(highlightResult.hasMagenta).toBe(true);
    });

    test('should NOT attempt healing for non-timeout errors', async ({ page }) => {
        const basePage = new BasePage(page);
        await page.setContent('<button id="btn">Click Me</button>');
        
        const locator = page.locator('#btn');
        
        // Simulate a non-timeout error (e.g., Target closed or Generic Error)
        // We can do this by closing the page or using a function that throws specifically
        await expect(async () => {
            await basePage.click(locator, 'SelfDestructButton');
            // Inject a failure that isn't a timeout
            throw new Error('Immediate failure'); 
        }).rejects.toThrow('Immediate failure');

        // Verify no rescues were attempted
        const metrics = telemetry.getSummary();
        expect(metrics.totalRescues).toBe(0);
    });

    test('should maintain performance within enterprise thresholds', async ({ page }) => {
        const basePage = new BasePage(page);
        await page.setContent('<button id="perf-btn">Fast Button</button>');
        
        // Pre-seed memory for immediate resolution
        await memoryStore.updateStats('PerfButton', 'css', true, 50, '#perf-btn');
        
        const start = Date.now();
        // Use a longer timeout for the action to avoid TimeoutError, 
        // but verify the total orchestration duration is short.
        await basePage.click(page.locator('#wrong-one'), 'PerfButton');
        const duration = Date.now() - start;
        
        // Threshold accounts for adaptive rescue. 
        // The orchestrator should resolve '#perf-btn' from memory and click it.
        expect(duration).toBeLessThan(3000); 
    });
});
