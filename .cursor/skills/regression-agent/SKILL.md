---
name: regression-agent
description: >-
  Operates the Uniware STGUAT regression framework — story/impact analysis,
  Playwright test generation, API+DB proof, dashboard evidence, cancellation
  flows, UAT DB tunnel. Use when working on regression runs, impactMap,
  scenarios, EvidenceLogger, allureService, dashboard, sale-order cancellation,
  dispatch/manifest, or npm run regression / db:tunnel / dashboard.
---

# Regression Agent (Uniware STGUAT)

## What this skill is

Static instructions for Cursor. It does **not** auto-learn from runs by itself.
It gets better when you (or the agent) **update this skill** and
`lessons-learned.md` after each real fix or demo.

## Pipeline (do not skip steps)

```
Story / JIRA / PR
  → ImpactAnalyzer (config/impactMap.json + StoryKeywordEnricher)
  → TestGenerator → tests/generated/regression/*.spec.js
  → RegressionRunner (Playwright + Allure)
  → .cache/regression-report.json + evidence-live.jsonl
  → Dashboard (Live Evidence Feed + Test Walkthrough)
```

Entry: `agents/runRegression.js`  
Commands: `npm run regression`, `npm run regression:analyze`, `npm run dashboard`, `npm run db:tunnel`, `npm run db:diagnose`

## Full run vs analyze-only

| Mode | Command | Tests execute | API/DB evidence |
|------|---------|---------------|-----------------|
| **Full regression** | dashboard "Run" or `npm run regression -- --story "..."` | Yes | Fresh |
| **Analyze only** | `regression:analyze` or dashboard "Analyze" | No | Stale (previous run) |

Never claim proof passed after analyze-only. Dashboard shows `evidenceStale` when report is newer than last execution.

## UAT environment

- API: `BASE_URL=https://stguat.unicommerce.info`
- DB: API writes UAT; tests read via tunnel — **not** local empty MySQL on 3306
- Before DB tests: `npm run db:tunnel` (keep open), `DB_USE_UAT=true`, tunnel on `127.0.0.1:3307`
- Verify: `npm run db:diagnose` (mismatch=no, sale_order rows > 0)

## Proof rules (non-negotiable)

1. **API**: HTTP 200 ≠ pass. Uniware uses `successful: true/false` in body. Use `utils/ApiAssertions.js`.
2. **DB**: `0 rows` ≠ pass when `verification: 'row-required'`. Use `database/DbVerify.js`.
3. **Negative tests**: Pass when API **rejects** (`successful: false` or 4xx).
4. **Evidence**: `utils/EvidenceLogger.js` → `.cache/evidence-live.jsonl`; server merges in `server/allureService.js`.

## Adding a new story domain

1. `config/impactMap.json` — keywords, tables, endpoints
2. `agents/story/StoryKeywordEnricher.js` — story domain signals
3. `agents/generator/scenarios/<domain>.js` — api/db scenario definitions
4. `agents/generator/ScenarioSelector.js` — register in `DOMAIN_SCENARIOS`
5. `agents/generator/TestGenerator.js` — `LAYER_IMPORTS` + `LAYER_DESCRIBE`
6. Regenerate: `npm run regression:analyze -- --story "..."`
7. Full run with tunnel open

## Cancellation story (UN-15893 pattern)

Story: accepting cancellation at RTS and Manifested.

- Use **real** UAT fixtures via `ShippingPackageQueries.findFixtureByStatus` or env:
  - `TEST_RTS_PACKAGE_CODE`
  - `TEST_MANIFESTED_PACKAGE_CODE`
  - `TEST_DISPATCHED_PACKAGE_CODE`
- Channel cancel: `POST /data/oms/saleOrder/status/update` via `OrderLifecycleHelper.cancelViaChannelSync`
- Assert: RTS + `putaway_pending`, items `CANCELLED`, manifest item removed, dispatched = no-op
- Do **not** use fake `SHIPPINGPACKAGECODE_${Date.now()}` for positive dispatch/cancel proof

Key files: `utils/OrderLifecycleHelper.js`, `agents/generator/scenarios/sale-order-cancellation.js`

## Dashboard

- Start: `npm run dashboard` → http://localhost:5173
- After server/UI changes: restart dashboard + hard refresh (Cmd+Shift+R)
- Panels: Live Evidence Feed (raw req/res), **Test Walkthrough** (why/how/result per scenario)
- Evidence API: `/api/evidence/summary?live=1` (1.5s cache when live)

## How this skill improves over time

**Automatic loop** (no manual edits required):

```
Run fails or shows bad proof
  → RegressionMemory.learnFromRun()  (agents/memory/)
  → config/regression-memory.json    (occurrences++)
  → lessons-learned.md auto-synced

Next run
  → RegressionMemory.runPreflight()  (Step 4b)
  → BLOCKS or WARNS before repeating same mistake
```

Read `config/regression-memory.json` when debugging. Each lesson has `neverAgain` + `fix`.

**Manual layer:** append to `lessons-manual.md` for notes the auto-detector cannot infer.

Skills alone do not auto-learn; **RegressionMemory** does.

## When stuck

1. `npm run db:diagnose`
2. Read `.cache/regression-report.json` → `execution`, `generation.domains`
3. Grep `.cache/evidence-live.jsonl` for api/db entries
4. Read `lessons-learned.md` in this folder

## Additional resources

- `lessons-learned.md` — cumulative fixes and gotchas
- `docs/ARCHITECTURE.md` — component map
- `README.md` — setup and commands
