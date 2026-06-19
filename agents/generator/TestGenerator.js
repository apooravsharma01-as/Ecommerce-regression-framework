const fs = require('fs');
const path = require('path');
const DOMAIN_TEMPLATES =
    require('./templates');
const ScenarioSelector =
    require('./ScenarioSelector');
const FlowScaffold =
    require('../scaffold/FlowScaffold');

const LAYER_IMPORTS = {
    'product-creation': {
        api: `const { ProductApi } =
    require('../../../api/ProductApi');`,
        db: `const {
    ProductQueries
} = require('../../../database/queries/ProductQueries');`
    },
    'sale-order': {
        api: `const { SaleOrderApi } =
    require('../../../api/SaleOrderApi');`,
        db: `const { SaleOrderApi } =
    require('../../../api/SaleOrderApi');

const {
    SaleOrderQueries
} = require('../../../database/queries/SaleOrderQueries');`
    },
    'sale-order-cancellation': {
        api: `const { SaleOrderApi } =
    require('../../../api/SaleOrderApi');

const OrderLifecycleHelper =
    require('../../../utils/OrderLifecycleHelper');`,
        db: `const OrderLifecycleHelper =
    require('../../../utils/OrderLifecycleHelper');

const {
    ShippingPackageQueries
} = require('../../../database/queries/ShippingPackageQueries');`
    }
};

const LAYER_DESCRIBE = {
    'product-creation': {
        api: 'Regression: Product Creation',
        db: 'Regression: Product DB'
    },
    'sale-order': {
        api: 'Regression: Sale Order',
        db: 'Regression: Sale Order DB'
    },
    'sale-order-cancellation': {
        api: 'Regression: Sale Order Cancellation',
        db: 'Regression: Sale Order Cancellation DB'
    }
};

const EVIDENCE_HOOK = `const EvidenceContextHook =
    require('../../../tests/hooks/evidenceContextHook');

test.beforeEach(({}, testInfo) => {
    EvidenceContextHook.bind(testInfo);
});
`;

const SCENARIO_CATALOG_DOMAINS =
    new Set([
        'product-creation',
        'sale-order',
        'sale-order-cancellation'
    ]);

class TestGenerator {

    static getScaffoldImports(rootDir, domain, layer) {

        const manifest =
            FlowScaffold.loadManifest(rootDir);

        const flow =
            manifest?.flows?.find(item =>
                item.id === domain
            );

        if (!flow) {
            return '';
        }

        if (layer === 'api' && flow.files?.api) {
            const className =
                flow.apiClass;

            return `const { ${className} } =
    require('../../../${flow.files.api}');`;
        }

        if (layer === 'db' && flow.files?.db) {

            const imports = [];

            if (flow.files?.api && flow.apiClass) {
                imports.push(
                    `const { ${flow.apiClass} } =
    require('../../../${flow.files.api}');`
                );
            }

            imports.push(
                `const { ${flow.dbClass} } =
    require('../../../${flow.files.db}');`
            );

            return imports.join('\n\n');
        }

        if (layer === 'ui' && flow.files?.page) {
            const className =
                flow.pageClass;

            return `const { ${className} } =
    require('../../../${flow.files.page}');`;
        }

        return '';
    }

    static getDescribeTitle(domain, layer) {

        const titles = {
            dispatch: {
                api: 'Regression: Dispatch',
                db: 'Regression: Dispatch DB',
                ui: 'Regression: Dispatch UI'
            },
            shipment: {
                api: 'Regression: Shipment',
                db: 'Regression: Shipment DB',
                ui: 'Regression: Shipment UI'
            },
            picking: {
                api: 'Regression: Picking',
                db: 'Regression: Picking DB',
                ui: 'Regression: Picking UI'
            },
            packing: {
                api: 'Regression: Packing',
                db: 'Regression: Packing DB',
                ui: 'Regression: Packing UI'
            },
            putaway: {
                api: 'Regression: Putaway',
                db: 'Regression: Putaway DB',
                ui: 'Regression: Putaway UI'
            },
            grn: {
                api: 'Regression: GRN',
                db: 'Regression: GRN DB',
                ui: 'Regression: GRN UI'
            },
            returns: {
                api: 'Regression: Returns',
                db: 'Regression: Returns DB',
                ui: 'Regression: Returns UI'
            }
        };

        return titles[domain]?.[layer]
            || `Regression: ${domain}`;
    }

    static sanitizeForComment(text = '') {

        return String(text)
            .replace(/[\r\n]+/g, ' | ')
            .replace(/\*\//g, '')
            .trim()
            .slice(0, 200);
    }

    static generate(impactResult, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const outputDir =
            path.join(
                rootDir,
                'tests/generated/regression'
            );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generated = [];
        const domains =
            impactResult.domains || [];

        const diffAnalysis =
            options.diffAnalysis
            || impactResult.diffAnalysis
            || {};

        const story =
            options.story
            || impactResult.trigger
            || '';

        const safeTrigger =
            this.sanitizeForComment(
                impactResult.trigger || story
            );

        const meta = {
            trigger: impactResult.trigger,
            generatedAt: new Date().toISOString(),
            diffAnalysis,
            domains: [],
            files: []
        };

        for (const domain of domains) {

            const domainMeta = {
                domain,
                layers: [],
                scenarios: {}
            };

            for (const layer of ['api', 'ui', 'db']) {

                if (
                    !this.shouldGenerateLayer(
                        impactResult,
                        domain,
                        layer
                    )
                ) {
                    continue;
                }

                const layerSelection =
                    this.buildLayerSpec({
                        domain,
                        layer,
                        trigger: safeTrigger,
                        diffAnalysis,
                        story,
                        rootDir
                    });

                if (!layerSelection?.content) {
                    continue;
                }

                if (layerSelection.summary) {
                    domainMeta.scenarios[layer] =
                        layerSelection.summary;
                }

                let fileContent =
                    layerSelection.content;

                if (layer === 'ui') {
                    fileContent =
                        `const UiEvidenceHook =
    require('../../../tests/hooks/uiEvidenceHook');

${fileContent}`;

                    fileContent =
                        fileContent.replace(
                            'test.describe(',
                            `test.use({
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    viewport: { width: 1920, height: 1080 }
});

test.afterEach(async ({ page }, testInfo) => {
    await UiEvidenceHook.attachVideo(page, testInfo);
});

test.describe(`
                        );
                }

                const file =
                    path.join(
                        outputDir,
                        `${domain}.${layer}.spec.js`
                    );

                fs.writeFileSync(
                    file,
                    fileContent.trim() + '\n'
                );

                const relative =
                    path.relative(rootDir, file);

                generated.push(relative);
                domainMeta.layers.push(layer);
                meta.files.push(relative);
            }

            if (domainMeta.layers.length > 0) {
                meta.domains.push(domainMeta);
            }
        }

        fs.writeFileSync(
            path.join(outputDir, 'manifest.json'),
            JSON.stringify(meta, null, 2)
        );

        return {
            generated,
            manifest: meta,
            outputDir
        };
    }

    static buildLayerSpec({
        domain,
        layer,
        trigger,
        diffAnalysis,
        story,
        rootDir
    }) {

        const scenarios =
            ScenarioSelector.select({
                domain,
                layer,
                diffAnalysis,
                story
            });

        if (scenarios.length > 0) {

            const summary =
                ScenarioSelector.summarize(scenarios);

            const imports =
                LAYER_IMPORTS[domain]?.[layer]
                || this.getScaffoldImports(
                    rootDir || process.cwd(),
                    domain,
                    layer
                );

            const describeTitle =
                LAYER_DESCRIBE[domain]?.[layer]
                || this.getDescribeTitle(domain, layer);

            const tests =
                scenarios
                    .map(scenario =>
                        scenario.code({
                            domain,
                            trigger
                        }).trim()
                    )
                    .join('\n\n');

            return {
                summary,
                content: `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}
// Scenarios: ${summary.positive} positive, ${summary.negative} negative, ${summary.edge} edge

const { test, expect } =
    require('@playwright/test');

const EvidenceLogger =
    require('../../../utils/EvidenceLogger');

${imports}

test.describe(
    '${describeTitle}',
    () => {

${EVIDENCE_HOOK}
${layer === 'db' ? `
test.beforeEach(() => {
    const DbVerify =
        require('../../../database/DbVerify');
    DbVerify.skipIfApiDbMismatch(test);
});
` : ''}
${tests}
    }
);
`
            };
        }

        const templates =
            DOMAIN_TEMPLATES[domain];

        if (!templates || !templates[layer]) {
            return null;
        }

        return {
            summary: null,
            content: templates[layer]({
                domain,
                trigger
            })
        };
    }

    static shouldGenerateLayer(impactResult, domain, layer) {

        if (LAYER_IMPORTS[domain]?.[layer]) {
            return true;
        }

        if (layer === 'api') {
            return (
                impactResult.impactedAPI.length > 0
                || (impactResult.endpoints || []).length > 0
            );
        }

        if (layer === 'db') {
            return (
                impactResult.impactedDB.length > 0
                || (impactResult.tables || []).length > 0
            );
        }

        if (layer === 'ui') {
            return impactResult.impactedUI.length > 0;
        }

        return false;
    }
}

module.exports = TestGenerator;
