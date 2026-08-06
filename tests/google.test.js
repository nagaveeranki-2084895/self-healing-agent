// =============================================================
// tests/google.test.js
// Sample self-healing Playwright tests for Google Search
// =============================================================

const { test, expect } = require('@playwright/test');
const { getLocator, safeStep } = require('../utils/selfHealingLocator');
const fs               = require('fs');
const path             = require('path');

const REGISTRY = path.join(__dirname, '..', 'locators.json');

test.describe('Google Search - Self Healing Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Intentionally break the primary selectors to show healing
    const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
    registry.google.searchBox.primary  = '#BROKEN-selector-SearchBox';
    fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
    console.log('🔨 Broken selectors injected for demo...');

    await page.goto('https://www.google.co.in/', { waitUntil: 'domcontentloaded' });
    // Accept Google consent popup if it appears
    try {
      await page.locator('text=Accept all').click({ timeout: 3000 });
    } catch {
      // No consent popup — continue
    }
  });

  // ── Test 1: Search functionality ───────────────────────────
  test('Search for Playwright automation', async ({ page }) => {
    await safeStep(page, 'google-search', async () => {
      const searchBox = await getLocator(page, 'google', 'searchBox');
      await searchBox.fill('Playwright automation testing');
      await searchBox.press('Enter');
    });
    
    console.log('✅ Google search works');
  });

});
