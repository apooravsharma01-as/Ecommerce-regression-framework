const { test, expect } =
    require('@playwright/test');

test.setTimeout(120000);

const { LoginPage } =
    require('../../pages/LoginPage');

const { VendorCatalogPage } =
    require('../../pages/VendorCatalogPage');

test(
    'Vendor catalog page loads',
    async ({ page }) => {

        await page.setViewportSize({
            width: 1920,
            height: 1080
        });

        const loginPage =
            new LoginPage(page);

        const vendorCatalogPage =
            new VendorCatalogPage(page);

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

        await vendorCatalogPage
            .navigateToVendorCatalogPage();

        await expect(page).toHaveURL(
            /procure\/vendorItemType/,
            { timeout: 60000 }
        );
    }
);
