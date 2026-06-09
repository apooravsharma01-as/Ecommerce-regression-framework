// const { test, expect } =
//     require('@playwright/test');

// const {ProductApi} =
//     require('../../api/ProductApi');

// test(
//     'Create Product Via API',
//     async ({ request }) => {

//         const productApi =
//             new ProductApi(request);

//         const randomSku =
//             `API${Date.now()}`;

//         const response =
//             await productApi
//                 .createProduct(
//                     randomSku
//                 );

//         expect(
//             response.status()
//         ).toBe(200);

//         const body =
//             await response.json();

//         console.log(
//             JSON.stringify(
//                 body,
//                 null,
//                 2
//             )
//         );
//     }
// );
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
                .createProduct(
                    randomSku
                );

        console.log(
            'Status:',
            response.status()
        );

        console.log(
            'Headers:',
            await response.headers()
        );

        console.log(
            'Body:'
        );

        console.log(
            await response.text()
        );

        expect(
            response.status()
        ).toBe(200);
    }
);