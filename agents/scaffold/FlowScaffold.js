const fs = require('fs');
const path = require('path');
const flowDefinitions =
    require('./flowDefinitions');
const UniwareSourceTracer =
    require('../uniware/UniwareSourceTracer');
const UniwareEndpointExtractor =
    require('../uniware/UniwareEndpointExtractor');
const ApiClientGenerator =
    require('./generators/ApiClientGenerator');
const DbQueryGenerator =
    require('./generators/DbQueryGenerator');
const PageObjectGenerator =
    require('./generators/PageObjectGenerator');
const ScenarioGenerator =
    require('./generators/ScenarioGenerator');

class FlowScaffold {

    static getManifestPath(rootDir) {

        return path.join(
            rootDir,
            '.cache/scaffold-manifest.json'
        );
    }

    static loadManifest(rootDir) {

        const manifestPath =
            this.getManifestPath(rootDir);

        if (!fs.existsSync(manifestPath)) {
            return null;
        }

        return JSON.parse(
            fs.readFileSync(manifestPath, 'utf8')
        );
    }

    static saveManifest(rootDir, manifest) {

        const manifestPath =
            this.getManifestPath(rootDir);

        fs.mkdirSync(
            path.dirname(manifestPath),
            { recursive: true }
        );

        fs.writeFileSync(
            manifestPath,
            JSON.stringify(manifest, null, 2)
        );
    }

    static scaffoldFromStory(story, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const uniwarePath =
            options.uniwarePath
            || UniwareSourceTracer.getUniwarePath();

        const existingDomains =
            new Set(options.existingDomains || []);

        const trace =
            UniwareSourceTracer.trace();

        if (!trace.available) {
            return {
                scaffolded: false,
                reason: `Uniware not found at ${uniwarePath}`,
                flows: [],
                domains: []
            };
        }

        const flowIds =
            UniwareEndpointExtractor.matchFlows(
                story,
                flowDefinitions
            );

        if (!flowIds.length) {
            return {
                scaffolded: false,
                reason: 'No Uniware flow keywords matched in story',
                flows: [],
                domains: []
            };
        }

        const allEndpoints =
            UniwareEndpointExtractor.extractAll(uniwarePath);

        const scaffoldedFlows = [];
        const newDomains = [];

        for (const flowId of flowIds) {

            const flow =
                flowDefinitions[flowId];

            const flowEndpoints =
                UniwareEndpointExtractor.filterEndpoints(
                    allEndpoints,
                    [flowId],
                    flowDefinitions
                ).filter(endpoint =>
                    endpoint.flowId === flowId
                    || endpoint.score > 0
                );

            if (!flowEndpoints.length) {
                continue;
            }

            const rankedEndpoints =
                flowEndpoints
                    .filter(endpoint =>
                        endpoint.path.includes('/oms/')
                        || endpoint.path.includes(flowId)
                    )
                    .sort((a, b) => {
                        const score = (endpoint) => {
                            let value = endpoint.score || 0;

                            if (
                                endpoint.path.includes('/create')
                                || endpoint.methodName
                                    ?.toLowerCase()
                                    .startsWith('create')
                            ) {
                                value += 5;
                            }

                            if (
                                endpoint.path.includes(flowId)
                            ) {
                                value += 2;
                            }

                            return value;
                        };

                        return score(b) - score(a);
                    })
                    .slice(0, 12);

            const finalEndpoints =
                rankedEndpoints.length > 0
                    ? rankedEndpoints
                    : flowEndpoints.slice(0, 12);

            const flowEntities =
                UniwareEndpointExtractor.filterEntities(
                    trace.entities,
                    [flowId],
                    flowDefinitions
                );

            const apiMeta =
                ApiClientGenerator.generate(
                    flow,
                    finalEndpoints,
                    { rootDir, uniwarePath }
                );

            const dbMeta =
                DbQueryGenerator.generate(
                    flow,
                    flowEntities,
                    { rootDir }
                );

            const pageMeta =
                PageObjectGenerator.generate(
                    flow,
                    { rootDir, uniwarePath }
                );

            const primaryMethod =
                ApiClientGenerator.toMethodName(
                    finalEndpoints[0]
                );

            const scenarioMeta =
                ScenarioGenerator.generate(
                    flow,
                    {
                        ...apiMeta,
                        primaryMethod,
                        primaryPath:
                            finalEndpoints[0].path
                    },
                    dbMeta,
                    { rootDir }
                );

            const domainConfig = {
                id: flowId,
                label: flow.label,
                keywords: flow.keywords,
                endpoints: finalEndpoints
                    .map(item => item.path),
                tables: flowEntities
                    .map(item => item.table),
                entities: flowEntities
                    .map(item => item.className),
                files: {
                    api: apiMeta.file,
                    db: dbMeta.file,
                    page: pageMeta.file,
                    scenarios: scenarioMeta.file
                },
                apiClass: apiMeta.className,
                dbClass: dbMeta.className,
                pageClass: pageMeta.className
            };

            scaffoldedFlows.push(domainConfig);

            if (!existingDomains.has(flowId)) {
                newDomains.push(flowId);
            }
        }

        const manifest = {
            generatedAt: new Date().toISOString(),
            story: story?.slice(0, 200) || null,
            uniwarePath,
            flows: scaffoldedFlows,
            domains: scaffoldedFlows.map(flow => flow.id),
            newDomains
        };

        this.saveManifest(rootDir, manifest);

        return {
            scaffolded: scaffoldedFlows.length > 0,
            reason: null,
            flows: scaffoldedFlows,
            domains: manifest.domains,
            newDomains,
            manifest
        };
    }

    static enrichImpact(impact, scaffoldResult) {

        if (
            !scaffoldResult?.scaffolded
            || !scaffoldResult.flows?.length
        ) {
            return impact;
        }

        const enriched = {
            ...impact,
            scaffolded: true,
            scaffoldFlows: scaffoldResult.flows
        };

        for (const flow of scaffoldResult.flows) {

            if (!enriched.domains.includes(flow.id)) {
                enriched.domains.push(flow.id);
            }

            for (const endpoint of flow.endpoints) {
                if (!enriched.endpoints.includes(endpoint)) {
                    enriched.endpoints.push(endpoint);
                }
            }

            for (const table of flow.tables) {
                if (!enriched.tables.includes(table)) {
                    enriched.tables.push(table);
                }
            }

            if (flow.files.api) {
                enriched.impactedAPI.push(flow.files.api);
            }

            if (flow.files.db) {
                enriched.impactedDB.push(flow.files.db);
            }

            if (flow.files.page) {
                enriched.impactedUI.push(flow.files.page);
            }
        }

        enriched.domains = [...new Set(enriched.domains)];
        enriched.endpoints = [...new Set(enriched.endpoints)];
        enriched.tables = [...new Set(enriched.tables)];
        enriched.impactedAPI = [...new Set(enriched.impactedAPI)];
        enriched.impactedDB = [...new Set(enriched.impactedDB)];
        enriched.impactedUI = [...new Set(enriched.impactedUI)];

        return enriched;
    }
}

module.exports = FlowScaffold;
