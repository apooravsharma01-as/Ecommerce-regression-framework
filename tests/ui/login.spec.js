const { test, expect } =
    require('@playwright/test');

// Increase the overall timeout because this workflow includes slow page navigation.
test.setTimeout(120000);

const { LoginPage } =
    require('../../pages/LoginPage');

const { ProductPage } =
    require('../../pages/ProductPage');

const { VendorCatalogPage } =
    require('../../pages/VendorCatalogPage');

const { ProductApi } =
    require('../../api/ProductApi');

test(
    'login test',

    async ({ page, request }) => {
await page.setViewportSize({
            width: 1920,
            height: 1080
        });
        const loginPage =
            new LoginPage(page);

        const productPage =
            new ProductPage(page);

        const vendorCatalogPage =
            new VendorCatalogPage(page);

        // API Object
        // const productApi =
        //     new ProductApi(request);

        // Random Product SKU
        const randomSku =
            `SKU${Date.now()}`;

        // Random Vendor SKU
        const randomVendorSku =
            `VSKU${Date.now()}`;

        // -------------------------
        // LOGIN FLOW
        // -------------------------

        await loginPage.navigate();

        await loginPage.login(
            'sushant@unicommerce.com',
            'Newpass$123'
        );

        await page.waitForURL(
            'https://stgauth.unicommerce.com/',
            {
                timeout: 30000
            }
        );
        await page.context().storageState({
    path: 'auth.json'
});

        const cookies =
    await page.context().cookies();

console.log(
    JSON.stringify(
        cookies,
        null,
        2
    )
);

        await loginPage.selectOrganization();

        await expect(page).toHaveURL(
            /stguat\.unicommerce\.info/,
            {
                timeout: 30000
            }
        );
 
        // -------------------------
        // PRODUCT UI FLOW
        // -------------------------

        await productPage
            .navigateToProductsPage();

        await productPage
            .clickAddProduct();

        await expect(page).toHaveURL(
            /products\/add/,
            {
                timeout: 30000
            }
        );
page.on('request', request => {

    if (
        request.url().includes(
            '/data/catalog/itemType/create'
        )
    ) {

        console.log(
            'CREATE API URL:',
            request.url()
        );

        console.log(
            'CREATE API HEADERS:',
            request.headers()
        );
    }
});
        await productPage
            .fillProductDetails(
                randomSku
            );

        await productPage
            .saveProduct();

    

// -------------------------
// API VALIDATION
// -------------------------

// const response =
//     await productApi
//         .getProductBySku(
//             randomSku
//         );

// console.log(
//     JSON.stringify(
//         response,
//         null,
//         2
//     )
// );

// expect(
//     response.successful
// ).toBeTruthy();

// expect(
//     response.itemTypeDTO.skuCode
// ).toBe(
//     randomSku
// )
    }
 );