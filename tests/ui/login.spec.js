const { test, expect } =
    require('@playwright/test');

test.setTimeout(180000);

const { LoginPage } =
    require('../../pages/LoginPage');

const { ProductPage } =
    require('../../pages/ProductPage');

const { ProductApi } =
    require('../../api/ProductApi');

const {
    ProductQueries
} = require(
    '../../database/queries/ProductQueries'
);

const {
    allure
} = require('allure-playwright');

const AIFailureHook =
    require('../hooks/aiFailureHook');

test.afterEach(
    async ({}, testInfo) => {

        await AIFailureHook
            .analyzeFailure(testInfo);
    }
);

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

        const randomSku =
            `SKU${Date.now()}`;

        await loginPage.navigate();

        await loginPage.login(
            'sushant@unicommerce.com',
            'Newpass$123'
        );

        await page.waitForURL(
            /stgauth\.unicommerce\.com/,
            { timeout: 60000 }
        );

        await loginPage.selectOrganization();

        await expect(page).toHaveURL(
            /stguat\.unicommerce\.info/,
            { timeout: 60000 }
        );

        await page.context().storageState({
            path: 'auth.json'
        });

        await productPage.navigateToProductsPage();

        await productPage.clickAddProduct();

        await expect(page).toHaveURL(
            /products\/add/,
            { timeout: 60000 }
        );

        await productPage.fillProductDetails(randomSku);

        await productPage.saveProduct();

        await allure.attachment(
            'Product Creation Screenshot',
            await page.screenshot(),
            'image/png'
        );

        const productApi =
            new ProductApi(request);

        const apiResponse =
            await productApi
                .getProductBySku(randomSku);

        await allure.attachment(
            'API Product Record',
            JSON.stringify(apiResponse, null, 2),
            'application/json'
        );

        expect(apiResponse.successful).toBeTruthy();
        expect(apiResponse.itemTypeDTO.skuCode).toBe(randomSku);
        expect(apiResponse.itemTypeDTO.enabled).toBeTruthy();

        const dbProduct =
            await ProductQueries
                .getProductBySkuWithRetry(
                    randomSku,
                    3,
                    1000
                );

        if (dbProduct) {

            await allure.attachment(
                'DB Record',
                JSON.stringify(dbProduct, null, 2),
                'application/json'
            );

            expect(dbProduct.sku_code).toBe(randomSku);
        }
    }
);
