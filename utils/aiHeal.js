require('dotenv').config();
// =============================================================
// aiHeal.js
// AI-powered DOM analysis using Claude API
// Called only when all fallback selectors fail
// =============================================================

// ── config ────────────────────────────────────────────────────
// Set your Anthropic API key in .env or as an environment variable:
//   Windows: set ANTHROPIC_API_KEY=sk-ant-...
//   Mac/Linux: export ANTHROPIC_API_KEY=sk-ant-...

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL             = 'claude-sonnet-4-6'; //  claude-sonnet-4-20250514
const MAX_DOM_CHARS     = 6000; // trim large DOMs before sending

// ── main export ───────────────────────────────────────────────

/**
 * Uses Claude AI to scan the current DOM and suggest a new selector.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} site     - e.g. 'amazon'
 * @param {string} key      - e.g. 'searchBox'
 * @param {object} entry    - locator entry from registry
 * @returns {string|null}   - suggested selector, or null if unable to suggest
 */
async function aiHeal(page, site, key, entry) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — skipping AI healing.');
    console.warn('   Set it with: set ANTHROPIC_API_KEY=sk-ant-...');
    
    return null;
  }

  console.log(`🤖 Sending DOM to Claude for analysis of [${site}:${key}]…`);

  // Capture visible DOM (trimmed to avoid token limits)
  const domSnapshot = await page.evaluate(() => document.body.innerHTML);
  const trimmedDom  = domSnapshot.length > MAX_DOM_CHARS
    ? domSnapshot.substring(0, MAX_DOM_CHARS) + '\n<!-- DOM truncated -->'
    : domSnapshot;

  const prompt = `
You are a Playwright test automation expert. A locator in a Playwright test has broken.

Element name  : "${key}"
Site          : "${site}"
Description   : This element is the "${key}" on ${site}
Failed primary: ${entry.primary}
Failed fallbacks: ${JSON.stringify(entry.fallbacks)}

Current page DOM (may be truncated):
${trimmedDom}

Task: Analyse the DOM and suggest the BEST single Playwright-compatible selector for "${key}".

Rules:
1. Prefer: data-testid > aria-label > id > placeholder > visible text > CSS class
2. The selector must be specific enough to uniquely identify the element
3. Use Playwright locator syntax (e.g. text=, [aria-label=], #id, .class, input[name='q'])
4. Reply with ONLY the selector string — no explanation, no quotes, no markdown

Selector:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 100,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`🤖 Claude API error: ${response.status} — ${err}`);
      return null;
    }

    const data      = await response.json();
    const suggested = data.content?.[0]?.text?.trim();

    if (!suggested) {
      console.warn('🤖 Claude returned empty response.');
      return null;
    }

    console.log(`🤖 Claude suggested: ${suggested}`);
    return suggested;

  } catch (err) {
    console.error(`🤖 Network error calling Claude API: ${err.message}`);
    return null;
  }
}

module.exports = { aiHeal };
