const { test, expect } = require('@playwright/test');
const { SmartLocator } = require('../../platform/core/smart-locator');
const componentRegistry = require('../../platform/core/component-registry');
const fs = require('fs');
const path = require('path');

/**
 * Integration Tests for Self-Healing System
 * 
 * These tests validate the 3-stage healing mechanism:
 * - Stage 1: Registry Cache
 * - Stage 2: Fuzzy Text Matching
 * - Stage 3: AI-powered Healing
 */

test.describe('Self-Healing System - Stage 1: Registry Cache', () => {
    
    test.beforeEach(async () => {
        // Clear registry before each test
        const registryPath = path.join(process.cwd(), '.auth', 'ui-registry.json');
        if (fs.existsSync(registryPath)) {
            fs.unlinkSync(registryPath);
        }
    });

    test('should heal using cached selector from registry', async ({ page }) => {
        // Pre-register a working selector
        componentRegistry.register('TestPage', 'Search Button', {
            selector: 'button[aria-label="Search"]',
            lastUpdated: new Date().toISOString()
        });

        await page.goto('https://www.example.com');
        
        // Inject a button with the registered selector
        await page.evaluate(() => {
            const button = document.createElement('button');
            button.setAttribute('aria-label', 'Search');
            button.textContent = 'Search';
            button.id = 'search-btn';
            document.body.appendChild(button);
        });

        const healer = new SmartLocator(page, 'TestPage');

        // Try with wrong selector - should heal via Stage 1
        const wrongLocator = page.locator('#non-existent-id');
        
        await healer.executeWithHealing(
            'Search Button',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        // Verify button was clicked (element should be focused)
        const focusedElement = await page.evaluate(() => document.activeElement.id);
        expect(focusedElement).toBe('search-btn');
    });

    test('should save healed selector to registry for future use', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add button with unique text
        await page.evaluate(() => {
            const button = document.createElement('button');
            button.textContent = 'Unique Submit Button';
            button.id = 'submit-btn';
            document.body.appendChild(button);
        });

        const healer = new SmartLocator(page, 'TestPage');

        // Try with wrong selector - should heal via Stage 2 (fuzzy) and save to registry
        const wrongLocator = page.locator('#wrong-id');
        
        await healer.executeWithHealing(
            'Unique Submit Button',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        // Verify registry was updated
        const registeredMeta = componentRegistry.get('TestPage', 'Unique Submit Button');
        expect(registeredMeta).not.toBeNull();
        expect(registeredMeta.selector).toContain('Unique Submit Button');
    });

    test('should handle multiple pages in registry', async ({ page }) => {
        // Register selectors for different pages
        componentRegistry.register('LoginPage', 'Email Field', {
            selector: 'input[type="email"]'
        });
        componentRegistry.register('CheckoutPage', 'Payment Button', {
            selector: 'button.payment-submit'
        });

        // Verify both are stored correctly
        const loginMeta = componentRegistry.get('LoginPage', 'Email Field');
        const checkoutMeta = componentRegistry.get('CheckoutPage', 'Payment Button');

        expect(loginMeta.selector).toBe('input[type="email"]');
        expect(checkoutMeta.selector).toBe('button.payment-submit');
    });
});

test.describe('Self-Healing System - Stage 2: Fuzzy Matching', () => {

    test('should heal using fuzzy text matching', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add button with text
        await page.evaluate(() => {
            const button = document.createElement('button');
            button.textContent = 'Download Report';
            button.className = 'download-btn';
            document.body.appendChild(button);
        });

        const healer = new SmartLocator(page, 'ReportPage');

        // Try with wrong selector - should heal via Stage 2 fuzzy matching
        const wrongLocator = page.locator('.non-existent-class');
        
        let clicked = false;
        await page.evaluate(() => {
            document.querySelector('.download-btn').addEventListener('click', () => {
                window.downloadClicked = true;
            });
        });

        await healer.executeWithHealing(
            'Download Report',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        // Verify button was clicked
        const wasClicked = await page.evaluate(() => window.downloadClicked);
        expect(wasClicked).toBe(true);
    });

    test('should handle multiple elements with same text by using first()', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add multiple "Save" buttons
        await page.evaluate(() => {
            for (let i = 0; i < 3; i++) {
                const button = document.createElement('button');
                button.textContent = 'Save';
                button.className = `save-btn-${i}`;
                button.setAttribute('data-index', i);
                document.body.appendChild(button);
            }
        });

        const healer = new SmartLocator(page, 'FormPage');

        // Should click the first "Save" button
        const wrongLocator = page.locator('.non-existent');
        
        let clickedIndex = -1;
        await page.evaluate(() => {
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.clickedIndex = parseInt(btn.getAttribute('data-index'));
                });
            });
        });

        await healer.executeWithHealing(
            'Save',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        clickedIndex = await page.evaluate(() => window.clickedIndex);
        expect(clickedIndex).toBe(0); // First element
    });

    test('should skip fuzzy matching if element name is empty', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        const healer = new SmartLocator(page, 'TestPage');
        const wrongLocator = page.locator('.non-existent');

        // Should fail without healing (no element name for fuzzy matching)
        await expect(async () => {
            await healer.executeWithHealing(
                '', // Empty element name
                wrongLocator,
                async (loc) => {
                    await loc.click({ timeout: 2000 });
                }
            );
        }).rejects.toThrow();
    });
});

test.describe('Self-Healing System - Stage 3: AI Healing', () => {

    test.skip('should heal using AI when Stage 1 and 2 fail', async ({ page }) => {
        // Skip if no AI key configured
        if (!process.env.AI_API_KEY && !process.env.GROQ_API_KEY) {
            test.skip();
        }

        await page.goto('https://www.example.com');
        
        // Add complex element structure
        await page.evaluate(() => {
            const container = document.createElement('div');
            container.className = 'form-container';
            
            const label = document.createElement('label');
            label.textContent = 'User Email:';
            
            const input = document.createElement('input');
            input.type = 'email';
            input.name = 'user_email';
            input.placeholder = 'Enter your email';
            
            container.appendChild(label);
            container.appendChild(input);
            document.body.appendChild(container);
        });

        const healer = new SmartLocator(page, 'SignupPage');

        // Try with wrong selector - should heal via Stage 3 (AI)
        const wrongLocator = page.locator('#email-input'); // Doesn't exist
        
        await healer.executeWithHealing(
            'User Email Field',
            wrongLocator,
            async (loc) => {
                await loc.fill('test@example.com');
            }
        );

        // Verify input was filled
        const inputValue = await page.locator('input[name="user_email"]').inputValue();
        expect(inputValue).toBe('test@example.com');
    });

    test('should handle AI healing failure gracefully', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        const healer = new SmartLocator(page, 'TestPage');
        const wrongLocator = page.locator('.truly-non-existent-element');

        // Should fail after all stages exhausted
        await expect(async () => {
            await healer.executeWithHealing(
                'Non Existent Element',
                wrongLocator,
                async (loc) => {
                    await loc.click({ timeout: 3000 });
                }
            );
        }).rejects.toThrow();
    });
});

test.describe('Self-Healing System - Element Highlighting', () => {

    test('should highlight healed elements', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add button
        await page.evaluate(() => {
            const button = document.createElement('button');
            button.textContent = 'Healed Button';
            button.id = 'healed-btn';
            document.body.appendChild(button);
        });

        const healer = new SmartLocator(page, 'TestPage');
        const wrongLocator = page.locator('#wrong-id');

        await healer.executeWithHealing(
            'Healed Button',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        // Check if element was highlighted
        const isHighlighted = await page.evaluate(() => {
            const btn = document.getElementById('healed-btn');
            return btn.style.border.includes('3px solid') && 
                   btn.getAttribute('data-smart-loc-healed') === 'true';
        });

        expect(isHighlighted).toBe(true);
    });
});

test.describe('Self-Healing System - Error Handling', () => {

    test('should only heal TimeoutError', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        const healer = new SmartLocator(page, 'TestPage');
        
        // Create locator that will throw non-timeout error
        const locator = page.locator('button');

        // Inject button that throws on click
        await page.evaluate(() => {
            const button = document.createElement('button');
            button.textContent = 'Error Button';
            button.addEventListener('click', () => {
                throw new Error('Custom click error');
            });
            document.body.appendChild(button);
        });

        // Should not attempt healing for non-timeout errors
        // (This will throw the original error, not attempt healing)
        await expect(async () => {
            await healer.executeWithHealing(
                'Error Button',
                locator,
                async (loc) => {
                    await loc.click();
                }
            );
        }).rejects.toThrow();
    });

    test('should handle navigation errors without healing', async ({ page, context }) => {
        const healer = new SmartLocator(page, 'TestPage');
        
        // Close page to simulate navigation error
        await page.close();
        
        // Create new page for the test context
        const newPage = await context.newPage();
        
        await expect(async () => {
            await healer.executeWithHealing(
                'Some Button',
                newPage.locator('button'),
                async (loc) => {
                    await loc.click({ timeout: 1000 });
                }
            );
        }).rejects.toThrow();
    });
});

test.describe('Self-Healing System - Performance', () => {

    test('should heal within acceptable time limits', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Pre-register selector for fast Stage 1 healing
        componentRegistry.register('PerfPage', 'Fast Button', {
            selector: 'button.fast-btn'
        });

        await page.evaluate(() => {
            const button = document.createElement('button');
            button.className = 'fast-btn';
            button.textContent = 'Fast Button';
            document.body.appendChild(button);
        });

        const healer = new SmartLocator(page, 'PerfPage');
        const wrongLocator = page.locator('#wrong-id');

        const startTime = Date.now();
        
        await healer.executeWithHealing(
            'Fast Button',
            wrongLocator,
            async (loc) => {
                await loc.click();
            }
        );

        const healingTime = Date.now() - startTime;
        
        // Stage 1 healing should be very fast (<100ms)
        expect(healingTime).toBeLessThan(500);
    });

    test('should track healing metrics', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add multiple buttons
        await page.evaluate(() => {
            for (let i = 0; i < 3; i++) {
                const button = document.createElement('button');
                button.textContent = `Button ${i}`;
                button.className = `btn-${i}`;
                document.body.appendChild(button);
            }
        });

        const healer = new SmartLocator(page, 'MetricsPage');

        // Heal multiple elements
        for (let i = 0; i < 3; i++) {
            const wrongLocator = page.locator(`.wrong-btn-${i}`);
            
            await healer.executeWithHealing(
                `Button ${i}`,
                wrongLocator,
                async (loc) => {
                    await loc.click();
                }
            );
        }

        // Verify registry has all elements
        for (let i = 0; i < 3; i++) {
            const meta = componentRegistry.get('MetricsPage', `Button ${i}`);
            expect(meta).not.toBeNull();
        }
    });
});

test.describe('Self-Healing System - Integration with Page Objects', () => {

    class TestPage {
        constructor(page) {
            this.page = page;
            this.healer = new SmartLocator(page, 'TestPage');
        }

        async clickSubmit() {
            await this.healer.executeWithHealing(
                'Submit Button',
                this.page.getByRole('button', { name: 'Submit' }),
                async (loc) => await loc.click()
            );
        }

        async fillEmail(email) {
            await this.healer.executeWithHealing(
                'Email Field',
                this.page.getByPlaceholder('Email'),
                async (loc) => await loc.fill(email)
            );
        }
    }

    test('should work seamlessly with Page Object Model', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Setup page elements
        await page.evaluate(() => {
            const input = document.createElement('input');
            input.type = 'email';
            input.placeholder = 'Email';
            input.id = 'email-input';
            
            const button = document.createElement('button');
            button.textContent = 'Submit';
            button.role = 'button';
            
            document.body.appendChild(input);
            document.body.appendChild(button);
        });

        const testPage = new TestPage(page);
        
        await testPage.fillEmail('test@example.com');
        await testPage.clickSubmit();

        // Verify actions completed
        const emailValue = await page.locator('#email-input').inputValue();
        expect(emailValue).toBe('test@example.com');
    });
});

test.describe('Self-Healing System - Concurrent Healing', () => {

    test('should handle multiple healing attempts in parallel', async ({ page }) => {
        await page.goto('https://www.example.com');
        
        // Add multiple buttons
        await page.evaluate(() => {
            for (let i = 0; i < 5; i++) {
                const button = document.createElement('button');
                button.textContent = `Parallel Button ${i}`;
                button.className = `parallel-btn-${i}`;
                document.body.appendChild(button);
            }
        });

        const healer = new SmartLocator(page, 'ParallelPage');

        // Heal multiple elements concurrently
        const healingPromises = [];
        for (let i = 0; i < 5; i++) {
            const promise = healer.executeWithHealing(
                `Parallel Button ${i}`,
                page.locator(`.wrong-btn-${i}`),
                async (loc) => {
                    await loc.click();
                }
            );
            healingPromises.push(promise);
        }

        // All should succeed
        await Promise.all(healingPromises);

        // Verify all were registered
        for (let i = 0; i < 5; i++) {
            const meta = componentRegistry.get('ParallelPage', `Parallel Button ${i}`);
            expect(meta).not.toBeNull();
        }
    });
});