const { test, expect } =
    require('@playwright/test');

const { ProductApi } =
    require('../../api/ProductApi');

test(
    'Create Product Via API',
    async ({ request }) => {

        const productApi =
            new ProductApi(request);

        const randomSku =
            `API${Date.now()}`;

        const response =
            await productApi
                .createProduct(randomSku);

        const status =
            response.status();

        const body =
            await response.json();

        console.log('Status:', status);
        console.log('Body:', JSON.stringify(body, null, 2));

        expect(status).toBe(200);
        expect(body.successful).toBeTruthy();
    }
);
