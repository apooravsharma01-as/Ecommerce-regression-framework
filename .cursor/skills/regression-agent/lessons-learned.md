# Lessons learned (append-only)

> Auto-synced from `config/regression-memory.json` after each run.
> Lessons with occurrences > 0 block or warn on the next preflight.

---

## 2026-06-16 — api-http-200-only (×2)
- Symptom: Test treated HTTP 200 as pass while Uniware returned successful:false.
- Fix: Use ApiAssertions.assertPositiveResponse / assertNegativeResponse.
- Never again: Never assert only HTTP status for Uniware OMS APIs.
- Last trigger: Accepting Cancellation on Ready to Ship and Manifested State
## 2026-06-16 — fake-shipping-package-code (×2)
- Symptom: Dispatch/cancel tests used fabricated SHIPPINGPACKAGECODE_* IDs.
- Fix: Use ShippingPackageQueries.findFixtureByStatus or TEST_RTS_PACKAGE_CODE.
- Never again: Never use SHIPPINGPACKAGECODE_ + Date.now() for positive proof tests.
- Last trigger: Accepting Cancellation on Ready to Ship and Manifested State
## 2026-06-16 — analyze-only-stale-proof (×2)
- Symptom: Report regenerated without executing tests — evidence is stale.
- Fix: Run full regression (not Analyze Only) for API/DB proof.
- Never again: Never claim pass/fail from analyze-only runs.
- Last trigger: Accepting Cancellation on Ready to Ship and Manifested State
## 2026-06-16 — uat-db-api-split (×1)
- Symptom: API writes to STGUAT but DB queries local MySQL — 0 rows or mismatch.
- Fix: Set DB_USE_UAT=true, run npm run db:tunnel, verify with npm run db:diagnose.
- Never again: Never run UAT API tests against local DB without tunnel.
- Last trigger: project bootstrap
## 2026-06-16 — db-zero-rows-as-pass (×1)
- Symptom: DB check passed or ignored when 0 rows returned for row-required.
- Fix: Use DbVerify.assertRowFound and verification row-required.
- Never again: Never treat 0 DB rows as passed when a real record is required.
- Last trigger: project bootstrap
## 2026-06-16 — missing-rts-manifest-fixture (×1)
- Symptom: Cancellation tests failed — no RTS/manifest/dispatched package in UAT DB.
- Fix: Set TEST_RTS_PACKAGE_CODE / TEST_MANIFESTED_PACKAGE_CODE in .env or seed UAT data.
- Never again: Never run cancellation positive tests without a real lifecycle fixture.
- Last trigger: project bootstrap