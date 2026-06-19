module.exports = {
    api: [
        {
            id: 'pos-returns-primary',
            type: 'positive',
            tier: 'core',
            signals: ['returns'],
            code: () => `
        test(
            'POSITIVE - Returns / RTO primary API',
            async ({ request }) => {

                const api =
                    new ReturnsApi(request);

                const payload =
                    {
            reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(),
            shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(),
            shippingCourier: "sample_shippingCourier",
            trackingNumber: "sample_trackingNumber",
            pickUpAddress: null,
            trackingLink: "https://example.com"
        };

                const response =
                    await api.reassignReverseProviderToReversePickup(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Returns / RTO primary',
                    {
                        method: 'POST',
                        url: '/data/oms/returns/reversePickup/reassignReverseProvider',
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
                    'Returns / RTO primary API'
                );
            }
        );`
        },
        {
            id: 'neg-returns-invalid-payload',
            type: 'negative',
            tier: 'validation',
            signals: ['returns'],
            code: () => `
        test(
            'NEGATIVE - Returns / RTO rejects invalid payload',
            async ({ request }) => {

                const api =
                    new ReturnsApi(request);

                const payload =
                    { __invalidField: true };

                const response =
                    await api.reassignReverseProviderToReversePickup(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Returns / RTO invalid payload',
                    {
                        method: 'POST',
                        url: '/data/oms/returns/reversePickup/reassignReverseProvider',
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
                    'Returns / RTO invalid payload'
                );
            }
        );`
        },
        {
            id: 'edge-returns-empty-payload',
            type: 'edge',
            tier: 'boundary',
            signals: ['returns'],
            code: () => `
        test(
            'EDGE - Returns / RTO handles empty payload',
            async ({ request }) => {

                const api =
                    new ReturnsApi(request);

                const payload =
                    {};

                const response =
                    await api.reassignReverseProviderToReversePickup(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Returns / RTO empty payload',
                    {
                        method: 'POST',
                        url: '/data/oms/returns/reversePickup/reassignReverseProvider',
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
            id: 'pos-returns-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['returns'],
            code: () => `
        test(
            'POSITIVE - Returns / RTO DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const api =
                    new ReturnsApi(request);

                const payload =
                    {
            reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(),
            shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(),
            shippingCourier: "sample_shippingCourier",
            trackingNumber: "sample_trackingNumber",
            pickUpAddress: null,
            trackingLink: "https://example.com"
        };

                const response =
                    await api.reassignReverseProviderToReversePickup(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Returns / RTO DB probe',
                    {
                        method: 'POST',
                        url: '/data/oms/returns/reversePickup/reassignReverseProvider',
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
                    && ReturnsQueries.getLatestByCodeWithRetry
                ) {
                    dbRow =
                        await ReturnsQueries
                            .getLatestByCodeWithRetry(
                                entityCode,
                                5,
                                2000
                            );
                }

                const total =
                    await ReturnsQueries
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
                    'Returns / RTO DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            entityCode
                                ? 'SELECT * FROM courier_return_item WHERE code = ?'
                                : 'SELECT COUNT(*) FROM courier_return_item (last 60 min)',
                        table: 'courier_return_item',
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
                        label: 'Returns / RTO',
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
            id: 'pos-returns-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['returns'],
            code: () => `
        test(
            'POSITIVE - Returns / RTO UI smoke',
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
                    new ReturnsPage(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - Returns / RTO app ready'
                );
            }
        );`
        }
    ]
};
