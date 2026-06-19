#!/usr/bin/env node
/**
 * One-time helper: merge UAT DB vars into .env (no secrets printed).
 * Run: npm run db:setup
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const examplePath = path.join(rootDir, '.env.uat.example');

function ask(question) {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {

    console.log('\n=== UAT DB setup (jb-style) ===\n');
    console.log('This wires Playwright to StgUat MySQL through a local tunnel.');
    console.log('Same as jb → gg StgUat → mysqlu, but for automated tests.\n');

    let envContent =
        fs.existsSync(envPath)
            ? fs.readFileSync(envPath, 'utf8')
            : '';

    const example =
        fs.existsSync(examplePath)
            ? fs.readFileSync(examplePath, 'utf8')
            : '';

    const linesToAdd = [];

    const maybeAdd = (key, value) => {
        if (new RegExp(`^${key}=`, 'm').test(envContent)) {
            return;
        }
        linesToAdd.push(`${key}=${value}`);
    };

    maybeAdd('UAT_SSH_USER', 'apoorav.sharma01');
    maybeAdd('DB_USE_UAT', 'true');
    maybeAdd('UAT_DB_HOST', '127.0.0.1');
    maybeAdd('UAT_DB_PORT', '3307');
    maybeAdd('UAT_DB_USER', 'root');
    maybeAdd('UAT_DB_PASSWORD', 'uniware');
    maybeAdd('UAT_DB_NAME', 'uniware');

    if (!/^UAT_JUMPBOX_PASSWORD=/m.test(envContent)) {
        const pw = await ask(
            'Jumpbox password (same as jb): '
        );

        if (pw) {
            linesToAdd.push(`UAT_JUMPBOX_PASSWORD=${pw}`);
        } else {
            console.log(
                '\nSkipped password — add UAT_JUMPBOX_PASSWORD to .env manually.'
            );
        }
    }

    if (linesToAdd.length === 0) {
        console.log('\n.env already has UAT settings.\n');
    } else {
        const block =
            '\n# UAT DB tunnel (npm run db:tunnel)\n'
            + linesToAdd.join('\n')
            + '\n';

        fs.writeFileSync(
            envPath,
            envContent.trimEnd() + block,
            'utf8'
        );

        console.log('\nUpdated .env with UAT DB settings.\n');
    }

    console.log('Next steps:');
    console.log('  1. Terminal A: npm run db:tunnel   (keep open)');
    console.log('  2. Terminal B: npm run db:diagnose');
    console.log('  3. npm run regression -- --story "sale order impacted"\n');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
