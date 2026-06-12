class VendorCatalogPage {

    constructor(page) {

        this.page = page;

        this.frame =
            page.frameLocator('#ngframe');
    }

    async navigateToVendorCatalogPage() {

        await this.page.goto(
            'https://stguat.unicommerce.info/procure/vendorItemType',
            {
                waitUntil: 'networkidle',
                timeout: 90000
            }
        );

        await this.frame
            .locator('body')
            .waitFor({
                state: 'attached',
                timeout: 60000
            });
    }

    async clickAddVendorItemMapping() {

        await this.frame
            .getByRole('button', {
                name: /add vendor item mapping/i
            })
            .click();
    }

    async fillVendorItemMappingDetails(
        vendorName,
        vendorSku,
        costPrice,
        productSku
    ) {

        const vendorInput =
            this.frame
                .locator(
                    'ng-select input[type="text"]'
                )
                .first();

        await vendorInput.click();
        await vendorInput.fill(vendorName);

        await this.page
            .locator('.ng-option')
            .filter({ hasText: vendorName })
            .first()
            .click();

        await this.frame
            .locator(
                'input[placeholder="Enter Vendor SKU Code"]'
            )
            .fill(vendorSku);

        await this.frame
            .locator(
                'input[placeholder="Enter Vendor Unit Price"]'
            )
            .fill(costPrice);

        const productInput =
            this.frame
                .locator(
                    'ng-select input[type="text"]'
                )
                .nth(1);

        await productInput.click();
        await productInput.fill(productSku);

        await this.page
            .locator('.ng-option')
            .filter({ hasText: productSku })
            .first()
            .click();
    }

    async submitVendorItemMapping() {

        await this.frame
            .getByRole('button', {
                name: /submit|save|create/i
            })
            .click();
    }
}

module.exports = { VendorCatalogPage };
