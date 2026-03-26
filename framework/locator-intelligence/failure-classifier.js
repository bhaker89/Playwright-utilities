class FailureClassifier {
    static classify(error) {
        if (!error || !error.message) return 'UNKNOWN_FAILURE';
        
        const msg = error.message.toLowerCase();
        
        const matches = (substrings) => substrings.some(sub => msg.includes(sub));

        if (matches(['not visible', 'is hidden'])) return 'NOT_VISIBLE';
        if (matches(['detached', 'no longer in the dom', 'stale element'])) return 'DETACHED_NODE';
        if (matches(['intercepting', 'pointer-events', 'covered by'])) return 'OVERLAY_BLOCKED';
        if (matches(['hydration', 'next_data', 'react fiber'])) return 'HYDRATION_PENDING';
        if (matches(['shadow root', 'shadowdom'])) return 'SHADOW_ROOT_MISSING';
        if (matches(['viewport', 'scroll into view'])) return 'SCROLL_REQUIRED';
        if (matches(['timeout', 'waiting for locator', 'exceeded 3000ms'])) return 'TIMEOUT';
        if (matches(['context closed', 'target closed'])) return 'FRAME_CONTEXT_LOST';
        if (matches(['animation', 'transition'])) return 'TRANSITION_ACTIVE';

        return 'UNKNOWN_FAILURE';
    }
}

module.exports = FailureClassifier;
