# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui/login.spec.js >> login test
- Location: tests/ui/login.spec.js:19:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /stguat\.unicommerce\.info/
Received string:  "https://stgauth.unicommerce.com/"
Timeout: 30000ms

Call log:
  - Expect "toHaveURL" with timeout 30000ms
    3 × unexpected value "https://stgauth.unicommerce.com/"
    - waiting for" http://stguat.unicommerce.info/auth_login_security_check?serviceTicketId=ST-10154-6LmCrDNT7wLKInRlu9gKQz3Zi3mYYfkKFJB" navigation to finish...

```

# Test source

```ts
  1   | const { test, expect } =
  2   |     require('@playwright/test');
  3   | 
  4   | // Increase the overall timeout because this workflow includes slow page navigation.
  5   | test.setTimeout(120000);
  6   | 
  7   | const { LoginPage } =
  8   |     require('../../pages/LoginPage');
  9   | 
  10  | const { ProductPage } =
  11  |     require('../../pages/ProductPage');
  12  | 
  13  | const { VendorCatalogPage } =
  14  |     require('../../pages/VendorCatalogPage');
  15  | 
  16  | const { ProductApi } =
  17  |     require('../../api/ProductApi');
  18  | 
  19  | test(
  20  |     'login test',
  21  | 
  22  |     async ({ page, request }) => {
  23  | await page.setViewportSize({
  24  |             width: 1920,
  25  |             height: 1080
  26  |         });
  27  |         const loginPage =
  28  |             new LoginPage(page);
  29  | 
  30  |         const productPage =
  31  |             new ProductPage(page);
  32  | 
  33  |         const vendorCatalogPage =
  34  |             new VendorCatalogPage(page);
  35  | 
  36  |         // API Object
  37  |         // const productApi =
  38  |         //     new ProductApi(request);
  39  | 
  40  |         // Random Product SKU
  41  |         const randomSku =
  42  |             `SKU${Date.now()}`;
  43  | 
  44  |         // Random Vendor SKU
  45  |         const randomVendorSku =
  46  |             `VSKU${Date.now()}`;
  47  | 
  48  |         // -------------------------
  49  |         // LOGIN FLOW
  50  |         // -------------------------
  51  | 
  52  |         await loginPage.navigate();
  53  | 
  54  |         await loginPage.login(
  55  |             'sushant@unicommerce.com',
  56  |             'Newpass$123'
  57  |         );
  58  | 
  59  |         await page.waitForURL(
  60  |             'https://stgauth.unicommerce.com/',
  61  |             {
  62  |                 timeout: 30000
  63  |             }
  64  |         );
  65  | 
  66  |         await loginPage.selectOrganization();
  67  | 
> 68  |         await expect(page).toHaveURL(
      |                            ^ Error: expect(page).toHaveURL(expected) failed
  69  |             /stguat\.unicommerce\.info/,
  70  |             {
  71  |                 timeout: 30000
  72  |             }
  73  |         );
  74  |  
  75  |         // -------------------------
  76  |         // PRODUCT UI FLOW
  77  |         // -------------------------
  78  | 
  79  |         await productPage
  80  |             .navigateToProductsPage();
  81  | 
  82  |         await productPage
  83  |             .clickAddProduct();
  84  | 
  85  |         await expect(page).toHaveURL(
  86  |             /products\/add/,
  87  |             {
  88  |                 timeout: 30000
  89  |             }
  90  |         );
  91  | 
  92  |         await productPage
  93  |             .fillProductDetails(
  94  |                 randomSku
  95  |             );
  96  | 
  97  |         await productPage
  98  |             .saveProduct();
  99  | 
  100 |     
  101 | 
  102 | // -------------------------
  103 | // API VALIDATION
  104 | // -------------------------
  105 | 
  106 | // const response =
  107 | //     await productApi
  108 | //         .getProductBySku(
  109 | //             randomSku
  110 | //         );
  111 | 
  112 | // console.log(
  113 | //     JSON.stringify(
  114 | //         response,
  115 | //         null,
  116 | //         2
  117 | //     )
  118 | // );
  119 | 
  120 | // expect(
  121 | //     response.successful
  122 | // ).toBeTruthy();
  123 | 
  124 | // expect(
  125 | //     response.itemTypeDTO.skuCode
  126 | // ).toBe(
  127 | //     randomSku
  128 | // )
  129 |     }
  130 |  );
```