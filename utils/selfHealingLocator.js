// =============================================================
// selfHealingLocator.js
// Core self-healing locator engine for Playwright
// =============================================================

const fs   = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'locators.json');
const REPORT_PATH   = path.join(__dirname, '..', 'reports', 'healing-report.json');

// ── helpers ──────────────────────────────────────────────────

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function loadReport() {
  if (!fs.existsSync(REPORT_PATH)) return [];
  return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
}

function saveReport(report) {
  if (!fs.existsSync(path.dirname(REPORT_PATH))) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

function logHealingEvent(site, key, oldSelector, newSelector, strategy) {
  const report = loadReport();
  report.push({
    timestamp:   new Date().toISOString(),
    site,
    element:     key,
    oldSelector,
    newSelector,
    strategy,
    status:      'healed'
  });
  saveReport(report);
}

function logFailureEvent(site, key, triedSelectors) {
  const report = loadReport();
  report.push({
    timestamp:      new Date().toISOString(),
    site,
    element:        key,
    triedSelectors,
    strategy:       'all-failed',
    status:         'failed'
  });
  saveReport(report);
}

// ── main export ──────────────────────────────────────────────

/**
 * Self-healing locator
 * Usage: const el = await getLocator(page, 'amazon', 'searchBox');
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} site    - Top-level key in locators.json  (e.g. 'amazon')
 * @param {string} key     - Element key                     (e.g. 'searchBox')
 * @param {object} options - { timeout: 3000, visible: true }
 */
async function getLocator(page, site, key, options = {}) {
  const timeout = options.timeout ?? 3000;
  const registry = loadRegistry();

  if (!registry[site]) throw new Error(`Site "${site}" not found in locators.json`);
  if (!registry[site][key]) throw new Error(`Element "${key}" not found under site "${site}"`);

  const entry = registry[site][key];
  const tried = [];

  // ── 1. Try primary selector ────────────────────────────────
  try {
    const el = page.locator(entry.primary).first();
    await el.waitFor({ timeout, state: 'attached' });
    console.log(`✅ [${site}:${key}] Primary selector OK → ${entry.primary}`);
    return el;
  } catch {
    console.warn(`⚠️  [${site}:${key}] Primary failed → ${entry.primary}`);
    tried.push(entry.primary);
  }

  // ── 2. Try fallback selectors ──────────────────────────────
  for (const fallback of entry.fallbacks) {
    try {
      const el = page.locator(fallback).first();
      await el.waitFor({ timeout, state: 'attached' });

      console.log(`🔁 [${site}:${key}] Fallback worked → ${fallback}`);
      console.log(`   Updating registry: "${entry.primary}" → "${fallback}"`);

      // Auto-heal registry
      const updatedRegistry         = loadRegistry();
      const oldPrimary              = updatedRegistry[site][key].primary;
      updatedRegistry[site][key].primary    = fallback;
      updatedRegistry[site][key].lastHealed = new Date().toISOString();
      updatedRegistry[site][key].healCount  = (updatedRegistry[site][key].healCount || 0) + 1;
      saveRegistry(updatedRegistry);

      logHealingEvent(site, key, oldPrimary, fallback, 'fallback');
      return el;
    } catch {
      console.warn(`❌  [${site}:${key}] Fallback failed → ${fallback}`);
      tried.push(fallback);
    }
  }

  // ── 3. AI healing ──────────────────────────────────────────
  console.warn(`🤖 [${site}:${key}] All fallbacks failed. Attempting AI healing…`);
  try {
    const { aiHeal } = require('./aiHeal');
    const suggested   = await aiHeal(page, site, key, entry);

    if (suggested) {
      const el = page.locator(suggested).first();
      await el.waitFor({ timeout, state: 'attached' });

      console.log(`✨ [${site}:${key}] AI healed → ${suggested}`);

      const updatedRegistry             = loadRegistry();
      const oldPrimary                  = updatedRegistry[site][key].primary;
      updatedRegistry[site][key].primary    = suggested;
      updatedRegistry[site][key].lastHealed = new Date().toISOString();
      updatedRegistry[site][key].healCount  = (updatedRegistry[site][key].healCount || 0) + 1;
      saveRegistry(updatedRegistry);

      logHealingEvent(site, key, oldPrimary, suggested, 'ai');
      return el;
    }
  } catch (aiErr) {
    console.error(`🤖 AI healing error: ${aiErr.message}`);
  }

  // ── 4. All strategies failed ───────────────────────────────
  logFailureEvent(site, key, tried);
  throw new Error(
    `💀 [${site}:${key}] All selectors failed.\n` +
    `   Tried: ${tried.join(', ')}\n` +
    `   Please update locators.json manually.`
  );
}

// ── screenshot on failure ────────────────────────────────────

/**
 * Wraps a test step; takes a screenshot automatically if it fails.
 */
async function safeStep(page, stepName, fn) {
  try {
    await fn();
  } catch (err) {
    const screenshotDir  = path.join(__dirname, '..', 'reports', 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${stepName}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`📸 Screenshot saved → ${screenshotPath}`);
    throw err;
  }
}

module.exports = { getLocator, safeStep };
