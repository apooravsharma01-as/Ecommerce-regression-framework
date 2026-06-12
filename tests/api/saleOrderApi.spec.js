const { test, expect } =
    require('@playwright/test');

const { SaleOrderApi } =
    require('../../api/SaleOrderApi');

test(
    'Create and Search Sale Order Via API',
    async ({ request }) => {

        const saleOrderApi =
            new SaleOrderApi(request);

        const {
            response,
            orderCode
        } = await saleOrderApi
            .createSaleOrder();

        const createBody =
            await response.json();

        console.log(
            'Create:',
            JSON.stringify(createBody, null, 2)
        );

        expect(response.status()).toBe(200);
        expect(createBody.successful).toBeTruthy();
        expect(
            createBody.saleOrderDetailDTO.code
        ).toBe(orderCode);

        const searchResponse =
            await saleOrderApi
                .searchSaleOrder(orderCode);

        const searchBody =
            await searchResponse.json();

        console.log(
            'Search:',
            JSON.stringify(searchBody, null, 2)
        );

        expect(searchResponse.status()).toBe(200);
        expect(searchBody.successful).toBeTruthy();
        expect(searchBody.totalRecords).toBeGreaterThan(0);
        expect(searchBody.elements[0].code)
            .toBe(orderCode);
    }
);
