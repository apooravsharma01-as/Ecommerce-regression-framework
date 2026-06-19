#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const AllureService =
    require('./allureService');

const ROOT_DIR =
    path.resolve(__dirname, '..');

const PORT =
    process.env.DASHBOARD_API_PORT || 3847;

const jobs = new Map();

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    '/reports/allure',
    express.static(
        path.join(ROOT_DIR, 'allure-report')
    )
);

app.use(
    '/api/allure/files',
    express.static(
        path.join(ROOT_DIR, 'allure-results')
    )
);

app.use(
    '/api/evidence/files',
    express.static(
        path.join(ROOT_DIR, 'test-results')
    )
);

function readJsonSafe(filePath) {

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return JSON.parse(
        fs.readFileSync(filePath, 'utf8')
    );
}

function buildRegressionArgs(body) {

    const args = [
        path.join(ROOT_DIR, 'agents/runRegression.js')
    ];

    if (body.story) {
        args.push('--story', body.story);
    }

    if (body.jira) {
        args.push('--jira', body.jira);
    }

    if (body.pr) {
        args.push('--pr', String(body.pr));
    }

    if (body.simulate) {
        const files =
            Array.isArray(body.simulate)
                ? body.simulate
                : [body.simulate];

        files.forEach(file => {
            args.push('--simulate', file);
        });
    }

    if (body.llm) {
        args.push('--llm');
    }

    if (body.git) {
        args.push('--git');
    }

    if (body.analyzeOnly) {
        args.push('--no-run');
    }

    return args;
}

function createJob(body) {

    const id = randomUUID();

    const job = {
        id,
        status: 'queued',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        exitCode: null,
        logs: [],
        request: body,
        report: null,
        error: null
    };

    jobs.set(id, job);

    const args = buildRegressionArgs(body);

    job.status = 'running';
    job.logs.push(
        `> node ${args.join(' ')}\n`
    );

    const child = spawn(
        process.execPath,
        args,
        {
            cwd: ROOT_DIR,
            env: {
                ...process.env,
                FORCE_COLOR: '0'
            }
        }
    );

    const appendLog = (chunk) => {
        job.logs.push(chunk.toString());
    };

    child.stdout.on('data', appendLog);
    child.stderr.on('data', appendLog);

    child.on('close', (code) => {

        job.finishedAt = new Date().toISOString();
        job.exitCode = code;
        job.status = code === 0 ? 'passed' : 'failed';

        let report =
            readJsonSafe(
                path.join(
                    ROOT_DIR,
                    '.cache/regression-report.json'
                )
            );

        if (report) {
            const existing =
                readJsonSafe(
                    path.join(
                        ROOT_DIR,
                        '.cache/regression-report.json'
                    )
                );

            if (
                existing
                && (existing.generation?.domains?.length || 0)
                    > (report.generation?.domains?.length || 0)
            ) {
                report.generation =
                    existing.generation;
                report.impact =
                    existing.impact || report.impact;
                report.tests =
                    report.tests?.length
                        ? report.tests
                        : existing.tests;
                report.selection =
                    report.selection || existing.selection;
                report.trigger =
                    report.trigger || existing.trigger;
            }

            report =
                AllureService.syncReportExecution(
                    report,
                    ROOT_DIR
                );

            fs.writeFileSync(
                path.join(
                    ROOT_DIR,
                    '.cache/regression-report.json'
                ),
                JSON.stringify(report, null, 2)
            );
        }

        job.report = report;

        if (
            AllureService.hasAllureResultFiles(ROOT_DIR)
        ) {
            AllureService
                .generateReport(ROOT_DIR, { force: true })
                .catch(() => {});
        }

        if (!job.report) {
            job.error =
                'Regression finished but no report was generated.';
        }
    });

    child.on('error', (error) => {

        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.error = error.message;
        job.logs.push(`\nProcess error: ${error.message}\n`);
    });

    return job;
}

app.get('/api/health', (req, res) => {

    res.json({
        ok: true,
        service: 'regression-dashboard-api',
        evidenceApiVersion: 2,
        rootDir: ROOT_DIR
    });
});

app.get('/api/domains', (req, res) => {

    const impactMap =
        readJsonSafe(
            path.join(
                ROOT_DIR,
                'config/impactMap.json'
            )
        );

    if (!impactMap) {
        return res.status(404).json({
            error: 'impactMap.json not found'
        });
    }

    const domains =
        Object.entries(impactMap.domains)
            .map(([id, domain]) => ({
                id,
                keywords: domain.keywords,
                endpoints: domain.endpoints,
                tables: domain.tables
            }));

    res.json({ domains });
});

app.get('/api/evidence/summary', (req, res) => {

    const report =
        readJsonSafe(
            path.join(
                ROOT_DIR,
                '.cache/regression-report.json'
            )
        );

    const live =
        req.query.live === '1';

    res.json(
        AllureService.buildEvidenceSummary(
            ROOT_DIR,
            report,
            { live }
        )
    );
});

app.get('/api/allure/status', (req, res) => {

    const paths =
        AllureService.getPaths(ROOT_DIR);

    const reportReady =
        fs.existsSync(
            path.join(paths.report, 'index.html')
        );

    const hasResults =
        AllureService.hasAllureResultFiles(ROOT_DIR);

    res.json({
        reportReady,
        hasResults,
        browserUrl: '/reports/allure/index.html',
        message:
            !hasResults
                ? 'No test results yet — run full regression (not Analyze Only)'
                : !reportReady
                    ? 'Results found — click Regenerate to build report'
                    : 'Report ready'
    });
});

app.post('/api/allure/generate', async (req, res) => {

    try {

        if (
            !AllureService.hasAllureResultFiles(ROOT_DIR)
        ) {
            return res.status(400).json({
                error:
                    'No Allure result files found. Run full regression first (not Analyze Only).',
                browserUrl: '/reports/allure/index.html'
            });
        }

        const result =
            await AllureService.generateReport(
                ROOT_DIR,
                { force: true }
            );

        res.json(result);

    } catch (error) {

        res.status(500).json({
            error: error.message,
            browserUrl: '/reports/allure/index.html'
        });
    }
});

app.post('/api/allure/open', (req, res) => {

    const result =
        AllureService.openReport(ROOT_DIR);

    res.json({
        ...result,
        browserUrl: '/reports/allure/index.html'
    });
});

app.get('/api/report/latest', (req, res) => {

    const report =
        readJsonSafe(
            path.join(
                ROOT_DIR,
                '.cache/regression-report.json'
            )
        );

    const markdownPath =
        path.join(
            ROOT_DIR,
            '.cache/regression-report.md'
        );

    const markdown =
        fs.existsSync(markdownPath)
            ? fs.readFileSync(markdownPath, 'utf8')
            : null;

    if (!report) {
        return res.status(404).json({
            error: 'No regression report found yet'
        });
    }

    res.json({ report, markdown });
});

app.get('/api/regression/jobs', (req, res) => {

    const list =
        [...jobs.values()]
            .sort((a, b) =>
                new Date(b.startedAt)
                    - new Date(a.startedAt)
            )
            .slice(0, 20)
            .map(job => ({
                id: job.id,
                status: job.status,
                startedAt: job.startedAt,
                finishedAt: job.finishedAt,
                trigger:
                    job.request?.story
                    || job.request?.jira
                    || job.report?.trigger
                    || 'regression run',
                domains:
                    job.report?.impact?.domains || []
            }));

    res.json({ jobs: list });
});

app.get('/api/regression/jobs/:id', (req, res) => {

    const job = jobs.get(req.params.id);

    if (!job) {
        return res.status(404).json({
            error: 'Job not found'
        });
    }

    const liveReport =
        job.status === 'running'
            ? readJsonSafe(
                path.join(
                    ROOT_DIR,
                    '.cache/regression-report.json'
                )
            )
            : null;

    res.json({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        exitCode: job.exitCode,
        logs: job.logs.join(''),
        report: job.report || liveReport,
        error: job.error,
        request: job.request
    });
});

app.post('/api/regression/run', (req, res) => {

    const body = req.body || {};

    if (
        !body.story
        && !body.jira
        && !body.pr
        && !body.simulate
        && !body.git
    ) {
        return res.status(400).json({
            error:
                'Provide at least one trigger: story, jira, pr, simulate, or git'
        });
    }

    const job = createJob(body);

    res.status(202).json({
        id: job.id,
        status: job.status,
        message: 'Regression pipeline started'
    });
});

app.listen(PORT, () => {

    console.log(
        `Dashboard API running on http://localhost:${PORT}`
    );
});
