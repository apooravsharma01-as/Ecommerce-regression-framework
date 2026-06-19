#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FlowScaffold =
    require('./agents/scaffold/FlowScaffold');
const TestGenerator =
    require('./agents/generator/TestGenerator');

const rootDir = process.cwd();

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {

    const story =
        'Dispatch flow changed for shipment manifest and RTS handover';

    const result =
        FlowScaffold.scaffoldFromStory(story, {
            rootDir,
            existingDomains: ['sale-order']
        });

    assert(
        result.scaffolded,
        `Expected scaffold success, got: ${result.reason}`
    );

    assert(
        result.domains.includes('dispatch')
            || result.domains.includes('shipment'),
        `Expected dispatch/shipment domain, got: ${result.domains.join(', ')}`
    );

    const flow =
        result.flows.find(item =>
            item.id === 'dispatch'
            || item.id === 'shipment'
        );

    assert(flow, 'Expected at least one scaffolded flow object');
    assert(flow.files.api, 'API file missing');
    assert(flow.files.db, 'DB file missing');
    assert(flow.files.page, 'Page file missing');
    assert(flow.files.scenarios, 'Scenario file missing');

    for (const file of Object.values(flow.files)) {
        assert(
            fs.existsSync(path.join(rootDir, file)),
            `Missing generated file: ${file}`
        );
    }

    const impact = FlowScaffold.enrichImpact(
        {
            domains: ['sale-order'],
            endpoints: [],
            tables: [],
            impactedAPI: [],
            impactedDB: [],
            impactedUI: []
        },
        result
    );

    assert(
        impact.domains.includes(flow.id),
        'Impact enrichment failed to add scaffold domain'
    );

    const generated =
        TestGenerator.generate(
            {
                domains: [flow.id],
                trigger: story,
                impactedAPI: [flow.files.api],
                impactedDB: [flow.files.db],
                impactedUI: [flow.files.page],
                endpoints: flow.endpoints,
                tables: flow.tables
            },
            { story, rootDir }
        );

    assert(
        generated.generated.length > 0,
        'TestGenerator did not create scaffolded specs'
    );

    console.log('✅ Scaffold flow:', flow.id);
    console.log('✅ API:', flow.files.api);
    console.log('✅ DB:', flow.files.db);
    console.log('✅ UI:', flow.files.page);
    console.log('✅ Scenarios:', flow.files.scenarios);
    console.log('✅ Generated specs:', generated.generated.join(', '));
    console.log('\n=== Scaffold pipeline OK ===\n');
}

main().catch(error => {
    console.error('❌', error.message);
    process.exit(1);
});
