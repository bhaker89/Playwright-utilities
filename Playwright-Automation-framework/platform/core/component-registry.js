const fs = require('fs');
const path = require('path');
const { logger } = require('../../utils/base/logger');

/**
 * ComponentRegistry
 * A dynamic store for AI-discovered locators.
 * Maps logical names (e.g., 'Submit Button') to Playwright-compatible locator metadata.
 */
class ComponentRegistry {
    constructor() {
        this.registryPath = path.join(process.cwd(), '.auth', 'ui-registry.json');
        this.components = this._loadRegistry();
    }

    /**
     * Register or update a component and its locator
     * @param {string} pageName
     * @param {string} componentName
     * @param {{ role?: string, name?: string, testId?: string, selector?: string }} locatorMetadata
     */
    register(pageName, componentName, locatorMetadata) {
        if (!this.components[pageName]) {
            this.components[pageName] = {};
        }

        this.components[pageName][componentName] = {
            ...locatorMetadata,
            lastUpdated: new Date().toISOString()
        };

        this._saveRegistry();
        logger.info(`Registered component: ${pageName}.${componentName}`);
    }

    /**
     * Get locator metadata for a component
     * @param {string} pageName
     * @param {string} componentName
     * @returns {{ role?: string, name?: string, testId?: string, selector?: string } | null}
     */
    get(pageName, componentName) {
        return this.components[pageName]?.[componentName] || null;
    }

    /**
     * Internal: Load registry from disk
     * @private
     */
    _loadRegistry() {
        try {
            if (fs.existsSync(this.registryPath)) {
                return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
            }
        } catch (error) {
            logger.error('Failed to load UI Registry', error);
        }
        return {};
    }

    /**
     * Internal: Save registry to disk
     * @private
     */
    _saveRegistry() {
        try {
            const dir = path.dirname(this.registryPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.registryPath, JSON.stringify(this.components, null, 2));
        } catch (error) {
            logger.error('Failed to save UI Registry', error);
        }
    }
}

// Singleton Export
module.exports = new ComponentRegistry();
