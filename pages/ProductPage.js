const { expect } = require('@playwright/test');

class ProductPage {

    constructor(page) {

        this.page = page;

        this.frame =
            this.page.frameLocator('#ngframe');

        this.skuInput =
            this.frame.getByPlaceholder(
                'Enter SKU Code'
            );

        this.productNameInput =
            this.frame.getByPlaceholder(
                'Enter Product Name'
            );

        this.productCategoryInput =
            this.frame
                .locator('ng-select')
                .nth(0)
                .locator('input');

        this.costPriceInput =
            this.frame.getByPlaceholder(
                'Enter Cost Price (₹)'
            );

        this.mrpInput =
            this.frame.getByPlaceholder(
                'Enter MRP (₹)'
            );

        this.basePriceInput =
            this.frame.getByPlaceholder(
                'Enter Base Price (₹)'
            );

        this.saveDetailsButton =
            this.frame.getByRole(
                'button',
                {
                    name: /Save Details/i
                }
            );
    }

    async navigateToProductsPage() {

        await this.page.goto(
            'https://stguat.unicommerce.info/products',
            {
                waitUntil: 'networkidle'
            }
        );

        console.log(
            'Current URL:',
            await this.page.url()
        );
    }

    async clickAddProduct() {

        await this.page.goto(
            'https://stguat.unicommerce.info/products/add',
            {
                waitUntil: 'networkidle'
            }
        );

        await this.skuInput.waitFor({
            state: 'visible',
            timeout: 60000
        });

        console.log(
            'Current URL:',
            await this.page.url()
        );

        console.log(
            'SKU field loaded'
        );
    }

    async fillProductDetails(randomSku) {

        await this.skuInput.fill(
            randomSku
        );

        await this.productNameInput.fill(
            'Automation Product'
        );

        await this.productCategoryInput.click();

        await this.productCategoryInput.fill(
            'Default'
        );

        await this.frame
            .getByRole('option')
            .filter({
                hasText: 'Default'
            })
            .first()
            .click();

        // SKU Type
        await this.frame
            .locator('ng-select')
            .nth(2)
            .click();

        await this.frame
            .getByRole('option', {
                name: 'GOODS'
            })
            .click();

        // Enabled
        await this.frame
            .locator('ng-select')
            .nth(3)
            .click();

        await this.frame
            .getByRole('option', {
                name: 'Yes'
            })
            .click();

        // Product Type
        try {

            await this.frame
                .getByText(
                    'Select Product Type'
                )
                .click({
                    force: true
                });

            await this.frame
                .getByRole(
                    'option',
                    {
                        name: 'SIMPLE'
                    }
                )
                .click();

        } catch {

            await this.frame
                .getByRole('combobox')
                .nth(6)
                .click({
                    force: true
                });

            await this.frame
                .getByText(
                    'SIMPLE',
                    {
                        exact: true
                    }
                )
                .click({
                    force: true
                });
        }

        await this.costPriceInput.fill(
            '700'
        );

        await this.mrpInput.fill(
            '800'
        );

        await this.basePriceInput.fill(
            '750'
        );

    //     // ==========================
    //     // TAX TYPE
    //     // ==========================

    //     await this.frame
    //         .locator('[role="combobox"]')
    //         .nth(8)
    //         .click();

    //     await this.frame
    //         .getByText(
    //             'vat_18',
    //             {
    //                 exact: true
    //             }
    //         )
    //         .click();

    //     // ==========================
    //     // GST TAX TYPE
    //     // ==========================

    //     await this.frame
    //         .locator('[role="combobox"]')
    //         .nth(9)
    //         .click();

    //     await this.frame
    //         .getByText(
    //             'abhishek',
    //             {
    //                 exact: true
    //             }
    //         )
    //         .click();

    //     console.log(
    //         'Tax fields selected'
    //     );
    // }
    // ==========================
// TAX TYPE
// ==========================

// ==========================
// TAX TYPE
// ==========================

await this.frame
    .getByRole('combobox')
    .nth(5)
    .click();

await this.frame
    .getByRole('option')
    .first()
    .click();

console.log(
    'Tax Type selected'
);

// ==========================
// GST TAX TYPE
// ==========================

// ==========================
// GST TAX TYPE
// ==========================

await this.frame
    .getByRole('combobox')
    .nth(6)
    .click();

await this.frame
    .getByRole('option')
    .first()
    .click();

console.log(
    'GST Tax Type selected'
);


}
    async saveProduct() {

    console.log(
        'Visible:',
        await this.saveDetailsButton.isVisible()
    );

    console.log(
        'Enabled:',
        await this.saveDetailsButton.isEnabled()
    );

    await this.saveDetailsButton.click({
        force: true
    });

    console.log(
        'Save Details clicked'
    );
}
}

module.exports = { ProductPage };
