// =============================================================
// resetRegistry.js
// Resets healing stats in locators.json (run: npm run heal:reset)
// =============================================================

const fs   = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'locators.json');

function resetRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  for (const site of Object.keys(registry)) {
    for (const key of Object.keys(registry[site])) {
      registry[site][key].lastHealed = null;
      registry[site][key].healCount  = 0;
    }
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log('✅ Locator registry heal stats have been reset.');
}

resetRegistry();
