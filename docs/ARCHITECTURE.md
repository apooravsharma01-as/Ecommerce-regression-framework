# AI-Powered Regression Testing Agent

## Overview

Deterministic regression intelligence platform that analyzes software changes,
maps impact across UI, API, and DB layers, generates targeted tests, and
executes them with Allure reporting.

## Architecture

```
JIRA Story / GitHub PR / --simulate
        ↓
StoryParser (optional --llm)
        ↓
ImpactAnalyzer
        ↓
TestGenerator → tests/generated/regression/*.spec.js
        ↓
RegressionSelector (merge UI + generated API/DB)
        ↓
RegressionRunner → Playwright
        ↓
FailureAnalyzer (optional --llm on failure)
        ↓
Allure + regression-report.json + regression-report.md
```

## Components

| Component | Path | Role |
|-----------|------|------|
| CodebaseScanner | `agents/scanner/` | File discovery |
| DependencyScanner | `agents/dependency/` | Import graph, endpoints, tables |
| UniwareSourceTracer | `agents/uniware/` | Uniware Git source tracing |
| GitImpactScanner | `agents/uniware/` | PR diff analysis |
| ImpactAnalyzer | `agents/impact/` | Story + diff → impact JSON |
| TestGenerator | `agents/generator/` | Auto-generate regression specs |
| RegressionSelector | `agents/selection/` | Test ranking and selection |
| RegressionRunner | `agents/execution/` | Playwright + Allure execution |
| StoryParser | `agents/llm/` | Optional Gemini story enrichment |
| FailureAnalyzer | `agents/llm/` | Rule-based + optional LLM failure triage |
| JiraFetcher | `agents/jira/` | Fetch JIRA ticket as story input |
| PrImpactScanner | `agents/github/` | GitHub PR diff via `gh` CLI |
| RegressionReporter | `agents/report/` | Markdown regression summary |

## Commands

```bash
# Full pipeline: analyze → generate → run → allure
npm run regression -- --story "GST validation changed"

# Sale Order impact
npm run regression -- --story "sale order creation flow changed"

# Vendor Catalog impact
npm run regression -- --story "vendor catalog mapping changed"

# Simulate Uniware PR file change + story
npm run regression -- --story "GST validation changed" \
  --simulate "UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java"

# Analyze + generate only
npm run regression:analyze -- --story "GST validation changed"

# Impact analysis only
npm run impact -- --story "GST validation changed" --no-git

# JIRA ticket as input
npm run regression -- --jira PROJ-123 --llm

# GitHub PR changed files (requires gh CLI)
npm run regression -- --pr 42 --story "inventory snapshot changed"

# Inventory domain
npm run regression -- --story "inventory snapshot stock changed"

# Verify intelligence layer
npm run impact:test

# Verify Phase 4 modules
npm run phase4:test

# Verify Phase 5 (diff + scenarios + PR/JIRA comments)
npm run phase5:test

# PR regression with diff-based scenario generation
npm run regression -- --pr 42 --story "GST validation changed"

# Skip external comments
npm run regression -- --jira PROJ-123 --no-jira-comment
```

## Domains

| Domain | API | UI | DB |
|--------|-----|----|----|
| product-creation | ProductApi | ProductPage | item_type |
| sale-order | SaleOrderApi | — | sale_order |
| vendor-catalog | VendorCatalogApi | VendorCatalogPage | vendor_item_type |
| inventory | InventoryApi | — | — |

## Git PR Analysis

Uniware repo is scanned from `UNIWARE_PATH` (default `~/Uniware`).
Base branch defaults to `production`.

For shallow clones or local demos, use `--simulate` with a changed file path:

```bash
npm run regression -- --simulate UniwareCore/.../ItemType.java --story "GST changed"
```

## Example

**Input:** `GST validation changed for product creation`

**Output:**
- Domains: `product-creation`
- Generated: `tests/generated/regression/product-creation.api.spec.js`
- Runs: UI login test + generated API/DB specs
- Report: `.cache/regression-report.json` + `.cache/regression-report.md` + `allure-report/`

## Phase 4 — LLM + Integrations

Optional Gemini enrichment via `GEMINI_API_KEY`. Rule-based analysis always works without LLM.

| Flag | Purpose |
|------|---------|
| `--jira PROJ-123` | Fetch JIRA summary + description as story |
| `--pr 42` | Pull changed files from GitHub PR (`gh` CLI) |
| `--llm` | LLM story parsing + AI failure analysis on test failures |

### Environment (optional)

```env
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.0-flash
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_token
GITHUB_REPO=devops-unicommerce/Uniware
FACILITY_CODE=05
ENABLE_AI_FAILURE_ANALYSIS=true
```

## Data Sources

1. **Regression framework** — pages, api, tests, queries
2. **Uniware Git repo** — REST endpoints, JPA entities, changed files
3. **impactMap.json** — business domain keywords

## Tech Stack

- Node.js / JavaScript
- Playwright (UI + API)
- MySQL (DB validation)
- Allure (reporting)
