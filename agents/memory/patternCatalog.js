/**
 * Catalog of known regression mistakes and how to detect/prevent them.
 * Each entry gets reinforced when seen again; preflight blocks repeats.
 */

module.exports = [
    {
        id: 'uat-db-api-split',
        patterns: {
            failureText: [
                'db row not found',
                '0 rows',
                'rowsfound',
                'api/db mismatch',
                'skipifapidbmismatch'
            ],
            env: () =>
                process.env.DB_USE_UAT !== 'true'
                && (process.env.BASE_URL || '').includes('stguat')
        },
        symptom:
            'API writes to STGUAT but DB queries local MySQL — 0 rows or mismatch.',
        fix:
            'Set DB_USE_UAT=true, run npm run db:tunnel, verify with npm run db:diagnose.',
        neverAgain:
            'Never run UAT API tests against local DB without tunnel.',
        preflight: ['dbUatConfig', 'dbPing']
    },
    {
        id: 'api-http-200-only',
        patterns: {
            failureText: [
                'successful',
                'successful:false',
                'business outcome'
            ],
            specContent: [
                'toBeLessThan(500)',
                "status()).toBe(200)"
            ],
            specAntiPattern: (content) =>
                content.includes('toBeLessThan(500)')
                && !content.includes('ApiAssertions')
        },
        symptom:
            'Test treated HTTP 200 as pass while Uniware returned successful:false.',
        fix:
            'Use ApiAssertions.assertPositiveResponse / assertNegativeResponse.',
        neverAgain:
            'Never assert only HTTP status for Uniware OMS APIs.',
        preflight: ['scanSpecsForHttpOnly']
    },
    {
        id: 'db-zero-rows-as-pass',
        patterns: {
            failureText: [
                'row not found',
                'row-required',
                'rowsfound',
                '0 row'
            ],
            evidence: (item) =>
                item.type === 'db'
                && item.verification === 'row-required'
                && (item.rowsFound ?? item.record?.rowsFound) === 0
        },
        symptom:
            'DB check passed or ignored when 0 rows returned for row-required.',
        fix:
            'Use DbVerify.assertRowFound and verification row-required.',
        neverAgain:
            'Never treat 0 DB rows as passed when a real record is required.',
        preflight: ['scanSpecsForWeakDb']
    },
    {
        id: 'fake-shipping-package-code',
        patterns: {
            failureText: [
                'shippingpackagecode_',
                'invalid package',
                'package not found'
            ],
            specContent: [
                'SHIPPINGPACKAGECODE_'
            ],
            evidence: (item) =>
                item.type === 'api'
                && JSON.stringify(item.request || {})
                    .includes('SHIPPINGPACKAGECODE_')
        },
        symptom:
            'Dispatch/cancel tests used fabricated SHIPPINGPACKAGECODE_* IDs.',
        fix:
            'Use ShippingPackageQueries.findFixtureByStatus or TEST_RTS_PACKAGE_CODE.',
        neverAgain:
            'Never use SHIPPINGPACKAGECODE_ + Date.now() for positive proof tests.',
        preflight: ['scanSpecsForFakePackageCodes']
    },
    {
        id: 'missing-rts-manifest-fixture',
        patterns: {
            failureText: [
                'no ready_to_ship',
                'no manifested',
                'no dispatched',
                'test_rts_package_code',
                'requirefixture'
            ]
        },
        symptom:
            'Cancellation tests failed — no RTS/manifest/dispatched package in UAT DB.',
        fix:
            'Set TEST_RTS_PACKAGE_CODE / TEST_MANIFESTED_PACKAGE_CODE in .env or seed UAT data.',
        neverAgain:
            'Never run cancellation positive tests without a real lifecycle fixture.',
        preflight: ['cancellationFixtureHint']
    },
    {
        id: 'analyze-only-stale-proof',
        patterns: {
            report: (report) =>
                report?.execution?.executed === false
                && report?.execution?.reason?.includes('no-run')
        },
        symptom:
            'Report regenerated without executing tests — evidence is stale.',
        fix:
            'Run full regression (not Analyze Only) for API/DB proof.',
        neverAgain:
            'Never claim pass/fail from analyze-only runs.',
        preflight: []
    },
    {
        id: 'db-tunnel-down',
        patterns: {
            failureText: [
                'econnrefused',
                'connect econnrefused',
                'cannot connect',
                'tunnel'
            ]
        },
        symptom:
            'DB connection refused — UAT tunnel not running.',
        fix:
            'Run npm run db:tunnel in a separate terminal before regression.',
        neverAgain:
            'Never start DB tests without an open UAT tunnel when DB_USE_UAT=true.',
        preflight: ['dbPing']
    },
    {
        id: 'pending-verification-as-rts',
        patterns: {
            failureText: [
                'pending_verification',
                'not cancellable at rts'
            ]
        },
        symptom:
            'Fresh API-created orders are PENDING_VERIFICATION — not RTS/manifest.',
        fix:
            'Use OrderLifecycleHelper fixtures for cancellation; create order only for negative lifecycle check.',
        neverAgain:
            'Never expect channel cancel at RTS on a freshly created API order.',
        preflight: []
    }
];
