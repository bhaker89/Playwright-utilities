/**
 * Selector Stability Evaluator
 * Penalizes fragile selectors based on structural entropy.
 */
class SelectorStabilityEvaluator {
    /**
     * Evaluate the entropy (fragility) of a selector string.
     * @param {string} selector 
     * @returns {number} Entropy score (0.0 to 1.0, where 1.0 is most fragile)
     */
    static evaluate(selector) {
        if (!selector || typeof selector !== 'string') return 0;

        let entropy = 0;

        // 1. Penalize nth-child usage (highly structural/brittle)
        if (selector.includes('nth-child') || selector.includes('nth-of-type')) {
            entropy += 0.4;
        }

        // 2. Penalize deep CSS chains (over-specification)
        const depth = selector.split(/[> ]+/).filter(Boolean).length;
        if (depth > 3) {
            entropy += 0.2;
        }

        // 3. Penalize dynamic index selectors [1], [2], etc.
        if (selector.match(/\[\d+\]/)) {
            entropy += 0.3;
        }

        // 4. Penalize absolute XPath (industry anti-pattern)
        if (selector.startsWith('/') && !selector.startsWith('//')) {
            entropy += 0.5;
        } else if (selector.startsWith('//')) {
            entropy += 0.3; // Relative XPath is better but still higher entropy than TestID
        }

        // 5. Penalize positional pseudo-classes
        if (selector.includes(':first-') || selector.includes(':last-')) {
            entropy += 0.2;
        }

        return Math.min(entropy, 1.0);
    }
}

module.exports = SelectorStabilityEvaluator;
