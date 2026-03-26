/**
 * Confidence Engine
 * Calculates locator confidence and makes replacement decisions.
 */
class ConfidenceEngine {
    constructor() {
        this.thresholdReplace = 0.85;
        this.thresholdWarn = 0.60;
        this.thresholdCritical = 0.40;
    }

    /**
     * confidence = (successRate * 0.5) + (locatorAgePenalty * 0.2) + (domStability * 0.3)
     */
    calculate(stats, context = {}) {
        const successRate = stats.success_rate || 0;
        const lastUsed = stats.last_used ? new Date(stats.last_used) : new Date();
        const ageInDays = (new Date() - lastUsed) / (1000 * 60 * 60 * 24);
        const agePenalty = Math.max(0, 1 - (ageInDays / 30)); // 30-day decay

        const domStability = context.domStability || 0.8;

        const score = (successRate * 0.5) + (agePenalty * 0.2) + (domStability * 0.3);
        
        return {
            score: Math.max(0, Math.min(1, score)),
            action: this.getRecommendedAction(score)
        };
    }

    getRecommendedAction(score) {
        if (score >= this.thresholdReplace) return 'KEEP';
        if (score >= this.thresholdWarn) return 'MONITOR';
        if (score >= this.thresholdCritical) return 'WARN';
        return 'REPLACE';
    }
}

module.exports = new ConfidenceEngine();
