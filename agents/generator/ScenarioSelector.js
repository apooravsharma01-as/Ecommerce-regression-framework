const PRODUCT_SCENARIOS =
    require('./scenarios/product-creation');
const SALE_ORDER_SCENARIOS =
    require('./scenarios/sale-order');

const DOMAIN_SCENARIOS = {
    'product-creation': PRODUCT_SCENARIOS,
    'sale-order': SALE_ORDER_SCENARIOS
};

class ScenarioSelector {

    static select({
        domain,
        layer,
        diffAnalysis = {},
        story = ''
    }) {

        const catalog =
            DOMAIN_SCENARIOS[domain];

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
                type: s.type
            }))
        };
    }
}

module.exports = ScenarioSelector;
