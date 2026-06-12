const fs = require('fs');
const path = require('path');
const DependencyScanner =
    require('../dependency/DependencyScanner');
const UniwareSourceTracer =
    require('../uniware/UniwareSourceTracer');
const GitImpactScanner =
    require('../uniware/GitImpactScanner');

class ImpactAnalyzer {

    static analyze(options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const impactMap =
            this.loadImpactMap(rootDir);

        const graph =
            DependencyScanner.loadOrBuild(
                rootDir,
                path.join(rootDir, '.cache/dependency-graph.json')
            );

        const uniwareTrace =
            UniwareSourceTracer.trace();

        const result = {
            trigger: null,
            changedFiles: [],
            domains: [],
            impactedUI: [],
            impactedAPI: [],
            impactedDB: [],
            tables: [],
            endpoints: [],
            selectedTests: [],
            confidence: {}
        };

        if (options.story) {

            const storyImpact =
                this.analyzeStory(
                    options.story,
                    impactMap,
                    graph
                );

            Object.assign(result, storyImpact);
            result.trigger = options.story;

        }

        if (options.simulateChangedFiles?.length > 0) {

            const diffImpact =
                this.analyzeChangedFiles(
                    options.simulateChangedFiles,
                    UniwareSourceTracer.findByChangedFiles(
                        options.simulateChangedFiles
                    ),
                    impactMap,
                    graph,
                    uniwareTrace
                );

            result.changedFiles =
                diffImpact.changedFiles;

            result.domains =
                this.mergeUnique(
                    result.domains,
                    diffImpact.domains
                );

            result.impactedUI =
                this.mergeUnique(
                    result.impactedUI,
                    diffImpact.impactedUI
                );

            result.impactedAPI =
                this.mergeUnique(
                    result.impactedAPI,
                    diffImpact.impactedAPI
                );

            result.impactedDB =
                this.mergeUnique(
                    result.impactedDB,
                    diffImpact.impactedDB
                );

            result.tables =
                this.mergeUnique(
                    result.tables,
                    diffImpact.tables
                );

            result.endpoints =
                this.mergeUnique(
                    result.endpoints,
                    diffImpact.endpoints
                );

            if (!result.trigger) {
                result.trigger =
                    'simulated uniware change';
            }
        }

        if (options.gitDiff) {

            const gitImpact =
                GitImpactScanner.analyze({
                    repoPath: options.uniwarePath,
                    baseBranch: options.baseBranch || 'production',
                    simulateFiles: options.simulateChangedFiles
                });

            if (gitImpact.changedFiles.length > 0) {

                const diffImpact =
                    this.analyzeChangedFiles(
                        gitImpact.changedFiles,
                        gitImpact.uniwareImpact,
                        impactMap,
                        graph,
                        uniwareTrace
                    );

                result.changedFiles =
                    diffImpact.changedFiles;

                result.domains =
                    this.mergeUnique(
                        result.domains,
                        diffImpact.domains
                    );

                result.impactedUI =
                    this.mergeUnique(
                        result.impactedUI,
                        diffImpact.impactedUI
                    );

                result.impactedAPI =
                    this.mergeUnique(
                        result.impactedAPI,
                        diffImpact.impactedAPI
                    );

                result.impactedDB =
                    this.mergeUnique(
                        result.impactedDB,
                        diffImpact.impactedDB
                    );

                result.tables =
                    this.mergeUnique(
                        result.tables,
                        diffImpact.tables
                    );

                result.endpoints =
                    this.mergeUnique(
                        result.endpoints,
                        diffImpact.endpoints
                    );

                if (!result.trigger) {
                    result.trigger =
                        `git diff (${gitImpact.baseBranch})`;
                }
            }
        }

        if (options.additionalDomains?.length > 0) {
            result.domains =
                this.mergeUnique(
                    result.domains,
                    options.additionalDomains
                );
        }

        result.domains =
            [...new Set(
                result.domains.filter(d => d !== 'other')
            )];

        result.selectedTests =
            this.selectTests(result, graph);

        result.confidence =
            this.scoreTests(result, graph);

        return result;
    }

    static analyzeStory(story, impactMap, graph) {

        const lower =
            story.toLowerCase();

        const domains = [];

        for (const [domainId, domain] of Object.entries(impactMap.domains)) {

            const matched =
                domain.keywords.some(keyword => {

                    const key =
                        keyword.toLowerCase();

                    if (key.includes(' ')) {
                        return lower.includes(key);
                    }

                    const pattern =
                        new RegExp(
                            `\\b${key}\\b`
                        );

                    return pattern.test(lower);
                });

            if (matched) {
                domains.push(domainId);
            }
        }

        const impacted =
            this.mapDomainsToAssets(
                domains,
                graph,
                impactMap
            );

        return {
            domains,
            ...impacted
        };
    }

    static analyzeChangedFiles(changedFiles, uniwareImpact, impactMap, graph, uniwareTrace) {

        const domains =
            [...uniwareImpact.domains];

        for (const file of changedFiles) {

            const lower =
                file.toLowerCase();

            for (const [domainId, domain] of Object.entries(impactMap.domains)) {

                const matched =
                    (domain.uniwarePatterns || []).some(pattern =>
                        lower.includes(pattern.toLowerCase())
                    );

                if (matched && !domains.includes(domainId)) {
                    domains.push(domainId);
                }
            }
        }

        const impacted =
            this.mapDomainsToAssets(
                domains,
                graph,
                impactMap,
                uniwareTrace
            );

        return {
            changedFiles,
            domains,
            endpoints: [
                ...new Set([
                    ...uniwareImpact.endpoints,
                    ...impacted.endpoints || []
                ])
            ],
            tables: [
                ...new Set([
                    ...uniwareImpact.tables,
                    ...impacted.tables || []
                ])
            ],
            impactedUI: impacted.impactedUI,
            impactedAPI: impacted.impactedAPI,
            impactedDB: impacted.impactedDB
        };
    }

    static mapDomainsToAssets(domains, graph, impactMap, uniwareTrace = null) {

        const impactedUI = [];
        const impactedAPI = [];
        const impactedDB = [];
        const endpoints = [];
        const tables = [];

        for (const domainId of domains) {

            const domainConfig =
                impactMap.domains[domainId];

            if (domainConfig) {
                endpoints.push(...(domainConfig.endpoints || []));
                tables.push(...(domainConfig.tables || []));
            }

            if (
                uniwareTrace
                && uniwareTrace.domains[domainId]
                && !domainConfig
            ) {

                endpoints.push(
                    ...uniwareTrace.domains[domainId].endpoints
                );

                tables.push(
                    ...uniwareTrace.domains[domainId].tables
                );
            }
        }

        for (const node of graph.nodes) {

            const nodeDomains =
                this.getNodeDomains(node);

            const isImpacted =
                domains.some(d =>
                    nodeDomains.includes(d)
                );

            if (!isImpacted) {
                continue;
            }

            if (node.layer === 'ui' || node.type === 'page') {
                impactedUI.push(node.id);
            }

            if (node.layer === 'api' || node.type === 'api') {
                impactedAPI.push(node.id);
            }

            if (node.layer === 'db' || node.type === 'query') {
                impactedDB.push(node.id);
            }

            for (const endpoint of node.endpoints) {

                if (endpoint.startsWith('/data/')) {
                    endpoints.push(endpoint);
                }
            }

            tables.push(...node.tables);
        }

        return {
            impactedUI: [...new Set(impactedUI)],
            impactedAPI: [...new Set(impactedAPI)],
            impactedDB: [...new Set(impactedDB)],
            endpoints: [...new Set(endpoints)],
            tables: [...new Set(tables)]
        };
    }

    static getNodeDomains(node) {

        if (
            node.id.includes('VendorCatalog')
            || node.id.includes('vendorCatalog')
        ) {
            return ['vendor-catalog'];
        }

        if (
            node.id.includes('SaleOrder')
            || node.id.includes('saleOrder')
        ) {
            return ['sale-order'];
        }

        if (
            node.id.includes('Inventory')
            || node.id.includes('inventory')
        ) {
            return ['inventory'];
        }

        const domains = [];
        const tagDomainMap = {
            gst: 'product-creation',
            tax: 'product-creation',
            product: 'product-creation',
            sku: 'product-creation',
            item_type: 'product-creation',
            login: 'login-auth',
            saleorder: 'sale-order',
            sale_order: 'sale-order',
            vendor: 'vendor-catalog',
            vendor_item_type: 'vendor-catalog',
            inventory: 'inventory',
            stock: 'inventory'
        };

        for (const tag of node.tags || []) {

            if (tagDomainMap[tag]) {
                domains.push(tagDomainMap[tag]);
            }
        }

        if (node.id.includes('Product')) {
            domains.push('product-creation');
        }

        if (node.id.includes('Login')) {
            domains.push('login-auth');
        }

        if (node.id.includes('login.spec')) {
            domains.push('product-creation');
            domains.push('login-auth');
        }

        return [...new Set(domains)];
    }

    static selectTests(result, graph) {

        const tests = new Set();

        for (const node of graph.nodes) {

            if (node.type !== 'test') {
                continue;
            }

            if (node.id.includes('hooks')) {
                continue;
            }

            const score =
                this.getTestScore(node, result, graph);

            if (score >= 0.5) {
                tests.add(node.id);
            }
        }

        for (const ui of result.impactedUI) {

            for (const node of graph.nodes) {

                if (
                    node.type === 'test'
                    && node.imports.includes(ui)
                ) {
                    tests.add(node.id);
                }
            }
        }

        return [...tests];
    }

    static scoreTests(result, graph) {

        const scores = {};

        for (const test of result.selectedTests) {

            const node =
                graph.nodes.find(n => n.id === test);

            if (node) {
                scores[test] =
                    this.getTestScore(node, result, graph);
            }
        }

        return scores;
    }

    static getTestScore(testNode, result, graph) {

        let score = 0;

        for (const domain of result.domains) {

            const nodeDomains =
                this.getNodeDomains(testNode);

            if (nodeDomains.includes(domain)) {
                score += 0.4;
            }
        }

        for (const imp of testNode.imports || []) {

            if (result.impactedUI.includes(imp)) {
                score += 0.3;
            }

            if (result.impactedAPI.includes(imp)) {
                score += 0.3;
            }

            if (result.impactedDB.includes(imp)) {
                score += 0.3;
            }
        }

        if (testNode.layer === 'ui' && result.domains.includes('product-creation')) {
            score += 0.2;
        }

        return Math.min(score, 1);
    }

    static loadImpactMap(rootDir) {

        const mapPath =
            path.join(rootDir, 'config/impactMap.json');

        return JSON.parse(
            fs.readFileSync(mapPath, 'utf8')
        );
    }

    static mergeUnique(a, b) {
        return [...new Set([...a, ...b])];
    }
}

module.exports = ImpactAnalyzer;
