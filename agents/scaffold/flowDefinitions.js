module.exports = {
    dispatch: {
        id: 'dispatch',
        label: 'Dispatch & Manifest',
        keywords: [
            'dispatch',
            'manifest',
            'rts',
            'ready to ship',
            'handover',
            'force dispatch',
            'cancellation',
            'cancel',
            'cancelled'
        ],
        pathPatterns: [
            'dispatch',
            'manifest',
            'readytoship',
            'forcedispatch'
        ],
        entityPatterns: [
            'ShippingPackage',
            'ShippingManifest',
            'Dispatch'
        ],
        tablePatterns: [
            'shipping_package',
            'shipping_manifest'
        ],
        uiRoutes: [
            '/shipping/manifest',
            '/shipping/dispatch',
            '/wms/dispatch'
        ]
    },
    shipment: {
        id: 'shipment',
        label: 'Shipment Creation',
        keywords: [
            'shipment',
            'shipping package',
            'awb',
            'courier',
            'label',
            'invoice'
        ],
        pathPatterns: [
            'shipment',
            'shippingpackage',
            'awb',
            'allocate',
            'createshippingpackage'
        ],
        entityPatterns: [
            'ShippingPackage',
            'ShipmentTracking',
            'ShippingProvider'
        ],
        tablePatterns: [
            'shipping_package',
            'shipment_tracking'
        ],
        uiRoutes: [
            '/shipping',
            '/wms/shipment'
        ]
    },
    picking: {
        id: 'picking',
        label: 'Picking',
        keywords: [
            'picking',
            'picklist',
            'pick list',
            'picker'
        ],
        pathPatterns: [
            'picklist',
            'picking',
            'picker'
        ],
        entityPatterns: [
            'Picklist',
            'PicklistItem'
        ],
        tablePatterns: [
            'picklist',
            'picklist_item'
        ],
        uiRoutes: [
            '/wms/picking',
            '/picker'
        ]
    },
    packing: {
        id: 'packing',
        label: 'Packing',
        keywords: [
            'packing',
            'packer',
            'packlist',
            'staging'
        ],
        pathPatterns: [
            'packer',
            'packlist',
            'packing',
            'staging'
        ],
        entityPatterns: [
            'PackGroup'
        ],
        tablePatterns: [],
        uiRoutes: [
            '/wms/packing',
            '/packer'
        ]
    },
    putaway: {
        id: 'putaway',
        label: 'Putaway',
        keywords: [
            'putaway',
            'put away',
            'shelf'
        ],
        pathPatterns: [
            'putaway',
            'putback'
        ],
        entityPatterns: [
            'Putaway',
            'PutawayItem'
        ],
        tablePatterns: [
            'putaway',
            'putaway_item'
        ],
        uiRoutes: [
            '/putaway',
            '/wms/putaway'
        ]
    },
    grn: {
        id: 'grn',
        label: 'GRN / Inflow',
        keywords: [
            'grn',
            'inflow',
            'goods receipt',
            'receive po'
        ],
        pathPatterns: [
            'inflow',
            'grn',
            'receive'
        ],
        entityPatterns: [
            'InflowReceipt',
            'InflowReceiptItem'
        ],
        tablePatterns: [
            'inflow_receipt',
            'inflow_receipt_item'
        ],
        uiRoutes: [
            '/inflow',
            '/wms/grn'
        ]
    },
    returns: {
        id: 'returns',
        label: 'Returns / RTO',
        keywords: [
            'return',
            'rto',
            'reverse pickup',
            'reshipment'
        ],
        pathPatterns: [
            'return',
            'reversepickup',
            'rto',
            'reshipment'
        ],
        entityPatterns: [
            'ReversePickup',
            'ReturnManifest',
            'ReturnItem'
        ],
        tablePatterns: [
            'reverse_pickup',
            'return_manifest'
        ],
        uiRoutes: [
            '/returns',
            '/rto'
        ]
    }
};
