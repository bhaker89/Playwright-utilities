const path = require('path');
const fs = require('fs');

/**
 * Locator Map Registry
 * Centralized registry for locator ownership across microfrontends/teams.
 */
class LocatorMapRegistry {
    constructor() {
        this.mapPath = path.resolve(process.cwd(), 'framework/locator-intelligence/locator-map.json');
        this._loadMap();
    }

    _loadMap() {
        if (fs.existsSync(this.mapPath)) {
            this.map = JSON.parse(fs.readFileSync(this.mapPath, 'utf8'));
        } else {
            this.map = {};
        }
    }

    async getAlternatives(locatorKey) {
        const entry = this.map[locatorKey];
        if (!entry) return [];
        
        // Convert array of entries to structured objects
        if (Array.isArray(entry)) {
            return entry.map(val => {
                if (typeof val === 'string') {
                    // Improved heuristics:
                    // 1. XPath: Starts with // or (
                    if (val.startsWith('//') || val.startsWith('(')) {
                        return { strategy: 'xpath', value: val };
                    }
                    // 2. CSS: If it looks like a CSS selector (has . # [ ] > + ~)
                    if (/[.#\[\]>+~]/.test(val)) {
                        return { strategy: 'css', value: val };
                    }
                    // 3. Default: Assume it's a test ID (legacy/simple)
                    return { strategy: 'getByTestId', value: val };
                }
                return val; // Already structured
            });
        }

        return entry.alternatives || [];
    }
}

module.exports = new LocatorMapRegistry();
