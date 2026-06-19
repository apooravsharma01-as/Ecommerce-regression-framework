const fs = require('fs');
const path = require('path');

const PRODUCT_SCENARIOS =
    require('./scenarios/product-creation');
const SALE_ORDER_SCENARIOS =
    require('./scenarios/sale-order');
const SALE_ORDER_CANCELLATION_SCENARIOS =
    require('./scenarios/sale-order-cancellation');

const DOMAIN_SCENARIOS = {
    'product-creation': PRODUCT_SCENARIOS,
    'sale-order': SALE_ORDER_SCENARIOS,
    'sale-order-cancellation':
        SALE_ORDER_CANCELLATION_SCENARIOS
};

function loadGeneratedScenarios() {

    const generatedDir =
        path.join(__dirname, 'scenarios/generated');

    if (!fs.existsSync(generatedDir)) {
        return {};
    }

    const generated = {};

    for (const file of fs.readdirSync(generatedDir)) {

        if (!file.endsWith('.js')) {
            continue;
        }

        const domainId =
            file.replace('.js', '');

        try {
            generated[domainId] =
                require(path.join(generatedDir, file));
        } catch {
            continue;
        }
    }

    return generated;
}

class ScenarioSelector {

    static extractTitle(scenario = {}) {

        if (scenario.title) {
            return scenario.title;
        }

        const code =
            typeof scenario.code === 'function'
                ? scenario.code()
                : '';

        const match =
            code.match(
                /test\s*\(\s*['"`]([^'"`]+)['"`]/
            );

        return match
            ? match[1]
            : scenario.id;
    }

    static loadCatalog() {

        const generated =
            loadGeneratedScenarios();

        const catalog = [];

        const addDomain = (domain, scenarios) => {

            if (!scenarios) {
                return;
            }

            for (const [layer, items] of Object.entries(scenarios)) {

                if (!Array.isArray(items)) {
                    continue;
                }

                for (const scenario of items) {
                    catalog.push({
                        domain,
                        layer,
                        id: scenario.id,
                        type: scenario.type,
                        tier: scenario.tier,
                        title: this.extractTitle(scenario)
                    });
                }
            }
        };

        for (const [domain, scenarios] of Object.entries(DOMAIN_SCENARIOS)) {
            addDomain(domain, scenarios);
        }

        for (const [domain, scenarios] of Object.entries(generated)) {
            addDomain(domain, scenarios);
        }

        return catalog;
    }

    static findInCatalog({
        domain,
        layer,
        id
    }) {

        return this.loadCatalog().find(item =>
            item.domain === domain
            && item.layer === layer
            && item.id === id
        );
    }

    static select({
        domain,
        layer,
        diffAnalysis = {},
        story = ''
    }) {

        const generated =
            loadGeneratedScenarios();

        const catalog =
            DOMAIN_SCENARIOS[domain]
            || generated[domain];

        if (!catalog || !catalog[layer]) {
            return [];
        }

        const scenarios =
            catalog[layer];

        const signals =
            new Set([
                ...(diffAnalysis.signals || []),
                ...this.storySignals(story)
            ]);

        const selected = [];

        for (const scenario of scenarios) {

            if (scenario.tier === 'core') {
                selected.push(scenario);
                continue;
            }

            if (
                diffAnalysis.hasValidationChange
                && scenario.type === 'negative'
            ) {
                selected.push(scenario);
                continue;
            }

            if (
                diffAnalysis.hasBoundaryChange
                && scenario.type === 'edge'
            ) {
                selected.push(scenario);
                continue;
            }

            if (
                diffAnalysis.hasGstChange
                && scenario.signals.some(signal =>
                    ['gst', 'tax', 'validation'].includes(signal)
                )
            ) {
                selected.push(scenario);
                continue;
            }

            const matched =
                scenario.signals.some(signal =>
                    signals.has(signal)
                );

            if (matched) {
                selected.push(scenario);
            }
        }

        const unique =
            [...new Map(
                selected.map(item => [item.id, item])
            ).values()];

        if (unique.length === 0) {
            return scenarios.filter(
                scenario => scenario.tier === 'core'
            );
        }

        return unique;
    }

    static storySignals(story = '') {

        const lower =
            story.toLowerCase();

        const signals = [];

        const map = {
            gst: ['gst'],
            tax: ['tax'],
            validation: ['validation', 'validate', 'invalid'],
            sku: ['sku'],
            product: ['product', 'item type', 'itemtype'],
            order: ['sale order', 'saleorder', 'order'],
            dispatch: ['dispatch', 'manifest', 'rts'],
            cancellation: [
                'cancellation',
                'cancel',
                'cancelled',
                'manifested',
                'ready to ship'
            ],
            shipment: ['shipment', 'awb', 'courier', 'label'],
            picking: ['picking', 'picklist', 'picker'],
            packing: ['packing', 'packer', 'staging'],
            putaway: ['putaway', 'put away'],
            grn: ['grn', 'inflow', 'goods receipt'],
            returns: ['return', 'rto', 'reverse pickup'],
            international: ['international', 'marketplace', 'cross-border', 'noon', 'namshi'],
            pincode: ['pincode', 'postal', 'zip'],
            state: ['state', 'state code'],
            invoice: ['invoice', 'tax configuration'],
            facility: ['facility allocation', 'allocation rule'],
            duplicate: ['duplicate'],
            boundary: ['boundary', 'limit', 'max length', 'edge']
        };

        for (const [signal, keywords] of Object.entries(map)) {
            if (keywords.some(keyword => lower.includes(keyword))) {
                signals.push(signal);
            }
        }

        return signals;
    }

    static summarize(selected = []) {

        return {
            total: selected.length,
            positive: selected.filter(s => s.type === 'positive').length,
            negative: selected.filter(s => s.type === 'negative').length,
            edge: selected.filter(s => s.type === 'edge').length,
            scenarios: selected.map(s => ({
                id: s.id,
                type: s.type,
                title: this.extractTitle(s),
                tier: s.tier
            }))
        };
    }
}

module.exports = ScenarioSelector;
