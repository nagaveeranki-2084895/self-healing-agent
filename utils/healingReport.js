// =============================================================
// healingReport.js
// Prints a summary of all healing events from reports/healing-report.json
// Run: node utils/healingReport.js
// =============================================================

const fs   = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'reports', 'healing-report.json');

function printReport() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.log('No healing report found. Run your tests first.');
    return;
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));

  if (report.length === 0) {
    console.log('✅ No healing events. All primary selectors worked!');
    return;
  }

  const healed  = report.filter(r => r.status === 'healed');
  const failed  = report.filter(r => r.status === 'failed');

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         SELF-HEALING TEST REPORT                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`Total events : ${report.length}`);
  console.log(`Healed       : ${healed.length} ✅`);
  console.log(`Failed       : ${failed.length} ❌`);

  if (healed.length > 0) {
    console.log('\n── HEALED LOCATORS ─────────────────────────────────────');
    healed.forEach((e, i) => {
      console.log(`\n[${i + 1}] ${e.site}:${e.element}`);
      console.log(`    Time     : ${e.timestamp}`);
      console.log(`    Strategy : ${e.strategy}`);
      console.log(`    Old      : ${e.oldSelector}`);
      console.log(`    New      : ${e.newSelector}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n── FAILED LOCATORS (manual fix needed) ─────────────────');
    failed.forEach((e, i) => {
      console.log(`\n[${i + 1}] ${e.site}:${e.element}`);
      console.log(`    Time  : ${e.timestamp}`);
      console.log(`    Tried : ${e.triedSelectors?.join(', ')}`);
    });
  }

  console.log('\n════════════════════════════════════════════════════════\n');
}

printReport();
