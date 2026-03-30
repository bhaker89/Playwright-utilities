const SelectorStabilityEvaluator = require('./selector-stability-evaluator');

function tokenize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenOverlapScore(targetKey, candidateText) {
  const targetTokens = new Set(tokenize(targetKey));
  const candidateTokens = new Set(tokenize(candidateText));

  if (targetTokens.size === 0 || candidateTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of targetTokens) {
    if (candidateTokens.has(t)) overlap++;
  }

  return overlap / Math.max(targetTokens.size, 1);
}

async function safeCount(locator) {
  try {
    const count = await locator.count();
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

async function safeInnerText(locator) {
  try {
    return await locator.first().innerText({ timeout: 1000 });
  } catch {
    return '';
  }
}

function uniquenessFromCount(count) {
  if (!count || count <= 0) return 0;
  if (count === 1) return 1;
  // More matches => less unique
  return 1 / count;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Grounding-time candidate extractor.
 *
 * This is intentionally deterministic (no LLM). It generates multiple locator strategies
 * and attaches basic quality metrics:
 * - nameMatch: how well candidate name matches target key
 * - uniqueness: based on locator.count()
 * - entropy: selector fragility for css/xpath
 * - stability: simple derived score (1 - entropy) with minor penalties
 */
class CandidateExtractor {
  /**
   * @param {Object} options
   * @param {import('@playwright/test').Page} options.page
   */
  constructor({ page }) {
    this.page = page;
  }

  async extractCandidatesForTarget(targetKey) {
    const candidates = [];

    // 1) data-testid candidates
    // We collect all unique testids and rank them by token overlap.
    const testIds = await this.page.evaluate(() => {
      const ids = new Set();
      for (const el of Array.from(document.querySelectorAll('[data-testid]')).slice(0, 800)) {
        const v = el.getAttribute('data-testid');
        if (v) ids.add(v);
      }
      return Array.from(ids);
    });

    for (const testId of testIds) {
      const locator = this.page.getByTestId(testId);
      const count = await safeCount(locator);
      const uniqueness = uniquenessFromCount(count);
      if (count <= 0) continue;

      candidates.push({
        type: 'testid',
        value: testId,
        nameMatch: tokenOverlapScore(targetKey, testId),
        uniqueness,
        entropy: 0,
        stability: 1.0,
      });
    }

    // 2) role candidates (buttons, links, headings, textbox)
    const roleCandidates = [
      { role: 'button' },
      { role: 'link' },
      { role: 'heading' },
      { role: 'textbox' },
    ];

    for (const { role } of roleCandidates) {
      // Pull some names for this role from the DOM.
      const names = await this.page.evaluate((r) => {
        const result = new Set();
        const selector = `[role="${r}"]`;
        for (const el of Array.from(document.querySelectorAll(selector)).slice(0, 300)) {
          const name = el.getAttribute('aria-label') || el.textContent || '';
          const cleaned = String(name).trim();
          if (cleaned) result.add(cleaned.slice(0, 80));
        }
        return Array.from(result);
      }, role);

      for (const name of names) {
        const locator = this.page.getByRole(role, { name, exact: false });
        const count = await safeCount(locator);
        if (count <= 0) continue;

        candidates.push({
          type: 'role',
          value: { role, options: { name, exact: false } },
          nameMatch: tokenOverlapScore(targetKey, name),
          uniqueness: uniquenessFromCount(count),
          entropy: 0,
          stability: 0.9,
        });
      }
    }

    // 3) label candidates: label text -> getByLabel
    const labels = await this.page.evaluate(() => {
      const result = new Set();
      for (const label of Array.from(document.querySelectorAll('label')).slice(0, 300)) {
        const text = (label.textContent || '').trim();
        if (text) result.add(text.slice(0, 80));
      }
      return Array.from(result);
    });

    for (const labelText of labels) {
      const locator = this.page.getByLabel(labelText, { exact: false });
      const count = await safeCount(locator);
      if (count <= 0) continue;

      candidates.push({
        type: 'label',
        value: labelText,
        nameMatch: tokenOverlapScore(targetKey, labelText),
        uniqueness: uniquenessFromCount(count),
        entropy: 0,
        stability: 0.88,
      });
    }

    // 4) text candidates: visible-ish text snippets
    // We sample button/link text and some headings to avoid exploding the candidate set.
    const textSnippets = await this.page.evaluate(() => {
      const nodes = [];
      const selectors = ['button', 'a', 'h1', 'h2', 'h3', '[role="button"]', '[role="link"]'];
      for (const sel of selectors) {
        for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 200)) {
          const text = (el.textContent || '').trim();
          if (text && text.length <= 80) nodes.push(text);
        }
      }
      return Array.from(new Set(nodes)).slice(0, 250);
    });

    for (const text of textSnippets) {
      const locator = this.page.getByText(text, { exact: false });
      const count = await safeCount(locator);
      if (count <= 0) continue;

      candidates.push({
        type: 'text',
        value: text,
        nameMatch: tokenOverlapScore(targetKey, text),
        uniqueness: uniquenessFromCount(count),
        entropy: 0,
        stability: 0.8,
      });
    }

    // 5) css candidates: limited set of stable-ish patterns derived from attributes
    // - [data-testid="x"] is already covered by getByTestId, but css fallback is useful in some runtimes.
    // - [name="x"], [placeholder="x"]
    const attrSelectors = await this.page.evaluate(() => {
      const results = [];

      const pushUnique = (sel) => {
        if (sel && !results.includes(sel)) results.push(sel);
      };

      for (const el of Array.from(document.querySelectorAll('input, textarea, select, button, a')).slice(0, 400)) {
        const testid = el.getAttribute('data-testid');
        if (testid) pushUnique(`[data-testid="${CSS.escape(testid)}"]`);

        const name = el.getAttribute('name');
        if (name) pushUnique(`${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`);

        const placeholder = el.getAttribute('placeholder');
        if (placeholder && placeholder.length <= 60) {
          pushUnique(`${el.tagName.toLowerCase()}[placeholder="${CSS.escape(placeholder)}"]`);
        }
      }

      return results.slice(0, 250);
    });

    for (const cssSelector of attrSelectors) {
      const locator = this.page.locator(cssSelector);
      const count = await safeCount(locator);
      if (count <= 0) continue;

      const text = await safeInnerText(locator);
      const entropy = SelectorStabilityEvaluator.evaluate(cssSelector);

      candidates.push({
        type: 'css',
        value: cssSelector,
        nameMatch: Math.max(tokenOverlapScore(targetKey, cssSelector), tokenOverlapScore(targetKey, text)),
        uniqueness: uniquenessFromCount(count),
        entropy,
        stability: clamp01(1 - entropy),
      });
    }

    // 6) xpath candidates (very limited, last resort)
    // We don't generate arbitrary XPaths; we only emit attribute-based ones.
    const xpathCandidates = await this.page.evaluate(() => {
      const results = [];
      const push = (x) => {
        if (x && !results.includes(x)) results.push(x);
      };

      for (const el of Array.from(document.querySelectorAll('[data-testid]')).slice(0, 200)) {
        const v = el.getAttribute('data-testid');
        if (!v) continue;
        // //*[@data-testid='foo']
        push(`//*[@data-testid='${v.replace(/'/g, "\\'")}']`);
      }

      return results.slice(0, 100);
    });

    for (const xp of xpathCandidates) {
      const locator = this.page.locator(`xpath=${xp}`);
      const count = await safeCount(locator);
      if (count <= 0) continue;

      const entropy = SelectorStabilityEvaluator.evaluate(xp);

      candidates.push({
        type: 'xpath',
        value: xp,
        nameMatch: tokenOverlapScore(targetKey, xp),
        uniqueness: uniquenessFromCount(count),
        entropy,
        stability: clamp01(1 - entropy),
      });
    }

    // Defensive filter: avoid returning a massive list.
    // Sort by nameMatch first, then uniqueness, then stability.
    return candidates
      .filter(c => c && c.type && c.value)
      .sort((a, b) => {
        if ((b.nameMatch || 0) !== (a.nameMatch || 0)) return (b.nameMatch || 0) - (a.nameMatch || 0);
        if ((b.uniqueness || 0) !== (a.uniqueness || 0)) return (b.uniqueness || 0) - (a.uniqueness || 0);
        return (b.stability || 0) - (a.stability || 0);
      })
      .slice(0, 120);
  }
}

module.exports = CandidateExtractor;