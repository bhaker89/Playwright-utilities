class FailureClassifier {
    static classify(error) {
        if (!error || !error.message) return 'UNKNOWN_FAILURE';
        
        const msg = error.message.toLowerCase();
        
        const matches = (patterns) => patterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(error.message);
            }
            return msg.includes(pattern.toLowerCase());
        });

        if (matches(['not visible', 'is hidden'])) return 'NOT_VISIBLE';
        if (matches(['detached', 'no longer in the dom', 'stale element'])) return 'DETACHED_NODE';
        if (matches(['intercepting', 'pointer-events', 'covered by', 'overlay'])) return 'OVERLAY_BLOCKED';
        if (matches(['hydration', 'next_data', 'react fiber', 'react replacement'])) return 'REACT_REPLACEMENT';
        if (matches(['shadow root', 'shadowdom', 'shadow'])) return 'SHADOW_ROOT_MISSING';
        if (matches(['viewport', 'scroll into view'])) return 'SCROLL_REQUIRED';
        if (matches(['waiting for locator', 'locator.waitFor', /timeout/i, /exceeded/i])) return 'LAZY_RENDER_PENDING';
        if (matches(['context closed', 'target closed', 'frame was detached', /Execution context was destroyed/i, /target closed/i])) return 'FRAME_CONTEXT_LOST';
        if (matches(['animation', 'transition'])) return 'TRANSITION_ACTIVE';

        return 'UNKNOWN_FAILURE';
    }
}

module.exports = FailureClassifier;
