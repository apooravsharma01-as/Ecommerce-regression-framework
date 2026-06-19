module.exports = {
    api: [
        {
            id: 'pos-create-search-order',
            type: 'positive',
            tier: 'core',
            signals: ['order'],
            code: () => `
        test(
            'POSITIVE - create and search sale order',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode,
                    itemSku
                } = await api.createSaleOrder();

                const createBody =
                    await response.json();

                await EvidenceLogger.logApi(
                    'Create Sale Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: { orderCode, itemSku },
                        status: response.status(),
                        response: createBody
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    createBody,
                    expect,
                    'create sale order'
                );

                const searchResponse =
                    await api.searchSaleOrder(orderCode);

                const searchBody =
                    await searchResponse.json();

                await EvidenceLogger.logApi(
                    'Search Sale Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/search',
                        request: { orderCode },
                        status: searchResponse.status(),
                        response: searchBody
                    }
                );

                expect(searchResponse.status()).toBe(200);
                ApiAssertions.assertSearchHasOrder(
                    searchBody,
                    orderCode,
                    expect
                );
            }
        );`
        },
        {
            id: 'neg-invalid-item-sku',
            type: 'negative',
            tier: 'validation',
            signals: ['order', 'sku', 'validation'],
            code: () => `
        test(
            'NEGATIVE - reject sale order with invalid item SKU',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.createSaleOrderWithInvalidSku(
                        'NONEXISTENT_SKU_XYZ'
                    );

                const body =
                    await response.json();

                await EvidenceLogger.logApi(
                    'Invalid SKU Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: { itemSku: 'NONEXISTENT_SKU_XYZ' },
                        status: response.status(),
                        response: body
                    }
                );

                ApiAssertions.assertRejectedResponse(
                    response,
                    body,
                    expect,
                    'invalid item SKU'
                );
                expect(body.errors[0].message)
                    .toBe('INVALID_ITEM_TYPE');
            }
        );`
        },
        {
            id: 'neg-search-missing-order',
            type: 'negative',
            tier: 'validation',
            signals: ['order', 'validation'],
            code: () => `
        test(
            'NEGATIVE - search returns empty for unknown order code',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.searchSaleOrder(
                        'NONEXISTENT_ORDER_XYZ'
                    );

                const body =
                    await response.json();

                await EvidenceLogger.logApi(
                    'Search Missing Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/search',
                        request: { orderCode: 'NONEXISTENT_ORDER_XYZ' },
                        status: response.status(),
                        response: body
                    }
                );
                ApiAssertions.assertSearchEmpty(
                    body,
                    expect
                );
            }
        );`
        },
        {
            id: 'edge-empty-order-items',
            type: 'edge',
            tier: 'boundary',
            signals: ['order', 'boundary', 'validation'],
            code: () => `
        test(
            'EDGE - reject sale order without line items',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.createSaleOrderWithoutItems();

                const body =
                    await response.json();

                await EvidenceLogger.logApi(
                    'Empty Order Items',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: { saleOrderItems: [] },
                        status: response.status(),
                        response: body
                    }
                );

                ApiAssertions.assertRejectedResponse(
                    response,
                    body,
                    expect,
                    'empty line items'
                );
            }
        );`
        },
        {
            id: 'neg-international-missing-address',
            type: 'negative',
            tier: 'validation',
            signals: ['order', 'international', 'validation'],
            code: () => `
        test(
            'NEGATIVE - international order rejects missing required address fields',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode
                } = await api.createInternationalSaleOrder({
                    country: 'AE',
                    pincode: '',
                    state: ''
                });

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'International Order Missing Address',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: {
                            orderCode,
                            country: 'AE'
                        },
                        status: response.status(),
                        response: body
                    }
                );

                ApiAssertions.assertRejectedResponse(
                    response,
                    body,
                    expect,
                    'international missing address'
                );
            }
        );`
        }
    ],
    db: [
        {
            id: 'e2e-create-search-db',
            type: 'positive',
            tier: 'core',
            signals: ['order'],
            code: () => `
        test(
            'E2E - create sale order, search API, verify DB',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode
                } = await api.createSaleOrder();

                const createBody =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'E2E Create Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: { orderCode },
                        status: response.status(),
                        response: createBody
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    createBody,
                    expect,
                    'e2e create before DB'
                );

                const searchResponse =
                    await api.searchSaleOrder(orderCode);

                const searchBody =
                    await searchResponse.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'E2E Search Order',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/search',
                        request: { orderCode },
                        status: searchResponse.status(),
                        response: searchBody
                    }
                );

                expect(searchBody.totalRecords).toBeGreaterThan(0);

                const DbVerify =
                    require('../../../database/DbVerify');

                const dbOrder =
                    await SaleOrderQueries
                        .getSaleOrderByCodeWithRetry(
                            orderCode,
                            5,
                            2000
                        );

                await EvidenceLogger.logDb(
                    'E2E Sale Order DB',
                    DbVerify.buildDbEvidence({
                        query:
                            'SELECT * FROM sale_order WHERE code = ?',
                        table: 'sale_order',
                        orderCode,
                        row: dbOrder,
                        verification: 'row-required'
                    })
                );

                DbVerify.assertRowFound(dbOrder, {
                    label: 'E2E sale order',
                    orderCode
                });

                expect(dbOrder.code).toBe(orderCode);
            }
        );`
        },
        {
            id: 'pos-optional-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['order'],
            code: () => `
        test(
            'POSITIVE - optional sale order DB record check',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode
                } = await api.createSaleOrder();

                const createBody =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Create Order For DB Check',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/create',
                        request: { orderCode },
                        status: response.status(),
                        response: createBody
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    createBody,
                    expect,
                    'create before DB check'
                );

                const DbVerify =
                    require('../../../database/DbVerify');

                const dbOrder =
                    await SaleOrderQueries
                        .getSaleOrderByCodeWithRetry(
                            orderCode,
                            5,
                            2000
                        );

                await EvidenceLogger.logDb(
                    'Sale Order DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            'SELECT * FROM sale_order WHERE code = ?',
                        table: 'sale_order',
                        orderCode,
                        row: dbOrder,
                        verification: 'row-required'
                    })
                );

                DbVerify.assertRowFound(dbOrder, {
                    label: 'sale order',
                    orderCode
                });

                expect(dbOrder.code).toBe(orderCode);
            }
        );`
        }
    ]
};
