const DOMAIN_TEMPLATES = {

    'product-creation': {
        api: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { ProductApi } =
    require('../../../api/ProductApi');

test.describe(
    'Regression: Product Creation',
    () => {

        test(
            'API - create product with tax fields',
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
        );

        test(
            'API - get product by sku',
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
        );
    }
);
`,

        db: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const {
    ProductQueries
} = require('../../../database/queries/ProductQueries');

test.describe(
    'Regression: Product DB',
    () => {

        test(
            'DB - validate known product record',
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
        );
    }
);
`
    },

    'sale-order': {
        api: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { SaleOrderApi } =
    require('../../../api/SaleOrderApi');

test.describe(
    'Regression: Sale Order',
    () => {

        test(
            'API - create and search sale order',
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
        );
    }
);
`,

        db: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { SaleOrderApi } =
    require('../../../api/SaleOrderApi');

const {
    SaleOrderQueries
} = require('../../../database/queries/SaleOrderQueries');

test.describe(
    'Regression: Sale Order DB',
    () => {

        test(
            'DB - optional sale order record check',
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
        );
    }
);
`
    },

    'inventory': {
        api: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { InventoryApi } =
    require('../../../api/InventoryApi');

test.describe(
    'Regression: Inventory',
    () => {

        test(
            'API - inventory snapshot for known SKU',
            async ({ request }) => {

                const api =
                    new InventoryApi(request);

                const skuCode =
                    'FNTBBS11MH30002';

                const response =
                    await api.getInventorySnapshot(
                        skuCode
                    );

                const body =
                    await response.json();

                expect(response.status()).toBe(200);
                expect(body.successful).toBeTruthy();
                expect(
                    body.inventorySnapshots[0].itemTypeSKU
                ).toBe(skuCode);
            }
        );
    }
);
`
    },

    'vendor-catalog': {
        api: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { VendorCatalogApi } =
    require('../../../api/VendorCatalogApi');

test.describe(
    'Regression: Vendor Catalog',
    () => {

        test(
            'API - vendor item types endpoint responds',
            async ({ request }) => {

                const api =
                    new VendorCatalogApi(request);

                const response =
                    await api.getVendorItemTypes();

                expect(response.status()).toBe(200);
            }
        );
    }
);
`,

        ui: ({ domain, trigger }) => `
// AUTO-GENERATED regression test
// Domain: ${domain}
// Trigger: ${trigger}

const { test, expect } =
    require('@playwright/test');

const { LoginPage } =
    require('../../../pages/LoginPage');

const { VendorCatalogPage } =
    require('../../../pages/VendorCatalogPage');

test.describe(
    'Regression: Vendor Catalog UI',
    () => {

        test(
            'UI - vendor catalog page loads',
            async ({ page }) => {

                test.setTimeout(120000);

                const loginPage =
                    new LoginPage(page);

                const vendorPage =
                    new VendorCatalogPage(page);

                await loginPage.navigate();
                await loginPage.login(
                    process.env.TEST_USERNAME
                        || 'sushant@unicommerce.com',
                    process.env.TEST_PASSWORD
                        || 'Newpass$123'
                );

                await loginPage.selectOrganization();

                await page.waitForURL(
                    /stguat\.unicommerce\.info/,
                    { timeout: 60000 }
                );

                await vendorPage
                    .navigateToVendorCatalogPage();

                await expect(page).toHaveURL(
                    /procure\\/vendorItemType/
                );
            }
        );
    }
);
`
    }
};

module.exports = DOMAIN_TEMPLATES;
