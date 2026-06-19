const fs = require('fs');
const path = require('path');

const PATTERN_CATALOG =
    require('./patternCatalog');

const MEMORY_FILE =
    'config/regression-memory.json';

const SKILL_LESSONS =
    '.cursor/skills/regression-agent/lessons-learned.md';

class RegressionMemory {

    static getMemoryPath(rootDir = process.cwd()) {

        return path.join(rootDir, MEMORY_FILE);
    }

    static load(rootDir = process.cwd()) {

        const file =
            this.getMemoryPath(rootDir);

        if (!fs.existsSync(file)) {
            return this.seed(rootDir);
        }

        try {
            const memory = JSON.parse(
                fs.readFileSync(file, 'utf8')
            );

            if (!memory.lessons?.length) {
                return this.seed(rootDir);
            }

            return memory;
        } catch {
            return this.seed(rootDir);
        }
    }

    static save(memory, rootDir = process.cwd()) {

        const file =
            this.getMemoryPath(rootDir);

        fs.mkdirSync(
            path.dirname(file),
            { recursive: true }
        );

        memory.updatedAt =
            new Date().toISOString();

        fs.writeFileSync(
            file,
            JSON.stringify(memory, null, 2)
        );

        this.syncSkillLessons(memory, rootDir);

        return memory;
    }

    static seed(rootDir) {

        const knownIds = new Set([
            'uat-db-api-split',
            'api-http-200-only',
            'db-zero-rows-as-pass',
            'fake-shipping-package-code',
            'analyze-only-stale-proof',
            'missing-rts-manifest-fixture'
        ]);

        const now =
            new Date().toISOString();

        const memory = {
            version: 1,
            updatedAt: now,
            lessons: PATTERN_CATALOG.map(entry => ({
                id: entry.id,
                occurrences: knownIds.has(entry.id) ? 1 : 0,
                firstSeen: knownIds.has(entry.id) ? now : null,
                lastSeen: knownIds.has(entry.id) ? now : null,
                lastTrigger: knownIds.has(entry.id)
                    ? 'project bootstrap'
                    : null,
                symptom: entry.symptom,
                fix: entry.fix,
                neverAgain: entry.neverAgain,
                active: true,
                sources: knownIds.has(entry.id)
                    ? [{
                        at: now,
                        source: 'bootstrap',
                        detail: 'Known mistake from initial framework hardening'
                    }]
                    : []
            }))
        };

        this.save(memory, rootDir);
        return memory;
    }

    static isStrictPreflight() {

        return process.env.REGRESSION_MEMORY_STRICT === 'true';
    }

    static isPreflightDisabled() {

        return process.env.REGRESSION_MEMORY_OFF === 'true';
    }

    static applyPreflightActions(tests = [], preflight = {}) {

        const strict =
            this.isStrictPreflight();

        const warnings =
            [...(preflight.warnings || [])];

        let runnable =
            [...tests];

        const dbChecks =
            new Set(['dbPing', 'dbUatConfig']);

        const dbTunnelIssue =
            (preflight.blockers || []).some(
                blocker =>
                    dbChecks.has(blocker.check)
                    || blocker.id === 'db-tunnel-down'
                    || blocker.id === 'uat-db-api-split'
            );

        if (dbTunnelIssue) {

            const before =
                runnable.length;

            runnable =
                runnable.filter(
                    test => !test.includes('.db.')
                );

            const skipped =
                before - runnable.length;

            if (skipped > 0) {
                warnings.push({
                    id: 'db-tests-skipped',
                    level: 'runtime',
                    message:
                        `Skipped ${skipped} DB test(s) — tunnel not up. Run npm run db:tunnel for DB proof.`,
                    fix:
                        'npm run db:tunnel (keep open), then npm run db:diagnose',
                    neverAgain:
                        'Never run UAT API tests against local DB without tunnel.'
                });
            }
        }

        if (!strict) {

            for (const blocker of preflight.blockers || []) {

                if (
                    dbChecks.has(blocker.check)
                    || blocker.id === 'db-tunnel-down'
                    || blocker.id === 'uat-db-api-split'
                ) {
                    continue;
                }

                warnings.push({
                    id: blocker.id,
                    level: 'preflight',
                    message: blocker.message,
                    fix: blocker.fix,
                    neverAgain: blocker.neverAgain
                });
            }

            return {
                tests: runnable,
                blockers: [],
                warnings,
                skippedDb: dbTunnelIssue
            };
        }

        return {
            tests: runnable,
            blockers: [...(preflight.blockers || [])],
            warnings,
            skippedDb: dbTunnelIssue
        };
    }

    static findLesson(memory, id) {

        return memory.lessons.find(
            lesson => lesson.id === id
        );
    }

    static recordLesson(
        memory,
        {
            id,
            trigger = null,
            source = 'run',
            detail = null
        }
    ) {

        let lesson =
            this.findLesson(memory, id);

        if (!lesson) {

            const catalog =
                PATTERN_CATALOG.find(
                    entry => entry.id === id
                );

            lesson = {
                id,
                occurrences: 0,
                firstSeen: null,
                lastSeen: null,
                lastTrigger: null,
                symptom: catalog?.symptom || detail || id,
                fix: catalog?.fix || 'Review failure logs.',
                neverAgain:
                    catalog?.neverAgain
                    || 'Do not repeat this mistake.',
                active: true,
                sources: []
            };

            memory.lessons.push(lesson);
        }

        const now =
            new Date().toISOString();

        lesson.occurrences += 1;

        if (!lesson.firstSeen) {
            lesson.firstSeen = now;
        }

        lesson.lastSeen = now;

        if (trigger) {
            lesson.lastTrigger = trigger;
        }

        const sourceEntry = {
            at: now,
            source,
            detail
        };

        lesson.sources =
            [
                sourceEntry,
                ...(lesson.sources || [])
            ].slice(0, 20);

        return lesson;
    }

    static learnFromRun(report, rootDir = process.cwd()) {

        const memory =
            this.load(rootDir);

        const trigger =
            report?.trigger || 'regression run';

        const learned =
            [];

        const AllureService =
            require('../../server/allureService');

        const runStartedAt =
            AllureService.getRunStartedAt(rootDir);

        const tests =
            AllureService.parseAllureResults(rootDir, {
                sinceMs: runStartedAt
            });

        const feed =
            AllureService.buildEvidenceFeed(rootDir, {
                sinceMs: runStartedAt
            });

        const alerts =
            AllureService.buildDataIntegrityAlerts(feed);

        for (const entry of PATTERN_CATALOG) {

            let matched = false;
            let detail = null;

            if (
                entry.patterns.report
                && entry.patterns.report(report)
            ) {
                matched = true;
                detail = 'analyze-only or no execution';
            }

            if (
                entry.patterns.env
                && entry.patterns.env()
            ) {
                matched = true;
                detail = 'environment misconfiguration';
            }

            if (!matched && entry.patterns.failureText) {

                for (const test of tests) {

                    if (
                        !['failed', 'broken']
                            .includes(test.status)
                    ) {
                        continue;
                    }

                    const text =
                        `${test.error || ''} ${test.name || ''}`
                            .toLowerCase();

                    if (
                        entry.patterns.failureText.some(
                            token => text.includes(token)
                        )
                    ) {
                        matched = true;
                        detail = test.name;
                        break;
                    }
                }
            }

            if (!matched && entry.patterns.evidence) {

                for (const item of feed) {

                    if (entry.patterns.evidence(item)) {
                        matched = true;
                        detail = item.title;
                        break;
                    }
                }
            }

            if (!matched && entry.patterns.specContent) {

                for (const testFile of report?.tests || []) {

                    const abs =
                        path.join(rootDir, testFile);

                    if (!fs.existsSync(abs)) {
                        continue;
                    }

                    const content =
                        fs.readFileSync(abs, 'utf8');

                    if (
                        entry.patterns.specAntiPattern
                        && entry.patterns.specAntiPattern(
                            content
                        )
                    ) {
                        matched = true;
                        detail = testFile;
                        break;
                    }

                    if (
                        entry.patterns.specContent.some(
                            token =>
                                content.includes(token)
                        )
                        && entry.id === 'fake-shipping-package-code'
                    ) {
                        matched = true;
                        detail = testFile;
                        break;
                    }
                }
            }

            if (matched) {

                const lesson =
                    this.recordLesson(memory, {
                        id: entry.id,
                        trigger,
                        source: 'post-run',
                        detail
                    });

                learned.push(lesson);
            }
        }

        for (const alert of alerts) {

            const lesson =
                this.recordLesson(memory, {
                    id: 'db-zero-rows-as-pass',
                    trigger,
                    source: 'integrity-alert',
                    detail: alert.title
                });

            if (
                !learned.find(
                    item => item.id === lesson.id
                )
            ) {
                learned.push(lesson);
            }
        }

        if (
            report?.execution?.executed
            && !report?.execution?.passed
        ) {

            for (const test of tests) {

                if (test.status !== 'failed') {
                    continue;
                }

                const FailureAnalyzer =
                    require('../llm/FailureAnalyzer');

                const analysis =
                    FailureAnalyzer.ruleBasedAnalyze({
                        testName: test.name,
                        error: test.error,
                        stackTrace: test.trace
                    });

                memory.lastFailureSummary =
                    memory.lastFailureSummary || [];

                memory.lastFailureSummary.unshift({
                    at: new Date().toISOString(),
                    testName: test.name,
                    failureType: analysis.failureType,
                    rootCause: analysis.rootCause,
                    suggestedFix: analysis.suggestedFix
                });

                memory.lastFailureSummary =
                    memory.lastFailureSummary.slice(0, 15);
            }
        }

        this.save(memory, rootDir);

        return {
            learned,
            memory
        };
    }

    static async runPreflight(
        {
            rootDir = process.cwd(),
            tests = [],
            report = null,
            trigger = null
        } = {}
    ) {

        const memory =
            this.load(rootDir);

        const blockers = [];
        const warnings = [];

        const activeLessons =
            memory.lessons.filter(
                lesson =>
                    lesson.active
                    && lesson.occurrences > 0
            );

        for (const lesson of activeLessons) {

            warnings.push({
                id: lesson.id,
                level: 'lesson',
                message: lesson.neverAgain,
                fix: lesson.fix,
                seen: lesson.occurrences
            });
        }

        for (const entry of PATTERN_CATALOG) {

            if (!entry.preflight?.length) {
                continue;
            }

            for (const check of entry.preflight) {

                const result =
                    await this.runPreflightCheck(
                        check,
                        {
                            rootDir,
                            tests,
                            report,
                            trigger,
                            memory
                        }
                    );

                if (!result) {
                    continue;
                }

                const payload = {
                    id: entry.id,
                    check,
                    message: result.message,
                    fix: entry.fix,
                    neverAgain: entry.neverAgain
                };

                if (result.block) {
                    blockers.push(payload);
                } else {
                    warnings.push(payload);
                }
            }
        }

        return {
            blockers,
            warnings,
            memory,
            activeLessonCount: activeLessons.length
        };
    }

    static async runPreflightCheck(
        check,
        ctx
    ) {

        switch (check) {

            case 'dbUatConfig': {

                if (process.env.DB_USE_UAT === 'true') {
                    return null;
                }

                const remote =
                    (process.env.BASE_URL || '')
                        .includes('stguat');

                if (!remote) {
                    return null;
                }

                const lesson =
                    this.findLesson(
                        ctx.memory,
                        'uat-db-api-split'
                    );

                if (
                    lesson?.occurrences > 0
                    || ctx.tests.some(
                        t => t.includes('.db.')
                    )
                ) {
                    return {
                        block: true,
                        message:
                            'DB_USE_UAT is not true but STGUAT API is configured — learned mistake will repeat.'
                    };
                }

                return {
                    block: false,
                    message:
                        'Consider DB_USE_UAT=true for STGUAT API + DB proof.'
                };
            }

            case 'dbPing': {

                if (process.env.DB_USE_UAT !== 'true') {
                    return null;
                }

                if (!ctx.tests.some(t => t.includes('.db.'))) {
                    return null;
                }

                try {
                    const DbVerify =
                        require('../../database/DbVerify');

                    const ok =
                        await DbVerify.ping();

                    if (!ok) {
                        return {
                            block: this.isStrictPreflight(),
                            message:
                                'UAT DB not reachable — start npm run db:tunnel. DB tests will be skipped unless tunnel is up.'
                        };
                    }
                } catch (error) {

                    return {
                        block: this.isStrictPreflight(),
                        message:
                            `DB ping failed: ${error.message}. Run npm run db:tunnel. DB tests will be skipped.`
                    };
                }

                return null;
            }

            case 'scanSpecsForHttpOnly':
                return this.scanTests(
                    ctx,
                    content =>
                        /test\s*\(\s*['"`]POSITIVE/i.test(content)
                        && content.includes('toBeLessThan(500)')
                        && !content.includes('ApiAssertions'),
                    'Generated POSITIVE spec uses HTTP-only pass check — will cause false positives.',
                    true,
                    'api-http-200-only'
                );

            case 'scanSpecsForWeakDb':
                return this.scanTests(
                    ctx,
                    content =>
                        content.includes('DbVerify.ping()')
                        && !content.includes('assertRowFound')
                        && content.includes('.db.spec'),
                    'DB spec may pass on connectivity only — weak proof.',
                    false,
                    'db-zero-rows-as-pass'
                );

            case 'scanSpecsForFakePackageCodes':
                return this.scanTests(
                    ctx,
                    content =>
                        content.includes('SHIPPINGPACKAGECODE_')
                        && /POSITIVE/i.test(content),
                    'Positive spec still uses fake SHIPPINGPACKAGECODE_* — learned anti-pattern.',
                    true,
                    'fake-shipping-package-code'
                );

            case 'cancellationFixtureHint': {

                const isCancellation =
                    (ctx.trigger || '')
                        .toLowerCase()
                        .includes('cancel')
                    || ctx.tests.some(
                        t => t.includes('cancellation')
                    );

                if (!isCancellation) {
                    return null;
                }

                const lesson =
                    this.findLesson(
                        ctx.memory,
                        'missing-rts-manifest-fixture'
                    );

                if (lesson?.occurrences > 0) {
                    return {
                        block: false,
                        message:
                            'Past run lacked RTS/manifest fixtures — set TEST_RTS_PACKAGE_CODE before retry.'
                    };
                }

                return null;
            }

            default:
                return null;
        }
    }

    static scanTests(
        ctx,
        predicate,
        message,
        block,
        lessonId
    ) {

        const lesson =
            this.findLesson(ctx.memory, lessonId);

        if (!lesson || lesson.occurrences === 0) {
            return null;
        }

        for (const testFile of ctx.tests) {

            const abs =
                path.join(ctx.rootDir, testFile);

            if (!fs.existsSync(abs)) {
                continue;
            }

            const content =
                fs.readFileSync(abs, 'utf8');

            if (predicate(content)) {
                return {
                    block,
                    message: `${message} (${testFile})`
                };
            }
        }

        return null;
    }

    static syncSkillLessons(memory, rootDir) {

        const skillPath =
            path.join(rootDir, SKILL_LESSONS);

        if (!fs.existsSync(path.dirname(skillPath))) {
            return;
        }

        const autoSection =
            memory.lessons
                .filter(
                    lesson => lesson.occurrences > 0
                )
                .sort(
                    (a, b) =>
                        new Date(b.lastSeen)
                        - new Date(a.lastSeen)
                )
                .map(lesson => {

                    const date =
                        lesson.lastSeen
                            ? lesson.lastSeen.slice(0, 10)
                            : 'unknown';

                    return [
                        `## ${date} — ${lesson.id} (×${lesson.occurrences})`,
                        '',
                        `- Symptom: ${lesson.symptom}`,
                        `- Fix: ${lesson.fix}`,
                        `- Never again: ${lesson.neverAgain}`,
                        lesson.lastTrigger
                            ? `- Last trigger: ${lesson.lastTrigger}`
                            : '',
                        ''
                    ].filter(Boolean).join('\n');
                })
                .join('\n');

        const header =
            `# Lessons learned (append-only)\n\n`
            + `> Auto-synced from \`config/regression-memory.json\` after each run.\n`
            + `> Lessons with occurrences > 0 block or warn on the next preflight.\n\n`
            + `---\n\n`;

        const manualPath =
            path.join(
                rootDir,
                '.cursor/skills/regression-agent/lessons-manual.md'
            );

        let manual = '';

        if (fs.existsSync(manualPath)) {
            manual =
                `\n---\n\n# Manual notes\n\n`
                + fs.readFileSync(manualPath, 'utf8');
        }

        fs.writeFileSync(
            skillPath,
            header + autoSection + manual
        );
    }

    static printPreflightReport(
        preflight,
        options = {}
    ) {

        const strict = options.strict === true;

        if (preflight.blockers.length > 0) {

            console.log(
                strict
                    ? '\n⛔ Regression memory — BLOCKING:\n'
                    : '\n⚠️  Regression memory — warnings (run continues):\n'
            );

            for (const item of preflight.blockers) {
                console.log(`  • ${item.message}`);
                if (item.fix) {
                    console.log(`    Fix: ${item.fix}`);
                }
            }

            console.log('');
        }

        if (preflight.warnings.length > 0) {

            console.log(
                '\n⚠️  Regression memory — active lessons:\n'
            );

            const shown =
                new Set();

            for (const item of preflight.warnings) {

                const key =
                    item.id || item.message;

                if (shown.has(key)) {
                    continue;
                }

                shown.add(key);

                console.log(`  • ${item.neverAgain || item.message}`);

                if (item.seen) {
                    console.log(
                        `    (seen ${item.seen} time${item.seen === 1 ? '' : 's'})`
                    );
                }
            }

            console.log('');
        }
    }
}

module.exports = RegressionMemory;
