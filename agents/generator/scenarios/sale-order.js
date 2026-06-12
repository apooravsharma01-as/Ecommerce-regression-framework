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

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode
                } = await api.createSaleOrder();

                const createBody =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(createBody.successful).toBeTruthy();

                const searchResponse =
                    await api.searchSaleOrder(orderCode);

                const searchBody =
                    await searchResponse.json();

                expect(searchResponse.status()).toBe(200);
                expect(searchBody.successful).toBeTruthy();
                expect(searchBody.elements[0].code)
                    .toBe(orderCode);
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

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.createSaleOrderWithInvalidSku(
                        'NONEXISTENT_SKU_XYZ'
                    );

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeFalsy();
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

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.searchSaleOrder(
                        'NONEXISTENT_ORDER_XYZ'
                    );

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeTruthy();
                expect(body.totalRecords).toBe(0);
                expect(body.elements).toEqual([]);
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

                const api =
                    new SaleOrderApi(request);

                const response =
                    await api.createSaleOrderWithoutItems();

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeFalsy();
                expect(body.errors[0].message)
                    .toBe('MISSING_SALE_ORDER_ITEMS');
            }
        );`
        }
    ],
    db: [
        {
            id: 'pos-optional-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['order'],
            code: () => `
        test(
            'POSITIVE - optional sale order DB record check',
            async ({ request }) => {

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode
                } = await api.createSaleOrder();

                expect(response.status()).toBe(200);

                const dbOrder =
                    await SaleOrderQueries
                        .getSaleOrderByCodeWithRetry(
                            orderCode,
                            3,
                            1000
                        );

                if (dbOrder) {
                    expect(dbOrder.code).toBe(orderCode);
                }
            }
        );`
        }
    ]
};
