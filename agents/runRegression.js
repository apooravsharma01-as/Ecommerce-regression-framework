#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ImpactAnalyzer =
    require('./impact/ImpactAnalyzer');
const RegressionSelector =
    require('./selection/RegressionSelector');
const TestGenerator =
    require('./generator/TestGenerator');
const RegressionRunner =
    require('./execution/RegressionRunner');
const StoryParser =
    require('./llm/StoryParser');
const JiraFetcher =
    require('./jira/JiraFetcher');
const PrImpactScanner =
    require('./github/PrImpactScanner');
const RegressionReporter =
    require('./report/RegressionReporter');
const DiffAnalyzer =
    require('./analysis/DiffAnalyzer');
const PrCommenter =
    require('./github/PrCommenter');
const JiraReporter =
    require('./jira/JiraReporter');

function parseArgs(argv) {

    const options = {
        story: null,
        jira: null,
        pr: null,
        baseBranch: 'production',
        gitDiff: false,
        simulateFiles: [],
        execute: true,
        allure: true,
        llm: false,
        commentPr: true,
        commentJira: true
    };

    for (let i = 0; i < argv.length; i++) {

        if (argv[i] === '--story' && argv[i + 1]) {
            options.story = argv[++i];
        }

        if (argv[i] === '--jira' && argv[i + 1]) {
            options.jira = argv[++i];
        }

        if (argv[i] === '--pr' && argv[i + 1]) {
            options.pr = argv[++i];
        }

        if (argv[i] === '--base' && argv[i + 1]) {
            options.baseBranch = argv[++i];
        }

        if (argv[i] === '--git') {
            options.gitDiff = true;
        }

        if (argv[i] === '--simulate' && argv[i + 1]) {
            options.simulateFiles.push(argv[++i]);
        }

        if (argv[i] === '--no-run') {
            options.execute = false;
        }

        if (argv[i] === '--no-allure') {
            options.allure = false;
        }

        if (argv[i] === '--llm') {
            options.llm = true;
        }

        if (argv[i] === '--no-pr-comment') {
            options.commentPr = false;
        }

        if (argv[i] === '--no-jira-comment') {
            options.commentJira = false;
        }
    }

    return options;
}

function mergeTests(selection, generated) {

    const existing =
        selection.tests || [];

    const created =
        generated.generated || [];

    const existingUi =
        existing.filter(test =>
            test.includes('tests/ui')
            && !test.includes('generated')
        );

    const generatedSpecs =
        created.filter(file =>
            file.includes('.api.spec')
            || file.includes('.db.spec')
            || file.includes('.ui.spec')
        );

    if (generatedSpecs.length > 0) {

        const generatedUi =
            generatedSpecs.filter(f =>
                f.includes('.ui.spec')
            );

        const uiTests =
            generatedUi.length > 0
                ? generatedUi
                : existingUi;

        const apiDb =
            generatedSpecs.filter(f =>
                !f.includes('.ui.spec')
            );

        return [...new Set([
            ...uiTests,
            ...apiDb
        ])];
    }

    return [...new Set([
        ...existing,
        ...created
    ])];
}

function mergeDomains(impact, additionalDomains) {

    if (!additionalDomains?.length) {
        return impact;
    }

    impact.domains =
        [...new Set([
            ...impact.domains,
            ...additionalDomains
        ])].filter(d => d !== 'other');

    return impact;
}

async function resolveInputs(cliOptions, rootDir) {

    const resolved = {
        story: cliOptions.story,
        jira: null,
        pr: null,
        storyParsing: null,
        simulateFiles: [...cliOptions.simulateFiles]
    };

    if (cliOptions.jira) {

        console.log(
            `Fetching JIRA ticket: ${cliOptions.jira}\n`
        );

        resolved.jira =
            await JiraFetcher.fetch(cliOptions.jira);

        resolved.story =
            resolved.story
            || resolved.jira.storyText;

        console.log(
            'JIRA summary:',
            resolved.jira.summary
        );
    }

    if (cliOptions.pr) {

        console.log(
            `Fetching PR #${cliOptions.pr} changed files\n`
        );

        resolved.pr =
            PrImpactScanner.analyze({
                prNumber: cliOptions.pr
            });

        if (resolved.pr.changedFiles.length > 0) {
            resolved.simulateFiles.push(
                ...resolved.pr.changedFiles
            );
        } else {
            console.warn(
                'PR scan returned no files:',
                resolved.pr.error || 'empty diff'
            );
        }
    }

    if (resolved.story && cliOptions.llm) {

        console.log(
            'Enriching story with LLM parsing\n'
        );

        resolved.storyParsing =
            await StoryParser.parse({
                story: resolved.story,
                rootDir,
                useLlm: true
            });

        if (resolved.storyParsing.summary) {
            console.log(
                'LLM summary:',
                resolved.storyParsing.summary
            );
        }
    }

    return resolved;
}

async function main() {

    const rootDir =
        path.resolve(__dirname, '..');

    const cliOptions =
        parseArgs(process.argv.slice(2));

    if (
        !cliOptions.story
        && !cliOptions.jira
        && !cliOptions.pr
        && !cliOptions.gitDiff
        && cliOptions.simulateFiles.length === 0
    ) {
        console.error(
            'Usage: npm run regression -- --story "GST validation changed"\n' +
            '       npm run regression -- --jira PROJ-123\n' +
            '       npm run regression -- --pr 42 --llm\n' +
            '       npm run regression -- --git --simulate UniwareCore/.../ItemType.java\n' +
            '       npm run regression -- --story "inventory snapshot changed" --llm --no-run'
        );
        process.exit(1);
    }

    const inputs =
        await resolveInputs(cliOptions, rootDir);

    if (
        !inputs.story
        && !cliOptions.gitDiff
        && inputs.simulateFiles.length === 0
    ) {
        console.error(
            'No story, git diff, or changed files to analyze.'
        );
        process.exit(1);
    }

    console.log('\n=== Step 1: Diff Analysis ===\n');

    const fetchedDiff =
        DiffAnalyzer.fetchDiff({
            prNumber: cliOptions.pr,
            simulateFiles: inputs.simulateFiles,
            gitDiff: cliOptions.gitDiff,
            repo: inputs.pr?.repo
        });

    const diffFromContent =
        DiffAnalyzer.analyze(
            fetchedDiff.diffContent,
            fetchedDiff.changedFiles
        );

    const diffFromStory =
        inputs.story
            ? DiffAnalyzer.analyzeFromStory(inputs.story)
            : { signals: [] };

    const diffAnalysis =
        DiffAnalyzer.merge(
            diffFromContent,
            diffFromStory
        );

    console.log('Diff source:', fetchedDiff.source);
    console.log('Signals:', diffAnalysis.signals.join(', ') || 'none');
    console.log('Validation change:', diffAnalysis.hasValidationChange);

    console.log('\n=== Step 2: Impact Analysis ===\n');

    const impact =
        ImpactAnalyzer.analyze({
            rootDir,
            story: inputs.story,
            baseBranch: cliOptions.baseBranch,
            gitDiff: cliOptions.gitDiff,
            simulateChangedFiles: inputs.simulateFiles,
            additionalDomains:
                inputs.storyParsing?.domains || []
        });

    impact.diffAnalysis = diffAnalysis;

    console.log('Trigger:', impact.trigger);
    console.log('Domains:', impact.domains.join(', ') || 'none');
    console.log('Changed files:', impact.changedFiles.length);
    console.log('Selected:', impact.selectedTests.length, 'existing tests');

    console.log('\n=== Step 3: Scenario Test Generation ===\n');

    const generated =
        TestGenerator.generate(impact, {
            rootDir,
            diffAnalysis,
            story: inputs.story
        });

    console.log('Generated:', generated.generated.length, 'new specs');
    generated.generated.forEach(file => {
        console.log('  -', file);
    });

    generated.manifest.domains.forEach(domain => {
        if (!domain.scenarios) {
            return;
        }

        Object.entries(domain.scenarios).forEach(([layer, summary]) => {
            console.log(
                `  ${domain.domain}.${layer}: ${summary.positive} pos / ${summary.negative} neg / ${summary.edge} edge`
            );
        });
    });

    console.log('\n=== Step 4: Regression Selection ===\n');

    const selection =
        RegressionSelector.select(impact);

    const allTests =
        mergeTests(selection, generated);

    console.log('Total tests to run:', allTests.length);
    allTests.forEach(file => {
        console.log('  -', file);
    });

    const report = {
        timestamp: new Date().toISOString(),
        trigger: impact.trigger,
        jira: inputs.jira,
        pr: inputs.pr,
        storyParsing: inputs.storyParsing,
        diffAnalysis,
        impact,
        selection,
        generation: generated.manifest,
        execution: null,
        allure: null,
        tests: allTests
    };

    if (cliOptions.execute) {

        console.log('\n=== Step 5: Test Execution ===\n');

        const result =
            RegressionRunner.run(allTests, {
                rootDir,
                env: {
                    ENABLE_AI_FAILURE_ANALYSIS:
                        cliOptions.llm
                            ? 'true'
                            : 'false'
                }
            });

        report.execution = result;

        if (result.passed) {
            console.log('\n✅ All tests passed\n');
        } else {
            console.log('\n❌ Some tests failed\n');
        }

    } else {

        report.execution = {
            executed: false,
            reason: '--no-run flag'
        };
    }

    if (cliOptions.allure && cliOptions.execute) {

        console.log('=== Step 6: Allure Report ===\n');

        RegressionRunner.attachImpactReport(report, { rootDir });

        const allure =
            RegressionRunner.generateAllureReport({ rootDir });

        report.allure = allure;

        if (allure.generated) {
            console.log('Allure report:', allure.reportPath);
        }
    }

    console.log('=== Step 7: Markdown Report ===\n');

    const markdownReport =
        RegressionReporter.write(report, { rootDir });

    console.log('Markdown report:', markdownReport.path);

    if (
        cliOptions.commentPr
        && cliOptions.pr
    ) {
        console.log('\n=== Step 8: GitHub PR Comment ===\n');

        const prComment =
            PrCommenter.postComment(report, {
                rootDir,
                prNumber: cliOptions.pr,
                repo: inputs.pr?.repo
            });

        report.prComment = prComment;

        if (prComment.posted) {
            console.log(
                'PR comment posted on #',
                prComment.prNumber
            );
        } else {
            console.warn(
                'PR comment skipped:',
                prComment.reason || prComment.error
            );
        }
    }

    if (
        cliOptions.commentJira
        && cliOptions.jira
    ) {
        console.log('\n=== Step 9: JIRA Comment ===\n');

        const jiraComment =
            await JiraReporter.postComment(
                cliOptions.jira,
                report
            );

        report.jiraComment = jiraComment;

        if (jiraComment.posted) {
            console.log(
                'JIRA comment posted on',
                jiraComment.issueKey
            );
        } else {
            console.warn(
                'JIRA comment skipped:',
                jiraComment.reason || jiraComment.error
            );
        }
    }

    const cacheDir =
        path.join(rootDir, '.cache');

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(cacheDir, 'regression-report.json'),
        JSON.stringify(report, null, 2)
    );

    if (!report.execution?.passed && cliOptions.execute) {
        process.exit(1);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
