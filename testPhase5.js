#!/usr/bin/env node

const DiffAnalyzer =
    require('./agents/analysis/DiffAnalyzer');
const ScenarioSelector =
    require('./agents/generator/ScenarioSelector');
const PrCommenter =
    require('./agents/github/PrCommenter');
const JiraReporter =
    require('./agents/jira/JiraReporter');
const TestGenerator =
    require('./agents/generator/TestGenerator');
const ImpactAnalyzer =
    require('./agents/impact/ImpactAnalyzer');

const rootDir = __dirname;

function check(results, name, passed, detail = '') {
    results.push({ name, passed, detail });
    console.log(
        `${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`
    );
}

async function run() {

    const results = [];

    console.log('\n=== Phase 5 Verification ===\n');

    const simulatedDiff =
        DiffAnalyzer.buildSimulatedDiff([
            'UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java'
        ]);

    const diffAnalysis =
        DiffAnalyzer.analyze(
            simulatedDiff,
            ['UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java']
        );

    check(
        results,
        'DiffAnalyzer detects GST/validation signals',
        diffAnalysis.hasGstChange
            && diffAnalysis.hasValidationChange,
        diffAnalysis.signals.join(', ')
    );

    const productScenarios =
        ScenarioSelector.select({
            domain: 'product-creation',
            layer: 'api',
            diffAnalysis,
            story: 'GST validation changed for product creation'
        });

    check(
        results,
        'Product scenarios include positive + negative',
        productScenarios.some(s => s.type === 'positive')
            && productScenarios.some(s => s.type === 'negative'),
        `${productScenarios.length} scenarios`
    );

    check(
        results,
        'Product scenarios include edge case',
        productScenarios.some(s => s.type === 'edge')
    );

    const impact =
        ImpactAnalyzer.analyze({
            rootDir,
            story: 'GST validation changed for product creation',
            simulateChangedFiles: [
                'UniwareCore/src/main/java/com/uniware/core/entity/ItemType.java'
            ]
        });

    impact.diffAnalysis = diffAnalysis;

    const generated =
        TestGenerator.generate(impact, {
            rootDir,
            diffAnalysis,
            story: impact.trigger
        });

    const apiSpec =
        generated.generated.find(file =>
            file.includes('product-creation.api.spec')
        );

    check(
        results,
        'Generated product API spec with scenarios',
        Boolean(apiSpec),
        apiSpec || 'missing'
    );

    const summary =
        generated.manifest.domains
            .find(domain => domain.domain === 'product-creation')
            ?.scenarios?.api;

    check(
        results,
        'Manifest tracks scenario counts',
        summary
            && summary.negative > 0
            && summary.positive > 0,
        summary
            ? `${summary.positive}/${summary.negative}/${summary.edge}`
            : 'no summary'
    );

    const prComment =
        PrCommenter.buildComment({
            trigger: 'GST validation changed',
            diffAnalysis,
            impact,
            tests: generated.generated,
            generation: generated.manifest,
            execution: {
                executed: true,
                passed: true,
                durationMs: 1200
            }
        });

    check(
        results,
        'PR comment builder includes diff signals',
        prComment.includes('Diff signals')
            && prComment.includes('Regression Agent Report')
    );

    const jiraComment =
        JiraReporter.buildComment({
            trigger: 'GST validation changed',
            diffAnalysis,
            impact,
            tests: generated.generated,
            generation: generated.manifest,
            execution: { executed: true, passed: true }
        });

    check(
        results,
        'JIRA comment builder includes scenario summary',
        jiraComment.includes('Generated scenarios')
            || jiraComment.includes('Domains:')
    );

    const failed =
        results.filter(item => !item.passed);

    console.log(
        `\n${results.length - failed.length}/${results.length} checks passed\n`
    );

    if (failed.length > 0) {
        process.exit(1);
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
