#!/usr/bin/env node
/**
 * Shows why DB tests skip/fail and what to fix.
 * Run: npm run db:diagnose
 */

require('dotenv').config();

const DbVerify = require('../database/DbVerify');
const { DbConnection } = require('../database/DbConnection');

async function main() {

    const cfg = DbConnection.resolveConfig();
    const apiHost = DbVerify.getApiHost();
    const dbTarget = DbVerify.getTargetLabel();
    const mismatch = DbVerify.hasApiDbMismatch();

    console.log('\n=== DB vs API diagnosis ===\n');
    console.log('API (orders created here):', apiHost || 'unknown');
    console.log('DB (tests query here):    ', dbTarget);
    console.log('Mismatch detected:        ', mismatch ? 'YES' : 'no');
    console.log('DB_USE_UAT:               ', process.env.DB_USE_UAT || '(not set)');
    console.log('DB_SKIP_VERIFY:           ', process.env.DB_SKIP_VERIFY || '(not set)');

    if (mismatch) {
        console.log('\nWhy DB tests fail/skip:');
        console.log(' ', DbVerify.getMismatchReason());
        console.log('\nYour SSH mysql session (jb → gg StgUat → mysqlu) is on UAT.');
        console.log('Playwright on your Mac does NOT use that session.');
        console.log('Use the jb-style tunnel instead:\n');
        console.log('Steps:');
        console.log('  1. npm run db:setup     (add UAT_JUMPBOX_PASSWORD + DB_USE_UAT to .env)');
        console.log('  2. npm run db:tunnel    (keep open — uses same login as jb)');
        console.log('  3. npm run db:diagnose  (should show Mismatch: no)');
        console.log('  4. npm run regression -- --story "sale order impacted"\n');
        return;
    }

    try {
        const conn = await DbConnection.getConnection();
        const [rows] = await conn.query(
            'SELECT COUNT(*) AS c FROM sale_order'
        );
        console.log('\nDB connection: OK');
        console.log('sale_order rows: ', rows[0].c);
        await conn.end();
        console.log('\nDB tests should pass if API creates orders on the same environment.\n');
    } catch (err) {
        console.log('\nDB connection FAILED:', err.message);
        console.log('Fix credentials or start the SSH tunnel first.\n');
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
