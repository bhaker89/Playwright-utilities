/**
 * Context-Aware Locator Ranker
 * Implements the enterprise-level scoring formula for locator selection.
 */
class LocatorRanker {
    /**
     * @param {Array<Object>} candidates - Candidate locators from memory
     * @param {Object} context - { domStability, componentConfidence, envVariance, etc. }
     */
    static rank(candidates, context = {}) {
        return candidates.map(c => {
            const score = this.calculateScore(c, context);
            return { ...c, totalScore: score };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }

    /**
     * score = 0.30 successRate + 0.15 semanticStrength + 0.15 domStability + 
     *         0.15 componentConfidence + 0.10 speed + 0.10 visibility + 0.05 entropyPenalty
     */
    static calculateScore(candidate, context) {
        const {
            successRate = candidate.success_rate || 0.5,
            semanticStrength = this._getSemanticStrength(candidate.strategy),
            domStability = context.domStability || 0.8,
            componentConfidence = context.componentConfidence || 0.8,
            speed = this._normalizeSpeed(candidate.avg_exec_time),
            visibility = 1.0, // Assuming found candidates are visible for ranking
            entropyPenalty = this._getEntropyPenalty(candidate.strategy)
        } = {};

        const total = 
            (0.30 * successRate) +
            (0.15 * semanticStrength) +
            (0.15 * domStability) +
            (0.15 * componentConfidence) +
            (0.10 * speed) +
            (0.10 * visibility) -
            (0.05 * entropyPenalty);

        return Math.max(0, Math.min(1, total));
    }

    static _getSemanticStrength(strategy) {
        const weights = {
            'data-testid': 1.0,
            'getByTestId': 1.0,
            'getByRole': 0.9,
            'getByLabel': 0.85,
            'getByText': 0.8,
            'css': 0.5,
            'xpath': 0.3,
            'ai': 0.2
        };
        return weights[strategy] || 0.4;
    }

    static _getEntropyPenalty(strategy) {
        // Punish nth-child, dynamic IDs, deep chains
        if (strategy.includes('nth-child') || strategy.includes(':equiv') || strategy.includes(' > ')) {
            return 1.0;
        }
        if (strategy.match(/\d{5,}/)) { // Probable dynamic ID like id="btn-12345"
            return 0.8;
        }
        return 0;
    }

    static _normalizeSpeed(avgTime) {
        if (!avgTime) return 0.5;
        // Faster is better. 0-100ms = 1.0, 1000ms+ = 0.0
        return Math.max(0, 1 - (avgTime / 1000));
    }
}

module.exports = LocatorRanker;
