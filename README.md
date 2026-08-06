# Playwright Self-Healing Test Agent

A Playwright test automation framework that automatically heals broken locators
using a 3-tier fallback strategy: primary selector → fallback selectors → AI healing.

---

## Project Structure

```
playwright-self-healing/
│
├── tests/
│   ├── amazon.test.js        ← Amazon.in tests
│   ├── google.test.js        ← Google search tests
│   └── demo.test.js          ← Demonstrates healing with broken selectors
│
├── utils/
│   ├── selfHealingLocator.js ← Core healing engine
│   ├── aiHeal.js             ← Claude AI DOM analysis
│   ├── resetRegistry.js      ← Reset heal stats
│   └── healingReport.js      ← Print healing summary
│
├── reports/                  ← Auto-created on first run
│   ├── healing-report.json   ← Healing event log
│   ├── screenshots/          ← Screenshots on failure
│   └── playwright-html/      ← Playwright HTML report
│
├── locators.json             ← Selector registry
├── playwright.config.js      ← Playwright configuration
├── .env.example              ← Environment variable template
└── package.json
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Set up environment variables
```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```
Edit `.env` and add your Anthropic API key (only needed for AI healing):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Run all tests
```bash
npm test
```

### 4. Run demo (shows healing in action)
```bash
npx playwright test tests/demo.test.js --headed
```

### 5. View test report
```bash
npm run test:report
```

### 6. View healing report
```bash
node utils/healingReport.js
```

---

## How the Healing Works

```
Test runs
   │
   ▼
Try PRIMARY selector
   │
   ├── Found? ──► Test continues ✅
   │
   └── Not found?
          │
          ▼
     Try FALLBACK selectors (in order)
          │
          ├── One works? ──► Update registry + Continue ✅
          │
          └── All fail?
                 │
                 ▼
           AI HEALING (Claude API)
                 │
                 ├── Suggestion works? ──► Update registry + Continue ✅
                 │
                 └── AI fails? ──► Log failure + Throw error ❌
```

---

## Adding a New Site / Element

Open `locators.json` and add your site and elements:

```json
{
  "mysite": {
    "loginButton": {
      "primary": "#login-btn",
      "fallbacks": [
        "text=Login",
        "[data-testid='login']",
        "button:has-text('Login')",
        "[aria-label='Login']"
      ],
      "lastHealed": null,
      "healCount": 0
    }
  }
}
```

Then use it in your test:
```js
const { getLocator } = require('../utils/selfHealingLocator');

const btn = await getLocator(page, 'mysite', 'loginButton');
await btn.click();
```

---

## Fallback Selector Priority

| Priority | Strategy     | Example                        |
|----------|-------------|-------------------------------|
| 1        | ID           | `#login-btn`                  |
| 2        | data-testid  | `[data-testid='login']`       |
| 3        | ARIA label   | `[aria-label='Login']`        |
| 4        | Placeholder  | `[placeholder='Search']`      |
| 5        | Visible text | `text=Login`                  |
| 6        | CSS class    | `.login-button`               |
| 7        | XPath        | `//button[text()='Login']`    |
| 8        | AI healing   | Claude API DOM scan           |

---

## Useful Commands

| Command                              | Description                      |
|--------------------------------------|----------------------------------|
| `npm test`                           | Run all tests                    |
| `npm run test:headed`                | Run with visible browser         |
| `npm run test:debug`                 | Run in debug mode                |
| `npm run test:ui`                    | Open Playwright UI mode          |
| `npm run test:report`                | Open HTML test report            |
| `npm run heal:reset`                 | Reset heal stats in registry     |
| `node utils/healingReport.js`        | Print healing summary            |
| `npx playwright test --grep "demo"`  | Run only demo tests              |

---

## Requirements

- Node.js v18 or higher
- Playwright v1.44+
- Anthropic API key (optional — only for AI healing tier)
