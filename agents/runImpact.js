#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ImpactAnalyzer =
    require('./impact/ImpactAnalyzer');
const RegressionSelector =
    require('./selection/RegressionSelector');
const DependencyScanner =
    require('./dependency/DependencyScanner');
const UniwareSourceTracer =
    require('./uniware/UniwareSourceTracer');

function parseArgs(argv) {

    const options = {
        story: null,
        baseBranch: 'production',
        gitDiff: false,
        scanOnly: false
    };

    for (let i = 0; i < argv.length; i++) {

        if (argv[i] === '--story' && argv[i + 1]) {
            options.story = argv[++i];
        }

        if (argv[i] === '--base' && argv[i + 1]) {
            options.baseBranch = argv[++i];
        }

        if (argv[i] === '--no-git') {
            options.gitDiff = false;
        }

        if (argv[i] === '--scan-only') {
            options.scanOnly = true;
        }
    }

    return options;
}

function main() {

    const rootDir =
        path.resolve(__dirname, '..');

    const cliOptions =
        parseArgs(process.argv.slice(2));

    if (cliOptions.scanOnly) {

        const graph =
            DependencyScanner.buildGraph(rootDir);

        const uniware =
            UniwareSourceTracer.trace();

        const output = {
            framework: {
                nodes: graph.nodes.length,
                edges: graph.edges.length,
                graph
            },
            uniware: {
                available: uniware.available,
                path: uniware.path,
                endpointCount: uniware.endpoints.length,
                entityCount: uniware.entities.length,
                domains: uniware.domains
            }
        };

        console.log(
            JSON.stringify(output, null, 2)
        );

        return;
    }

    if (!cliOptions.story && !cliOptions.gitDiff) {
        console.error(
            'Usage: node agents/runImpact.js --story "GST validation changed"\n' +
            '       node agents/runImpact.js --base main\n' +
            '       node agents/runImpact.js --scan-only'
        );
        process.exit(1);
    }

    const impact =
        ImpactAnalyzer.analyze({
            rootDir,
            story: cliOptions.story,
            baseBranch: cliOptions.baseBranch,
            gitDiff: cliOptions.gitDiff
        });

    const selection =
        RegressionSelector.select(impact);

    const report = {
        impact,
        selection
    };

    const reportDir =
        path.join(rootDir, '.cache');

    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(reportDir, 'impact-report.json'),
        JSON.stringify(report, null, 2)
    );

    console.log(
        JSON.stringify(report, null, 2)
    );
}

main();
