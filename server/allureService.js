const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

let evidenceCache = {
    data: null,
    expiresAt: 0
};

let generateInProgress = false;

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

    static encodeMediaPath(basePath, filePath) {

        const encoded =
            String(filePath)
                .split('/')
                .map(segment =>
                    encodeURIComponent(segment)
                )
                .join('/');

        return `${basePath}/${encoded}`;
    }

    static collectAllAttachments(data) {

        const attachments = [];
        const seen = new Set();

        const remember = (att) => {

            const key =
                att.source || att.name;

            if (!key || seen.has(key)) {
                return;
            }

            seen.add(key);
            attachments.push(att);
        };

        const walk = (node) => {

            if (!node) {
                return;
            }

            for (const att of node.attachments || []) {
                remember(att);
            }

            for (const step of node.steps || []) {
                walk(step);
            }
        };

        walk(data);
        return attachments;
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
            || (
                testName.toLowerCase().startsWith('e2e -')
                && text.includes('.db.spec')
            )
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

    static parseAllureResults(
        rootDir,
        options = {}
    ) {

        const { results: resultsDir } =
            this.getPaths(rootDir);

        const sinceMs =
            options.sinceMs
            ?? this.getRunStartedAt(rootDir);

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

                const parentSuite =
                    data.labels?.find(label =>
                        label.name === 'parentSuite'
                    )?.value || '';

                const testClass =
                    data.labels?.find(label =>
                        label.name === 'testClass'
                    )?.value || '';

                const fullName =
                    data.fullName || data.name || '';

                const filePath =
                    `${parentSuite}/${testClass}`;

                const layer =
                    this.classifyLayer(
                        `${filePath} ${suite} ${fullName}`,
                        data.name || ''
                    );

                const attachments =
                    this.collectAllAttachments(data)
                        .map(att => ({
                            name: att.name,
                            type: att.type,
                            source: att.source,
                            url:
                                att.source
                                    ? this.encodeMediaPath(
                                        '/api/allure/files',
                                        att.source
                                    )
                                    : null
                        }));

                const start =
                    data.start || 0;

                if (
                    sinceMs > 0
                    && start > 0
                    && start < sinceMs
                ) {
                    continue;
                }

                parsed.push({
                    uuid: data.uuid,
                    name: data.name,
                    status: data.status,
                    fullName,
                    suite,
                    filePath,
                    layer,
                    start,
                    stop: data.stop || 0,
                    attachments,
                    error:
                        data.statusDetails?.message || null,
                    trace:
                        data.statusDetails?.trace || null
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

    static collectPlaywrightArtifacts(
        rootDir,
        options = {}
    ) {

        const sinceMs =
            options.sinceMs
            ?? this.getRunStartedAt(rootDir);

        const { testResults } =
            this.getPaths(rootDir);

        const screenshots = [];
        const videos = [];
        const seen = new Set();

        const remember = (item) => {

            const key = item.url;

            if (!key || seen.has(key)) {
                return;
            }

            seen.add(key);

            if (item.kind === 'screenshot') {
                screenshots.push(item);
            } else {
                videos.push(item);
            }
        };

        if (fs.existsSync(testResults)) {

            const walk = (dir) => {

                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

                    const fullPath =
                        path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        walk(fullPath);
                        continue;
                    }

                    let mtime = Date.now();

                    try {
                        mtime =
                            fs.statSync(fullPath).mtimeMs;
                    } catch {
                        // keep now
                    }

                    if (
                        sinceMs > 0
                        && mtime < sinceMs
                    ) {
                        continue;
                    }

                    const relative =
                        path.relative(testResults, fullPath);

                    if (entry.name.endsWith('.png')) {
                        remember({
                            kind: 'screenshot',
                            name: relative,
                            url: this.encodeMediaPath(
                                '/api/evidence/files',
                                relative
                            ),
                            folder: path.basename(
                                path.dirname(fullPath)
                            ),
                            timestamp: mtime
                        });
                    }

                    if (entry.name.endsWith('.webm')) {
                        remember({
                            kind: 'video',
                            name: relative,
                            url: this.encodeMediaPath(
                                '/api/evidence/files',
                                relative
                            ),
                            folder: path.basename(
                                path.dirname(fullPath)
                            ),
                            timestamp: mtime
                        });
                    }
                }
            };

            walk(testResults);
        }

        const allureTests =
            this.parseAllureResults(rootDir, {
                sinceMs
            });

        for (const test of allureTests) {

            for (const att of test.attachments || []) {

                const isPng =
                    att.source?.endsWith('.png')
                    || (att.type || '').startsWith('image/');

                const isVideo =
                    att.source?.endsWith('.webm')
                    || (att.type || '').startsWith('video/');

                if (isPng && att.url) {
                    remember({
                        kind: 'screenshot',
                        name: att.name || att.source,
                        url: att.url,
                        folder: test.name,
                        timestamp: test.stop || test.start
                    });
                }

                if (isVideo && att.url) {
                    remember({
                        kind: 'video',
                        name: att.name || att.source,
                        url: att.url,
                        folder: test.name,
                        timestamp: test.stop || test.start
                    });
                }
            }
        }

        return {
            screenshots: screenshots
                .sort((a, b) =>
                    (b.timestamp || 0) - (a.timestamp || 0)
                )
                .slice(0, 12)
                .map(({ kind, timestamp, ...rest }) => rest),
            videos: videos
                .sort((a, b) =>
                    (b.timestamp || 0) - (a.timestamp || 0)
                )
                .slice(0, 6)
                .map(({ kind, timestamp, ...rest }) => rest)
        };
    }

    static classifyAttachment(att, test = {}) {

        const name = (att.name || '').toLowerCase();
        const mime = att.type || '';

        if (mime.startsWith('video/')) {
            return 'video';
        }

        if (mime.startsWith('image/')) {
            return 'ui';
        }

        if (name.includes('api request')) {
            return 'api';
        }

        if (name.includes('api response')) {
            return 'api';
        }

        if (name.includes('db record') || name.includes('db ')) {
            return 'db';
        }

        if (mime.includes('json')) {
            if (name.includes('api')) {
                return 'api';
            }

            if (name.includes('db')) {
                return 'db';
            }
        }

        if (name.includes('screenshot')) {
            return 'ui';
        }

        return 'other';
    }

    static readLiveFeed(rootDir) {

        const feedPath =
            path.join(
                rootDir,
                '.cache/evidence-live.jsonl'
            );

        if (!fs.existsSync(feedPath)) {
            return [];
        }

        const items = [];

        for (const line of fs.readFileSync(feedPath, 'utf8').split('\n')) {

            if (!line.trim()) {
                continue;
            }

            try {
                items.push(JSON.parse(line));
            } catch {
                continue;
            }
        }

        return items;
    }

    static buildEvidenceFeed(
        rootDir,
        options = {}
    ) {

        const sinceMs =
            options.sinceMs
            ?? this.getRunStartedAt(rootDir);

        const feed = [];
        const seen = new Set();
        const seenKeys = new Map();
        const seenMedia = new Set();

        const remember = (item) => {

            if (
                item.mediaUrl
                && seenMedia.has(item.mediaUrl)
            ) {
                return false;
            }

            if (item.mediaUrl) {
                seenMedia.add(item.mediaUrl);
            }

            const key =
                `${item.type}|${item.title || item.id}|${item.testName || ''}`;

            const existing =
                seenKeys.get(key);

            if (existing) {

                const existingTime =
                    existing.timestamp || 0;

                const itemTime =
                    item.timestamp || 0;

                if (itemTime <= existingTime) {
                    return false;
                }

                const existingIndex =
                    feed.findIndex(row => row.id === existing.id);

                if (existingIndex >= 0) {
                    seen.delete(existing.id);
                    feed.splice(existingIndex, 1);
                }
            }

            seenKeys.set(key, item);

            if (seen.has(item.id)) {
                return false;
            }

            seen.add(item.id);
            return true;
        };

        for (const entry of this.readLiveFeed(rootDir)) {

            const entryTime =
                entry.timestamp || 0;

            if (
                sinceMs > 0
                && entryTime > 0
                && entryTime < sinceMs
            ) {
                continue;
            }

            const id =
                entry.id
                || `${entry.type}-${entry.timestamp}-${entry.label}`;

            const item = {
                id,
                type: entry.type || 'other',
                title:
                    entry.type === 'api'
                        ? `API · ${entry.label || 'call'}`
                        : entry.type === 'db'
                            ? `DB · ${entry.label || 'query'}`
                            : entry.label || entry.type,
                testName: entry.testName || null,
                testFile: entry.testFile || null,
                suite: entry.suite || null,
                timestamp: entry.timestamp || Date.now(),
                httpStatus:
                    entry.httpStatus
                    ?? (entry.type === 'api' ? entry.status : null),
                status:
                    entry.type === 'api'
                        ? null
                        : (entry.status || null),
                method: entry.method || null,
                url: entry.url || null,
                preview:
                    entry.type === 'api'
                        ? null
                        : entry.response
                            ? JSON.stringify(entry.response, null, 2).slice(0, 800)
                            : entry.record
                                ? JSON.stringify(entry.record, null, 2).slice(0, 800)
                                : null,
                request: entry.request || null,
                response: entry.response || null,
                record: entry.record || null,
                mediaUrl: entry.mediaUrl || null,
                ready: entry.ready ?? Boolean(entry.mediaUrl)
            };

            if (entry.type === 'db' && entry.record) {
                const DbVerify =
                    require('../database/DbVerify');

                item.status =
                    entry.status
                    || entry.record.status
                    || DbVerify.resolveVerificationStatus(
                        entry.record
                    );
                item.rowsFound =
                    entry.record.rowsFound ?? null;
                item.verification =
                    entry.record.verification || null;
            }

            if (entry.type === 'api') {
                const ApiAssertions =
                    require('../utils/ApiAssertions');

                item.businessOutcome =
                    entry.businessOutcome
                    || ApiAssertions.deriveOutcome(
                        entry.response,
                        item.httpStatus
                    );

                if (item.businessOutcome) {
                    item.status = item.businessOutcome;
                }
            }

            if (remember(item)) {
                feed.push(item);
            }
        }

        const tests =
            this.parseAllureResults(rootDir, {
                sinceMs
            });

        for (const test of tests) {

            for (const att of test.attachments || []) {

                const type =
                    this.classifyAttachment(att, test);

                if (type === 'other') {
                    continue;
                }

                const id =
                    `${test.uuid}-${att.source || att.name}`;

                let preview = null;
                let parsedJson = null;

                if (
                    att.url
                    && (att.type || '').includes('json')
                ) {
                    try {
                        const raw =
                            fs.readFileSync(
                                path.join(
                                    this.getPaths(rootDir).results,
                                    att.source
                                ),
                                'utf8'
                            );

                        preview = raw.slice(0, 1200);

                        try {
                            parsedJson = JSON.parse(raw);
                        } catch {
                            parsedJson = null;
                        }
                    } catch {
                        preview = null;
                    }
                }

                const attName = att.name || '';
                const baseLabel =
                    attName
                        .replace(/^API (Request|Response) — /i, '')
                        .replace(/^DB Record — /i, '')
                        .trim();

                const attItem = {
                    id,
                    type,
                    title:
                        type === 'api'
                            ? `API · ${baseLabel || test.name}`
                            : type === 'db'
                                ? `DB · ${baseLabel || test.name}`
                                : attName || type,
                    testName: test.name,
                    timestamp: test.stop || test.start || Date.now(),
                    status: test.status,
                    method: parsedJson?.method || null,
                    url: parsedJson?.url || null,
                    preview,
                    request:
                        /request/i.test(attName)
                            ? (parsedJson?.body ?? parsedJson)
                            : null,
                    response:
                        /response/i.test(attName)
                            ? (parsedJson?.body ?? parsedJson)
                            : type === 'db'
                                ? parsedJson
                                : null,
                    record:
                        type === 'db'
                            ? parsedJson
                            : null,
                    mediaUrl: att.url || null
                };

                if (type === 'db' && parsedJson) {
                    const DbVerify =
                        require('../database/DbVerify');

                    attItem.status =
                        parsedJson.status
                        || DbVerify.resolveVerificationStatus(
                            parsedJson
                        );
                    attItem.rowsFound =
                        parsedJson.rowsFound ?? null;
                    attItem.verification =
                        parsedJson.verification || null;
                }

                if (remember(attItem)) {
                    feed.push(attItem);
                }
            }
        }

        const artifacts =
            this.collectPlaywrightArtifacts(rootDir, {
                sinceMs
            });

        for (const shot of artifacts.screenshots || []) {

            const id = `pw-shot-${shot.url}`;

            let timestamp = Date.now();

            try {
                timestamp =
                    fs.statSync(
                        path.join(
                            this.getPaths(rootDir).testResults,
                            shot.name
                        )
                    ).mtimeMs;
            } catch {
                // use now
            }

            if (
                sinceMs > 0
                && timestamp < sinceMs
            ) {
                continue;
            }

            const shotItem = {
                id,
                type: 'ui',
                title: `Screenshot — ${shot.folder}`,
                testName: shot.folder,
                timestamp,
                status: null,
                mediaUrl: shot.url,
                preview: null
            };

            if (remember(shotItem)) {
                feed.push(shotItem);
            }
        }

        for (const video of artifacts.videos || []) {

            const id = `pw-video-${video.url}`;

            let timestamp = Date.now();
            let fileSize = 0;

            try {
                const stat =
                    fs.statSync(
                        path.join(
                            this.getPaths(rootDir).testResults,
                            video.name
                        )
                    );

                timestamp = stat.mtimeMs;
                fileSize = stat.size;
            } catch {
                continue;
            }

            if (fileSize < 2048) {
                continue;
            }

            if (
                sinceMs > 0
                && timestamp < sinceMs
            ) {
                continue;
            }

            const videoItem = {
                id,
                type: 'video',
                title: `Video — ${video.folder}`,
                testName: video.folder,
                timestamp,
                status: null,
                mediaUrl: video.url,
                preview: null
            };

            if (remember(videoItem)) {
                feed.push(videoItem);
            }
        }

        return feed
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 80);
    }

    static clearLiveFeed(rootDir) {

        const EvidenceLogger =
            require('../utils/EvidenceLogger');

        EvidenceLogger.clear(rootDir);
        evidenceCache.expiresAt = 0;
    }

    static clearRunArtifacts(rootDir) {

        const paths =
            this.getPaths(rootDir);

        for (const dir of [
            paths.results,
            paths.testResults
        ]) {

            if (fs.existsSync(dir)) {
                fs.rmSync(dir, {
                    recursive: true,
                    force: true
                });
            }

            fs.mkdirSync(dir, { recursive: true });
        }

        this.clearLiveFeed(rootDir);

        evidenceCache = {
            data: null,
            expiresAt: 0
        };

        const runMarker =
            path.join(
                rootDir,
                '.cache/current-run-started.json'
            );

        fs.mkdirSync(
            path.dirname(runMarker),
            { recursive: true }
        );

        fs.writeFileSync(
            runMarker,
            JSON.stringify({
                startedAt: Date.now()
            })
        );
    }

    static getRunStartedAt(rootDir) {

        const runMarker =
            path.join(
                rootDir,
                '.cache/current-run-started.json'
            );

        if (!fs.existsSync(runMarker)) {
            return 0;
        }

        try {
            return JSON.parse(
                fs.readFileSync(runMarker, 'utf8')
            ).startedAt || 0;
        } catch {
            return 0;
        }
    }

    static normalizeTestName(name = '') {

        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    static scenarioDomainInTest(test, domain = '') {

        const pathText =
            `${test.fullName || ''} ${test.suite || ''} ${test.filePath || ''}`
                .toLowerCase();

        const slug =
            domain.replace(/-/g, '');

        return (
            pathText.includes(domain)
            || pathText.includes(slug)
            || pathText.includes(domain.replace(/-/g, '_'))
        );
    }

    static matchTestToScenario(test, scenario) {

        if (test.layer !== scenario.layer) {
            return false;
        }

        const testName =
            this.normalizeTestName(test.name);

        const title =
            this.normalizeTestName(
                scenario.title || scenario.id
            );

        if (testName === title) {
            return true;
        }

        const stripPrefix = (value) =>
            value.replace(
                /^(positive|negative|edge|e2e)\s*-\s*/,
                ''
            );

        if (
            stripPrefix(testName)
            === stripPrefix(title)
        ) {
            return true;
        }

        if (
            scenario.domain
            && !this.scenarioDomainInTest(test, scenario.domain)
        ) {
            return false;
        }

        return (
            testName.includes(stripPrefix(title))
            || stripPrefix(title).includes(testName)
        );
    }

    static findMatchingTest(tests = [], scenario = {}) {

        return tests.find(test =>
            this.matchTestToScenario(test, scenario)
        ) || null;
    }

    static resolveGenerationDomains(rootDir, report = {}) {

        const fromReport =
            report.generation?.domains || [];

        if (fromReport.length > 0) {
            return fromReport;
        }

        const manifestPath =
            path.join(
                rootDir,
                'tests/generated/regression/manifest.json'
            );

        if (fs.existsSync(manifestPath)) {
            try {
                const manifest =
                    JSON.parse(
                        fs.readFileSync(manifestPath, 'utf8')
                    );

                if (manifest.domains?.length > 0) {
                    return manifest.domains;
                }
            } catch {
                // fall through
            }
        }

        return this.buildDomainsFromSpecs(rootDir);
    }

    static buildDomainsFromSpecs(rootDir) {

        const ScenarioSelector =
            require('../agents/generator/ScenarioSelector');

        const specDir =
            path.join(
                rootDir,
                'tests/generated/regression'
            );

        if (!fs.existsSync(specDir)) {
            return [];
        }

        const catalog =
            ScenarioSelector.loadCatalog();

        const domainLayers =
            new Map();

        for (const file of fs.readdirSync(specDir)) {

            const match =
                file.match(
                    /^([^.]+)\.(api|db|ui)\.spec\.js$/
                );

            if (!match) {
                continue;
            }

            const domain = match[1];
            const layer = match[2];

            if (!domainLayers.has(domain)) {
                domainLayers.set(domain, new Set());
            }

            domainLayers.get(domain).add(layer);
        }

        const domains = [];

        for (const [domain, layers] of domainLayers) {

            const domainMeta = {
                domain,
                layers: [...layers],
                scenarios: {}
            };

            for (const layer of layers) {

                const items =
                    catalog.filter(item =>
                        item.domain === domain
                        && item.layer === layer
                    );

                domainMeta.scenarios[layer] = {
                    total: items.length,
                    positive:
                        items.filter(s =>
                            s.type === 'positive'
                        ).length,
                    negative:
                        items.filter(s =>
                            s.type === 'negative'
                        ).length,
                    edge:
                        items.filter(s =>
                            s.type === 'edge'
                        ).length,
                    scenarios: items.map(item => ({
                        id: item.id,
                        type: item.type,
                        title: item.title,
                        tier: item.tier
                    }))
                };
            }

            domains.push(domainMeta);
        }

        return domains.sort((a, b) =>
            a.domain.localeCompare(b.domain)
        );
    }

    static buildScenarioSummary(
        rootDir,
        report = {},
        tests = []
    ) {

        const ScenarioSelector =
            require('../agents/generator/ScenarioSelector');

        const executed =
            report?.execution?.executed === true
            || tests.length > 0;

        const scenarios = [];

        const generationDomains =
            this.resolveGenerationDomains(
                rootDir,
                report
            );

        for (const domain of generationDomains) {

            if (!domain.scenarios) {
                continue;
            }

            for (const [layer, summary] of Object.entries(domain.scenarios)) {

                for (const scenario of summary.scenarios || []) {

                    const catalogEntry =
                        ScenarioSelector.findInCatalog({
                            domain: domain.domain,
                            layer,
                            id: scenario.id
                        });

                    const title =
                        scenario.title
                        || catalogEntry?.title
                        || scenario.id;

                    const enriched = {
                        domain: domain.domain,
                        layer,
                        id: scenario.id,
                        type: scenario.type,
                        title,
                        tier: scenario.tier || catalogEntry?.tier || null
                    };

                    const matchedTest =
                        this.findMatchingTest(tests, enriched);

                    scenarios.push({
                        ...enriched,
                        status:
                            matchedTest?.status
                            || (executed ? 'pending' : 'not_run'),
                        executed: Boolean(matchedTest),
                        testUuid: matchedTest?.uuid || null,
                        error:
                            matchedTest?.error
                                ? this.stripAnsi(matchedTest.error).slice(0, 200)
                                : null
                    });
                }

                if (!summary.scenarios?.length) {
                    scenarios.push({
                        domain: domain.domain,
                        layer,
                        id: `${domain.domain}-${layer}-core`,
                        type: 'core',
                        title: `${domain.domain} ${layer} core coverage`,
                        status: 'pending',
                        executed: false,
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

    static buildScenarioTypeStats(scenarios = []) {

        const types =
            ['positive', 'negative', 'edge', 'core'];

        const stats = {};

        for (const type of types) {

            const items =
                scenarios.filter(s => s.type === type);

            stats[type] = {
                total: items.length,
                passed:
                    items.filter(s => s.status === 'passed').length,
                failed:
                    items.filter(s =>
                        s.status === 'failed'
                        || s.status === 'broken'
                    ).length,
                skipped:
                    items.filter(s => s.status === 'skipped').length,
                pending:
                    items.filter(s => s.status === 'pending').length,
                notRun:
                    items.filter(s => s.status === 'not_run').length
            };
        }

        stats.overall = {
            total: scenarios.length,
            passed:
                scenarios.filter(s => s.status === 'passed').length,
            failed:
                scenarios.filter(s =>
                    s.status === 'failed'
                    || s.status === 'broken'
                ).length,
            skipped:
                scenarios.filter(s => s.status === 'skipped').length,
            pending:
                scenarios.filter(s => s.status === 'pending').length,
            notRun:
                scenarios.filter(s => s.status === 'not_run').length
        };

        return stats;
    }

    static buildDataIntegrityAlerts(feed = []) {

        const alerts = [];

        for (const item of feed) {

            if (item.type !== 'db') {
                continue;
            }

            if (
                item.verification === 'connectivity'
                || item.verification === 'skipped'
            ) {
                continue;
            }

            const rowsFound =
                item.rowsFound
                ?? item.record?.rowsFound
                ?? null;

            if (
                item.status === 'failed'
                || (
                    item.verification === 'row-required'
                    && rowsFound === 0
                )
            ) {
                alerts.push({
                    id: item.id,
                    title: item.title,
                    rowsFound,
                    verification:
                        item.verification || 'row-required',
                    orderCode:
                        item.record?.orderCode || null,
                    message:
                        item.record?.reason
                        || (
                            rowsFound === 0
                                ? 'Expected DB row was not found for this verification.'
                                : 'DB verification failed.'
                        ),
                    timestamp: item.timestamp
                });
            }
        }

        return alerts;
    }

    static stripAnsi(text = '') {

        return text.replace(
            /\u001b\[[0-9;]*m/g,
            ''
        );
    }

    static buildFailureAnalysis(tests = []) {

        const FailureAnalyzer =
            require('../agents/llm/FailureAnalyzer');

        const failedStatuses =
            ['failed', 'broken'];

        return tests
            .filter(test =>
                failedStatuses.includes(test.status)
            )
            .map(test => {

                const error =
                    this.stripAnsi(test.error || 'Unknown error');

                const trace =
                    this.stripAnsi(test.trace || '');

                const analysis =
                    FailureAnalyzer.ruleBasedAnalyze({
                        testName: test.name,
                        error,
                        stackTrace: trace
                    });

                const screenshot =
                    test.attachments?.find(att =>
                        att.source?.endsWith('.png')
                    );

                const video =
                    test.attachments?.find(att =>
                        att.source?.endsWith('.webm')
                    );

                return {
                    uuid: test.uuid,
                    name: test.name,
                    layer: test.layer,
                    status: test.status,
                    error: error.slice(0, 500),
                    failureType: analysis.failureType,
                    rootCause: analysis.rootCause,
                    suggestedFix: analysis.suggestedFix,
                    confidence: analysis.confidence,
                    screenshot: screenshot?.url || null,
                    video: video?.url || null
                };
            })
            .sort((a, b) =>
                a.layer.localeCompare(b.layer)
            );
    }

    static openReport(rootDir) {

        const paths =
            this.getPaths(rootDir);

        const reportReady =
            fs.existsSync(
                path.join(paths.report, 'index.html')
            );

        if (!reportReady) {
            this.generateReport(rootDir).catch(() => {});
        }

        return {
            opened: true,
            reportPath: paths.report,
            reportReady,
            browserUrl: '/reports/allure/index.html',
            note:
                reportReady
                    ? 'Report ready at /reports/allure/index.html'
                    : 'Report is generating — refresh in a few seconds'
        };
    }

    static buildEvidenceSummary(
        rootDir,
        report = null,
        options = {}
    ) {

        const now = Date.now();
        const ttl =
            options.live ? 1500 : 10000;

        if (
            !options.live
            && evidenceCache.data
            && evidenceCache.expiresAt > now
        ) {
            return evidenceCache.data;
        }

        const summary =
            this.buildEvidenceSummaryUncached(
                rootDir,
                report,
                options
            );

        evidenceCache = {
            data: summary,
            expiresAt: now + ttl
        };

        return summary;
    }

    static buildEvidenceSummaryUncached(
        rootDir,
        report = null,
        options = {}
    ) {

        const reportData =
            report
            || this.readLatestReport(rootDir);

        const runStartedAt =
            this.getRunStartedAt(rootDir);

        let tests =
            this.parseAllureResults(rootDir, {
                sinceMs: runStartedAt
            });

        if (
            options.live
            && tests.length === 0
            && this.hasAllureResultFiles(rootDir)
        ) {
            tests =
                this.parseAllureResults(rootDir, {
                    sinceMs: 0
                });
        }

        const executionPassed =
            reportData?.execution?.passed ?? null;

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
            this.collectPlaywrightArtifacts(rootDir, {
                sinceMs: runStartedAt
            });

        const { report: reportDir } =
            this.getPaths(rootDir);

        const reportExists =
            fs.existsSync(
                path.join(reportDir, 'index.html')
            );

        const failures =
            executionPassed === true
                ? []
                : this.buildFailureAnalysis(tests);

        const feed =
            this.buildEvidenceFeed(rootDir, {
                sinceMs: runStartedAt
            });

        const scenariosConsidered =
            this.buildScenarioSummary(
                rootDir,
                reportData,
                tests
            );

        const dataIntegrityAlerts =
            this.buildDataIntegrityAlerts(feed);

        const reportGeneratedAt =
            reportData?.timestamp
                ? new Date(reportData.timestamp).getTime()
                : null;

        const lastEvidenceAt =
            feed.length > 0
                ? Math.max(
                    ...feed.map(item => item.timestamp || 0)
                )
                : null;

        const apiFeedCount =
            feed.filter(item => item.type === 'api').length;

        const dbFeedCount =
            feed.filter(item => item.type === 'db').length;

        const executionRan =
            reportData?.execution?.executed === true;

        const evidenceStale =
            !executionRan
            && reportGeneratedAt
            && runStartedAt > 0
            && reportGeneratedAt > runStartedAt;

        return {
            reportExists,
            hasResultFiles: this.hasAllureResultFiles(rootDir),
            allureReportUrl: '/reports/allure/index.html',
            evidenceFreshness: {
                runStartedAt: runStartedAt || null,
                lastEvidenceAt,
                reportGeneratedAt,
                executionRan,
                evidenceStale,
                apiFeedCount,
                dbFeedCount,
                liveFeedEntries:
                    this.readLiveFeed(rootDir).filter(entry => {
                        const entryTime =
                            entry.timestamp || 0;

                        return !(
                            runStartedAt > 0
                            && entryTime > 0
                            && entryTime < runStartedAt
                        );
                    }).length
            },
            executionState: {
                executed:
                    reportData?.execution?.executed ?? false,
                running:
                    reportData?.execution?.running ?? false,
                passed:
                    reportData?.execution?.passed ?? null,
                reason:
                    reportData?.execution?.reason || null
            },
            regressionReport: reportData,
            diffSignals:
                reportData?.diffAnalysis?.signals || [],
            scenariosConsidered,
            scenarioStats:
                this.buildScenarioTypeStats(scenariosConsidered),
            dataIntegrityAlerts,
            selectedTests:
                reportData?.tests || [],
            layers: layerStats,
            failures,
            failureCount: failures.length,
            executionPassed:
                reportData?.execution?.passed ?? null,
            artifacts,
            feed,
            feedCount: feed.length,
            generatedAt:
                reportData?.timestamp || null
        };
    }

    static hasAllureResultFiles(rootDir) {

        const { results } =
            this.getPaths(rootDir);

        if (!fs.existsSync(results)) {
            return false;
        }

        return fs.readdirSync(results)
            .some(file =>
                file.endsWith('-result.json')
            );
    }

    static syncReportExecution(report, rootDir) {

        if (!report) {
            return report;
        }

        const tests =
            this.parseAllureResults(rootDir, {
                sinceMs: this.getRunStartedAt(rootDir)
            });

        const passed =
            tests.length > 0
            && tests.every(test =>
                test.status === 'passed'
                || test.status === 'skipped'
            );

        const failed =
            tests.filter(test =>
                test.status === 'failed'
                || test.status === 'broken'
            ).length;

        report.execution = {
            ...(report.execution || {}),
            executed: tests.length > 0
                || report.execution?.executed === true,
            running: false,
            passed:
                tests.length > 0
                    ? failed === 0
                    : report.execution?.passed ?? null,
            testResults: {
                total: tests.length,
                passed:
                    tests.filter(t => t.status === 'passed').length,
                failed,
                skipped:
                    tests.filter(t => t.status === 'skipped').length
            }
        };

        return report;
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

    static generateReport(rootDir, options = {}) {

        const paths =
            this.getPaths(rootDir);

        if (
            fs.existsSync(
                path.join(paths.report, 'index.html')
            )
            && !options.force
        ) {
            return Promise.resolve({
                generated: true,
                reportPath: paths.report,
                cached: true
            });
        }

        if (generateInProgress) {
            return Promise.resolve({
                generated: false,
                inProgress: true,
                reportPath: paths.report
            });
        }

        generateInProgress = true;
        evidenceCache.expiresAt = 0;

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

        return new Promise((resolve, reject) => {

            const child = spawn(
                'npx',
                [
                    'allure',
                    'generate',
                    'allure-results',
                    '--clean',
                    '-o',
                    'allure-report'
                ],
                {
                    cwd: rootDir,
                    stdio: 'pipe',
                    shell: process.platform === 'win32'
                }
            );

            child.on('close', (code) => {

                generateInProgress = false;
                evidenceCache.expiresAt = 0;

                if (code === 0) {
                    resolve({
                        generated: true,
                        reportPath: paths.report
                    });
                    return;
                }

                reject(
                    new Error(
                        `Allure generate failed (exit ${code})`
                    )
                );
            });

            child.on('error', (error) => {
                generateInProgress = false;
                reject(error);
            });
        });
    }

    static generateReportSync(rootDir) {

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
