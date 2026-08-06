// =============================================================
// tests/demo.test.js
// Demonstrates self-healing in action with intentionally
// broken primary selectors that get healed by fallbacks.
// =============================================================

const { test, expect } = require('@playwright/test');
const { getLocator }   = require('../utils/selfHealingLocator');
const fs               = require('fs');
const path             = require('path');

const REGISTRY = path.join(__dirname, '..', 'locators.json');

test.describe('Self-Healing Demo — broken selectors auto-healed', () => {

  test.beforeAll(() => {
    // Intentionally break the primary selectors to show healing
    const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
    registry.amazon.searchBox.primary  = '#BROKEN-SELECTOR-XYZ';
    registry.amazon.cartIcon.primary   = '.broken-cart-class';
    fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
    console.log('🔨 Broken selectors injected for demo...');
  });

  test('Search box heals from broken primary selector', async ({ page }) => {
    await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded' });

    console.log('Primary selector is intentionally broken (#BROKEN-SELECTOR-XYZ)');
    console.log('Agent will try fallbacks and auto-heal...');

    const searchBox = await getLocator(page, 'amazon', 'searchBox');
    await expect(searchBox).toBeVisible();
    await searchBox.fill('self healing demo');

    console.log('✅ Self-healing worked! Locator registry has been updated.');

    // Verify the registry was updated
    const updated = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
    console.log(`New primary selector: ${updated.amazon.searchBox.primary}`);
    expect(updated.amazon.searchBox.primary).not.toBe('#BROKEN-SELECTOR-XYZ');
  });

  test('Cart icon heals from broken primary selector', async ({ page }) => {
    await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded' });

    console.log('Primary selector is intentionally broken (.broken-cart-class)');
    const cartIcon = await getLocator(page, 'amazon', 'cartIcon');
    await expect(cartIcon).toBeVisible();

    const updated = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
    console.log(`✅ Cart healed. New selector: ${updated.amazon.cartIcon.primary}`);
    expect(updated.amazon.cartIcon.primary).not.toBe('.broken-cart-class');
  });

});
