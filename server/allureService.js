const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AllureService {

    static getPaths(rootDir) {

        return {
            results:
                path.join(rootDir, 'allure-results'),
            report:
                path.join(rootDir, 'allure-report'),
            testResults:
                path.join(rootDir, 'test-results')
        };
    }

    static classifyLayer(testPath = '', testName = '') {

        const text =
            `${testPath} ${testName}`.toLowerCase();

        if (
            text.includes('tests/ui')
            || text.includes('.ui.spec')
            || text.includes('login.spec')
        ) {
            return 'ui';
        }

        if (
            text.includes('tests/db')
            || text.includes('.db.spec')
            || text.includes('queries')
            || testName.toLowerCase().includes('db -')
        ) {
            return 'db';
        }

        if (
            text.includes('tests/api')
            || text.includes('.api.spec')
            || testName.toLowerCase().includes('api -')
            || testName.toLowerCase().startsWith('positive -')
            || testName.toLowerCase().startsWith('negative -')
            || testName.toLowerCase().startsWith('edge -')
        ) {
            return 'api';
        }

        return 'other';
    }

    static parseAllureResults(rootDir) {

        const { results: resultsDir } =
            this.getPaths(rootDir);

        if (!fs.existsSync(resultsDir)) {
            return [];
        }

        const files =
            fs.readdirSync(resultsDir)
                .filter(file =>
                    file.endsWith('-result.json')
                );

        const parsed = [];

        for (const file of files) {

            try {

                const data =
                    JSON.parse(
                        fs.readFileSync(
                            path.join(resultsDir, file),
                            'utf8'
                        )
                    );

                const suite =
                    data.labels?.find(label =>
                        label.name === 'suite'
                    )?.value || '';

                const fullName =
                    data.fullName || data.name || '';

                const layer =
                    this.classifyLayer(
                        `${suite} ${fullName}`,
                        data.name || ''
                    );

                const attachments =
                    (data.attachments || []).map(att => ({
                        name: att.name,
                        type: att.type,
                        source: att.source,
                        url:
                            att.source
                                ? `/api/allure/files/${att.source}`
                                : null
                    }));

                parsed.push({
                    uuid: data.uuid,
                    name: data.name,
                    status: data.status,
                    fullName,
                    suite,
                    layer,
                    start: data.start || 0,
                    stop: data.stop || 0,
                    attachments,
                    error:
                        data.statusDetails?.message || null
                });

            } catch {
                continue;
            }
        }

        const latestByName =
            new Map();

        for (const item of parsed.sort((a, b) => b.start - a.start)) {
            const key =
                item.fullName || item.name;

            if (!latestByName.has(key)) {
                latestByName.set(key, item);
            }
        }

        return [...latestByName.values()];
    }

    static collectPlaywrightArtifacts(rootDir) {

        const { testResults } =
            this.getPaths(rootDir);

        const screenshots = [];
        const videos = [];

        if (!fs.existsSync(testResults)) {
            return { screenshots, videos };
        }

        const walk = (dir) => {

            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

                const fullPath =
                    path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    walk(fullPath);
                    continue;
                }

                const relative =
                    path.relative(testResults, fullPath);

                if (entry.name.endsWith('.png')) {
                    screenshots.push({
                        name: relative,
                        url: `/api/evidence/files/${relative}`,
                        folder: path.basename(path.dirname(fullPath))
                    });
                }

                if (entry.name.endsWith('.webm')) {
                    videos.push({
                        name: relative,
                        url: `/api/evidence/files/${relative}`,
                        folder: path.basename(path.dirname(fullPath))
                    });
                }
            }
        };

        walk(testResults);

        const allureTests =
            this.parseAllureResults(rootDir);

        for (const test of allureTests) {

            if (test.layer !== 'ui') {
                continue;
            }

            for (const att of test.attachments) {

                if (
                    att.source?.endsWith('.png')
                    && att.url
                ) {
                    screenshots.push({
                        name: att.name || att.source,
                        url: att.url,
                        folder: test.name
                    });
                }

                if (
                    att.source?.endsWith('.webm')
                    && att.url
                ) {
                    videos.push({
                        name: att.name || att.source,
                        url: att.url,
                        folder: test.name
                    });
                }
            }
        }

        return {
            screenshots: screenshots.slice(-12),
            videos: videos.slice(-6)
        };
    }

    static buildScenarioSummary(report = {}) {

        const scenarios = [];

        for (const domain of report.generation?.domains || []) {

            if (!domain.scenarios) {
                continue;
            }

            for (const [layer, summary] of Object.entries(domain.scenarios)) {

                for (const scenario of summary.scenarios || []) {
                    scenarios.push({
                        domain: domain.domain,
                        layer,
                        id: scenario.id,
                        type: scenario.type
                    });
                }

                if (!summary.scenarios?.length) {
                    scenarios.push({
                        domain: domain.domain,
                        layer,
                        id: `${domain.domain}-${layer}-core`,
                        type: 'core',
                        counts: {
                            positive: summary.positive,
                            negative: summary.negative,
                            edge: summary.edge
                        }
                    });
                }
            }
        }

        return scenarios;
    }

    static buildEvidenceSummary(rootDir, report = null) {

        const reportData =
            report
            || this.readLatestReport(rootDir);

        const tests =
            this.parseAllureResults(rootDir);

        const layers = {
            ui: [],
            api: [],
            db: [],
            other: []
        };

        for (const test of tests) {
            layers[test.layer]?.push(test);
        }

        const layerStats = {};

        for (const [layer, items] of Object.entries(layers)) {
            layerStats[layer] = {
                total: items.length,
                passed:
                    items.filter(t => t.status === 'passed').length,
                failed:
                    items.filter(t => t.status === 'failed').length,
                broken:
                    items.filter(t => t.status === 'broken').length,
                tests: items
            };
        }

        const artifacts =
            this.collectPlaywrightArtifacts(rootDir);

        const { report: reportDir } =
            this.getPaths(rootDir);

        const reportExists =
            fs.existsSync(
                path.join(reportDir, 'index.html')
            );

        return {
            reportExists,
            allureReportUrl: '/reports/allure/index.html',
            regressionReport: reportData,
            diffSignals:
                reportData?.diffAnalysis?.signals || [],
            scenariosConsidered:
                this.buildScenarioSummary(reportData),
            selectedTests:
                reportData?.tests || [],
            layers: layerStats,
            artifacts,
            generatedAt:
                reportData?.timestamp || null
        };
    }

    static readLatestReport(rootDir) {

        const reportPath =
            path.join(
                rootDir,
                '.cache/regression-report.json'
            );

        if (!fs.existsSync(reportPath)) {
            return null;
        }

        return JSON.parse(
            fs.readFileSync(reportPath, 'utf8')
        );
    }

    static generateReport(rootDir) {

        const paths =
            this.getPaths(rootDir);

        const envFile =
            path.join(rootDir, 'environment.properties');

        if (
            fs.existsSync(envFile)
            && fs.existsSync(paths.results)
        ) {
            fs.copyFileSync(
                envFile,
                path.join(
                    paths.results,
                    'environment.properties'
                )
            );
        }

        execSync(
            'npx allure generate allure-results --clean -o allure-report',
            {
                cwd: rootDir,
                stdio: 'pipe'
            }
        );

        return {
            generated: true,
            reportPath: paths.report
        };
    }

    static openReport(rootDir) {

        const paths =
            this.getPaths(rootDir);

        if (
            !fs.existsSync(
                path.join(paths.report, 'index.html')
            )
        ) {
            this.generateReport(rootDir);
        }

        return {
            opened: true,
            reportPath: paths.report,
            note:
                'Report served at /reports/allure/index.html'
        };
    }
}

module.exports = AllureService;
