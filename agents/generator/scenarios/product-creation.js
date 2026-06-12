module.exports = {
    api: [
        {
            id: 'pos-create-valid-gst',
            type: 'positive',
            tier: 'core',
            signals: ['gst', 'tax', 'product', 'sku', 'validation'],
            code: () => `
        test(
            'POSITIVE - create product with valid GST tax fields',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const sku =
                    \`REG\${Date.now()}\`;

                const response =
                    await api.createProduct(sku);

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeTruthy();
                expect(body.itemType.skuCode).toBe(sku);
                expect(body.itemType.gstTaxTypeCode)
                    .toBeTruthy();
            }
        );`
        },
        {
            id: 'pos-get-product-by-sku',
            type: 'positive',
            tier: 'core',
            signals: ['product', 'sku'],
            code: () => `
        test(
            'POSITIVE - get product by sku after create',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const sku =
                    \`REGGET\${Date.now()}\`;

                await api.createProduct(sku);

                const result =
                    await api.getProductBySku(sku);

                expect(result.successful).toBeTruthy();
                expect(result.itemTypeDTO.skuCode).toBe(sku);
            }
        );`
        },
        {
            id: 'neg-invalid-gst-code',
            type: 'negative',
            tier: 'validation',
            signals: ['gst', 'tax', 'validation'],
            code: () => `
        test(
            'NEGATIVE - reject invalid GST tax type code',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const response =
                    await api.createProductWithGst(
                        \`BADGST\${Date.now()}\`,
                        'INVALID_GST_XYZ'
                    );

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeFalsy();
                expect(body.errors[0].message)
                    .toBe('INVALID_TAX_TYPE_CODE');
            }
        );`
        },
        {
            id: 'neg-duplicate-sku',
            type: 'negative',
            tier: 'validation',
            signals: ['sku', 'duplicate', 'product'],
            code: () => `
        test(
            'NEGATIVE - reject duplicate SKU creation',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const sku =
                    \`REGDUP\${Date.now()}\`;

                const first =
                    await api.createProduct(sku);

                expect(first.status()).toBe(200);

                const duplicate =
                    await api.createProduct(sku);

                const body =
                    await duplicate.json();

                expect(duplicate.status()).toBe(200);
                expect(body.successful).toBeFalsy();
                expect(body.errors[0].message)
                    .toBe('DUPLICATE_ITEM_SKU_CODE');
            }
        );`
        },
        {
            id: 'neg-missing-sku-lookup',
            type: 'negative',
            tier: 'validation',
            signals: ['sku', 'product', 'validation'],
            code: () => `
        test(
            'NEGATIVE - get product fails for unknown SKU',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const result =
                    await api.getProductBySku(
                        'NONEXISTENT_SKU_XYZ_999'
                    );

                expect(result.successful).toBeFalsy();
                expect(result.errors[0].message)
                    .toBe('INVALID_ITEM_TYPE');
            }
        );`
        },
        {
            id: 'edge-empty-sku-code',
            type: 'edge',
            tier: 'boundary',
            signals: ['sku', 'boundary', 'validation'],
            code: () => `
        test(
            'EDGE - reject empty SKU code',
            async ({ request }) => {

                const api =
                    new ProductApi(request);

                const response =
                    await api.createProduct('');

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeFalsy();
                expect(body.errors[0].message)
                    .toBe('MISSING_REQUIRED_PARAMETERS');
            }
        );`
        }
    ],
    db: [
        {
            id: 'pos-known-product-record',
            type: 'positive',
            tier: 'core',
            signals: ['product', 'sku'],
            code: () => `
        test(
            'POSITIVE - DB validate known product record',
            async () => {

                const skuCode =
                    'FNTBBS11MH30002';

                const product =
                    await ProductQueries
                        .getProductBySku(skuCode);

                expect(product).toBeTruthy();
                expect(product.sku_code).toBe(skuCode);
                expect(product.enabled).toBe(1);
            }
        );`
        }
    ]
};
