const flowDefinitions =
    require('../scaffold/flowDefinitions');

const STORY_DOMAIN_SIGNALS = [
    {
        domain: 'sale-order-cancellation',
        keywords: [
            'cancellation',
            'cancel',
            'cancelled',
            'manifested',
            'ready to ship',
            'rts',
            'dispatched',
            'putaway'
        ]
    },
    {
        domain: 'sale-order-cancellation',
        keywords: [
            'cancellation',
            'cancel',
            'cancelled',
            'manifested',
            'ready to ship',
            'rts',
            'dispatched',
            'putaway'
        ]
    },
    {
        domain: 'sale-order',
        keywords: [
            'sale order',
            'saleorder',
            'order creation',
            'failed order',
            'international',
            'marketplace',
            'cross-border',
            'pincode',
            'postal',
            'state code',
            'state',
            'country',
            'facility allocation',
            'invoicing',
            'invoice',
            'noon',
            'namshi'
        ]
    },
    {
        domain: 'product-creation',
        keywords: [
            'gst',
            'tax class',
            'tax configuration',
            'item type',
            'itemtype',
            'sku',
            'product'
        ]
    },
    {
        domain: 'inventory',
        keywords: [
            'inventory',
            'stock',
            'serviceability',
            'location not serviceable',
            'courier'
        ]
    },
    {
        domain: 'vendor-catalog',
        keywords: [
            'vendor',
            'procurement',
            'vendor catalog'
        ]
    }
];

class StoryKeywordEnricher {

    static enrich(story = '') {

        const lower =
            (story || '').toLowerCase();

        const domains = new Set();
        const keywords = [];
        const signals = [];

        for (const entry of STORY_DOMAIN_SIGNALS) {

            const matched =
                entry.keywords.some(keyword =>
                    lower.includes(keyword.toLowerCase())
                );

            if (matched) {
                domains.add(entry.domain);
            }
        }

        for (const flow of Object.values(flowDefinitions)) {

            const matched =
                flow.keywords.some(keyword =>
                    lower.includes(keyword.toLowerCase())
                );

            if (matched) {
                domains.add(flow.id);
            }
        }

        const signalMap = {
            validation: [
                'validation',
                'validate',
                'pincode',
                'state',
                'country',
                'regex'
            ],
            tax: ['tax', 'gst', 'invoice'],
            order: [
                'sale order',
                'order creation',
                'failed order'
            ],
            international: [
                'international',
                'marketplace',
                'cross-border'
            ],
            dispatch: ['dispatch', 'manifest'],
            cancellation: [
                'cancellation',
                'cancel',
                'cancelled',
                'manifested',
                'ready to ship',
                'rts'
            ],
            shipment: ['shipment', 'shipping', 'label', 'awb'],
            returns: ['return', 'rto', 'delivery'],
            facility: ['facility allocation', 'allocation rule']
        };

        for (const [signal, terms] of Object.entries(signalMap)) {

            if (
                terms.some(term =>
                    lower.includes(term)
                )
            ) {
                signals.push(signal);
                keywords.push(signal);
            }
        }

        return {
            domains: [...domains],
            keywords,
            signals,
            source: 'keyword-enricher'
        };
    }
}

module.exports = StoryKeywordEnricher;
