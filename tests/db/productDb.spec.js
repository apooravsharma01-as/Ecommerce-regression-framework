const { test, expect } =
    require('@playwright/test');

const {
    ProductQueries
} = require(
    '../../database/queries/ProductQueries'
);

test(
    'Validate Product In DB',
    async () => {

        const skuCode =
            'FNTBBS11MH30002';

        const product =
            await ProductQueries
                .getProductBySku(
                    skuCode
                );

        console.log(product);

        expect(product)
            .toBeTruthy();

        expect(
            product.sku_code
        ).toBe(
            skuCode
        );
    }
);