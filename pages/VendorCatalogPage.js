class VendorCatalogPage {

    constructor(page) {

        this.page = page;

        // Main iframe
        this.frame =
            page.frameLocator('#ngframe');
    }

    async navigateToVendorCatalogPage() {

        await this.page.goto(
            'https://stguat.unicommerce.info/procure/vendorItemType',
            {
                waitUntil: 'domcontentloaded'
            }
        );
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

        // -------------------------
        // Vendor Name
        // -------------------------

        const vendorInput =
            this.frame
                .locator(
                    'ng-select input[type="text"]'
                )
                .first();

        await vendorInput.click();

        await vendorInput.fill(
            vendorName
        );

        // Dropdown rendered outside iframe
        await this.page
            .locator('.ng-option')
            .filter({
                hasText: vendorName
            })
            .first()
            .click();

        // -------------------------
        // Vendor SKU
        // -------------------------

        await this.frame
            .locator(
                'input[placeholder="Enter Vendor SKU Code"]'
            )
            .fill(vendorSku);

        // -------------------------
        // Vendor Unit Price
        // -------------------------

        await this.frame
            .locator(
                'input[placeholder="Enter Vendor Unit Price"]'
            )
            .fill(costPrice);

        // -------------------------
        // Product SKU
        // -------------------------

        const productInput =
            this.frame
                .locator(
                    'ng-select input[type="text"]'
                )
                .nth(1);

        await productInput.click();

        await productInput.fill(
            productSku
        );

        // Dropdown rendered outside iframe
        await this.page
            .locator('.ng-option')
            .filter({
                hasText: productSku
            })
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