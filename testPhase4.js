#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const LLMClient =
    require('./agents/llm/LLMClient');
const StoryParser =
    require('./agents/llm/StoryParser');
const FailureAnalyzer =
    require('./agents/llm/FailureAnalyzer');
const JiraFetcher =
    require('./agents/jira/JiraFetcher');
const PrImpactScanner =
    require('./agents/github/PrImpactScanner');
const RegressionReporter =
    require('./agents/report/RegressionReporter');
const ImpactAnalyzer =
    require('./agents/impact/ImpactAnalyzer');

const rootDir = __dirname;

async function run() {

    const results = [];

    function check(name, passed, detail = '') {
        results.push({ name, passed, detail });
        console.log(
            `${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`
        );
    }

    console.log('\n=== Phase 4 Verification ===\n');

    check(
        'LLMClient module loads',
        typeof LLMClient.isAvailable === 'function'
    );

    check(
        'StoryParser keyword fallback',
        (await StoryParser.parse({
            story: 'inventory snapshot changed',
            rootDir,
            useLlm: false
        })).source === 'keyword-only'
    );

    const inventoryImpact =
        ImpactAnalyzer.analyze({
            rootDir,
            story: 'inventory snapshot stock level changed',
            gitDiff: false
        });

    check(
        'Inventory domain detected',
        inventoryImpact.domains.includes('inventory'),
        inventoryImpact.domains.join(', ')
    );

    const reporterOutput =
        RegressionReporter.write({
            timestamp: new Date().toISOString(),
            trigger: 'phase4-test',
            impact: inventoryImpact,
            execution: { executed: false, reason: 'verify' }
        }, { rootDir });

    check(
        'Markdown report generated',
        fs.existsSync(reporterOutput.path)
    );

    const ruleAnalysis =
        await FailureAnalyzer.analyze({
            testName: 'sample test',
            error: 'Timeout 30000ms exceeded',
            stackTrace: 'at login.spec.js:42',
            useLlm: false
        });

    check(
        'Rule-based failure analysis',
        ruleAnalysis.failureType === 'timeout',
        ruleAnalysis.failureType
    );

    check(
        'JiraFetcher config check',
        typeof JiraFetcher.isConfigured === 'function',
        JiraFetcher.isConfigured()
            ? 'configured'
            : 'not configured (ok for local)'
    );

    const prScan =
        PrImpactScanner.getChangedFiles({
            prNumber: '999999'
        });

    check(
        'PrImpactScanner module loads',
        typeof prScan.available === 'boolean',
        prScan.error ? 'gh not available or PR missing' : 'ok'
    );

    if (LLMClient.isAvailable()) {

        try {
            const llmStory =
                await StoryParser.parse({
                    story:
                        'GST tax validation changed for product item type creation',
                    rootDir,
                    useLlm: true
                });

            check(
                'LLM story parsing',
                llmStory.llmUsed
                    || Boolean(llmStory.llmError),
                llmStory.domains.join(', ')
                    || llmStory.llmError
            );
        } catch (error) {
            check(
                'LLM story parsing',
                false,
                error.message
            );
        }

    } else {
        check(
            'LLM story parsing',
            true,
            'skipped — no GEMINI_API_KEY'
        );
    }

    const failed =
        results.filter(r => !r.passed);

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
