# AI-Powered Regression Testing Agent

Deterministic regression intelligence for Uniware — analyzes change impact,
generates targeted tests, and executes UI + API + DB validation with Allure reporting.

## Quick Start

```bash
npm install
npx playwright install chromium

# Full agent pipeline
npm run regression -- --story "GST validation changed for product creation"

# Sale Order / Vendor Catalog
npm run regression -- --story "sale order creation flow changed"
npm run regression -- --story "vendor catalog mapping changed"

# Simulate Uniware code change (PR demo)
npm run regression -- --story "GST validation changed" \
  --simulate "UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java"

# Impact analysis only
npm run impact -- --story "GST validation changed" --no-git

# Inventory impact
npm run regression -- --story "inventory snapshot stock changed"

# JIRA + LLM enrichment
npm run regression -- --jira PROJ-123 --llm

# GitHub PR diff
npm run regression -- --pr 42 --story "vendor catalog changed"

# Verify intelligence layer
npm run impact:test
npm run phase4:test

# Launch dashboard (UI + API)
npm run dashboard
# Open http://localhost:5173
```

## One-Command Pipeline

```
Story / PR Diff
    → Impact Analysis
    → Test Generation
    → Smart Test Selection
    → Playwright Execution
    → Allure Report
```

## Project Structure

```
agents/
├── dependency/     # Framework dependency graph
├── uniware/        # Uniware source + git impact
├── impact/         # Impact analyzer
├── generator/      # Auto test generator
├── execution/      # Playwright runner
├── llm/            # Optional Gemini enrichment
├── jira/           # JIRA integration
├── github/         # GitHub PR integration
├── report/         # Markdown reporter
└── runRegression.js

dashboard/          # React command center UI
server/             # Express API for dashboard

tests/
├── ui/             # UI E2E tests
├── api/            # API tests
├── db/             # DB validation
└── generated/      # Auto-generated regression specs

config/impactMap.json   # Business domain mapping
docs/ARCHITECTURE.md    # Full architecture
```

## Environment

Create `.env`:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=your_password
DB_NAME=
TEST_USERNAME=your@email.com
TEST_PASSWORD=your_password
BASE_URL=
UNIWARE_PATH=/path/to/Uniware
FACILITY_CODE=

# Optional Phase 4
GEMINI_API_KEY=your_key
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_token
```

## Tech Stack

- Node.js / Playwright
- MySQL validation
- Uniware Git source tracing
- Allure reporting
