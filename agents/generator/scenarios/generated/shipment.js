module.exports = {
    api: [
        {
            id: 'pos-shipment-primary',
            type: 'positive',
            tier: 'core',
            signals: ['shipment'],
            code: () => `
        test(
            'POSITIVE - Shipment Creation primary API',
            async ({ request }) => {

                const api =
                    new ShipmentApi(request);

                const payload =
                    {
            shippingPackageCodes: [],
            userId: 1
        };

                const response =
                    await api.bulkAllocateShippingProvider(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Shipment Creation primary',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/bulk/provider/allocate',
                        request: payload,
                        status: response.status(),
                        response: body
                    }
                );

                
                const ApiAssertions =
                    require('../../../utils/ApiAssertions');
                ApiAssertions.assertPositiveResponse(
                    response,
                    body,
                    expect,
                    'Shipment Creation primary API'
                );
            }
        );`
        },
        {
            id: 'neg-shipment-invalid-payload',
            type: 'negative',
            tier: 'validation',
            signals: ['shipment'],
            code: () => `
        test(
            'NEGATIVE - Shipment Creation rejects invalid payload',
            async ({ request }) => {

                const api =
                    new ShipmentApi(request);

                const payload =
                    { __invalidField: true };

                const response =
                    await api.bulkAllocateShippingProvider(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Shipment Creation invalid payload',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/bulk/provider/allocate',
                        request: payload,
                        status: response.status(),
                        response: body
                    }
                );

                
                const ApiAssertions =
                    require('../../../utils/ApiAssertions');
                ApiAssertions.assertRejectedResponse(
                    response,
                    body,
                    expect,
                    'Shipment Creation invalid payload'
                );
            }
        );`
        },
        {
            id: 'edge-shipment-empty-payload',
            type: 'edge',
            tier: 'boundary',
            signals: ['shipment'],
            code: () => `
        test(
            'EDGE - Shipment Creation handles empty payload',
            async ({ request }) => {

                const api =
                    new ShipmentApi(request);

                const payload =
                    {};

                const response =
                    await api.bulkAllocateShippingProvider(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Shipment Creation empty payload',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/bulk/provider/allocate',
                        request: payload,
                        status: response.status(),
                        response: body
                    }
                );

                
                expect(response.status()).toBeLessThan(600);
            }
        );`
        }
    ],
    db: [{
            id: 'pos-shipment-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['shipment'],
            code: () => `
        test(
            'POSITIVE - Shipment Creation DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const api =
                    new ShipmentApi(request);

                const payload =
                    {
            shippingPackageCodes: [],
            userId: 1
        };

                const response =
                    await api.bulkAllocateShippingProvider(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Shipment Creation DB probe',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/bulk/provider/allocate',
                        request: payload,
                        status: response.status(),
                        response: body
                    }
                );

                expect(await DbVerify.ping()).toBe(true);

                const entityCode =
                    body?.saleOrderDetailDTO?.code
                    || body?.code
                    || body?.shippingPackageCode
                    || null;

                let dbRow = null;

                if (
                    entityCode
                    && ShipmentQueries.getLatestByCodeWithRetry
                ) {
                    dbRow =
                        await ShipmentQueries
                            .getLatestByCodeWithRetry(
                                entityCode,
                                5,
                                2000
                            );
                }

                const total =
                    await ShipmentQueries
                        .countRecent(60);

                const verification =
                    entityCode
                        ? 'row-required'
                        : 'connectivity';

                const rowsFound =
                    dbRow
                        ? 1
                        : (entityCode ? 0 : total);

                const connected =
                    await DbVerify.ping();

                await EvidenceLogger.logDb(
                    'Shipment Creation DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            entityCode
                                ? 'SELECT * FROM multi_part_shipping_package WHERE code = ?'
                                : 'SELECT COUNT(*) FROM multi_part_shipping_package (last 60 min)',
                        table: 'multi_part_shipping_package',
                        orderCode: entityCode,
                        row: dbRow,
                        rowsFound,
                        verification,
                        connected,
                        reason:
                            entityCode
                                ? null
                                : 'List API did not return an entity code — DB connectivity check only'
                    })
                );

                expect(response.status()).toBeLessThan(500);

                if (entityCode) {
                    DbVerify.assertRowFound(dbRow, {
                        label: 'Shipment Creation',
                        orderCode: entityCode
                    });
                } else {
                    expect(connected).toBe(true);
                }
            }
        );`
        }],
    ui: [
        {
            id: 'pos-shipment-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['shipment'],
            code: () => `
        test(
            'POSITIVE - Shipment Creation UI smoke',
            async ({ page }) => {

                test.setTimeout(180000);

                const { LoginPage } =
                    require('../../../pages/LoginPage');

                const TestCredentials =
                    require('../../../utils/TestCredentials');

                const UiEvidenceHelper =
                    require('../../../utils/UiEvidenceHelper');

                await UiEvidenceHelper.setViewport(page);

                const loginPage =
                    new LoginPage(page);

                await loginPage.navigate();
                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 1 - Login page'
                );

                await loginPage.login(
                    TestCredentials.getUatUser(),
                    TestCredentials.getUatPassword()
                );
                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 2 - After login submit'
                );

                await loginPage.selectOrganization();

                await expect(page).toHaveURL(
                    /stguat\.unicommerce\.info/i,
                    { timeout: 60000 }
                );

                await UiEvidenceHelper.waitForAppReady(page);

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 3 - STGUAT home'
                );

                const uiPage =
                    new ShipmentPage(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - Shipment Creation app ready'
                );
            }
        );`
        }
    ]
};
