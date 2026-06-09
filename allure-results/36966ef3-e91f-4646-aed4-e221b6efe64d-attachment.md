# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/productApi.spec.js >> Create Product Via API
- Location: tests/api/productApi.spec.js:7:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  1  | const { test, expect } =
  2  |     require('@playwright/test');
  3  | 
  4  | const {ProductApi} =
  5  |     require('../../api/ProductApi');
  6  | 
  7  | test(
  8  |     'Create Product Via API',
  9  |     async ({ request }) => {
  10 | 
  11 |         const productApi =
  12 |             new ProductApi(request);
  13 | 
  14 |         const randomSku =
  15 |             `API${Date.now()}`;
  16 | 
  17 |         const response =
  18 |             await productApi
  19 |                 .createProduct(
  20 |                     randomSku
  21 |                 );
  22 | 
  23 |         expect(
  24 |             response.status()
> 25 |         ).toBe(200);
     |           ^ Error: expect(received).toBe(expected) // Object.is equality
  26 | 
  27 |         const body =
  28 |             await response.json();
  29 | 
  30 |         console.log(
  31 |             JSON.stringify(
  32 |                 body,
  33 |                 null,
  34 |                 2
  35 |             )
  36 |         );
  37 |     }
  38 | );
```