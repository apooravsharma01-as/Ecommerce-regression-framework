const fs = require('fs');
const path = require('path');
const DOMAIN_TEMPLATES =
    require('./templates');
const ScenarioSelector =
    require('./ScenarioSelector');

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
    }
};

class TestGenerator {

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
                        trigger: impactResult.trigger,
                        diffAnalysis,
                        story
                    });

                if (!layerSelection?.content) {
                    continue;
                }

                if (layerSelection.summary) {
                    domainMeta.scenarios[layer] =
                        layerSelection.summary;
                }

                const fileContent =
                    layerSelection.content;

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
        story
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
                LAYER_IMPORTS[domain]?.[layer] || '';

            const describeTitle =
                LAYER_DESCRIBE[domain]?.[layer]
                || `Regression: ${domain}`;

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

${imports}

test.describe(
    '${describeTitle}',
    () => {

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
