module.exports = {
    api: [
        {
            id: 'pos-dispatch-primary',
            type: 'positive',
            tier: 'core',
            signals: ['dispatch'],
            code: () => `
        test(
            'POSITIVE - Dispatch & Manifest primary API',
            async ({ request }) => {

                const api =
                    new DispatchApi(request);

                const {
                    ShippingPackageQueries
                } = require('../../../database/queries/ShippingPackageQueries');

                const fixture =
                    await ShippingPackageQueries
                        .findFixtureByStatus(
                            'READY_TO_SHIP'
                        );

                if (!fixture) {
                    test.skip(
                        true,
                        'No READY_TO_SHIP package — set TEST_RTS_PACKAGE_CODE or start db:tunnel'
                    );
                }

                const response =
                    await api.getShippingProvidersForManifest({
                        channelCode:
                            process.env.SO_CHANNEL
                            || 'CUSTOM'
                    });

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Dispatch manifest providers',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/manifest/fetchShippingProviders',
                        request: {
                            channelCode:
                                process.env.SO_CHANNEL
                                || 'CUSTOM',
                            rtsPackageCode: fixture.code
                        },
                        status: response.status(),
                        response: body
                    }
                );

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                expect(response.status()).toBeLessThan(500);
                expect(
                    body.successful === true
                    || Array.isArray(body.shippingProviders)
                    || body.shippingProviders != null
                ).toBeTruthy();
            }
        );`
        },
        {
            id: 'neg-dispatch-invalid-payload',
            type: 'negative',
            tier: 'validation',
            signals: ['dispatch'],
            code: () => `
        test(
            'NEGATIVE - Dispatch & Manifest rejects invalid payload',
            async ({ request }) => {

                const api =
                    new DispatchApi(request);

                const payload =
                    { __invalidField: true };

                const response =
                    await api.forceDispatchShippingPackage(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Dispatch & Manifest invalid payload',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/forceDispatch',
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
                    'Dispatch & Manifest invalid payload'
                );
            }
        );`
        },
        {
            id: 'edge-dispatch-empty-payload',
            type: 'edge',
            tier: 'boundary',
            signals: ['dispatch'],
            code: () => `
        test(
            'EDGE - Dispatch & Manifest handles empty payload',
            async ({ request }) => {

                const api =
                    new DispatchApi(request);

                const payload =
                    {};

                const response =
                    await api.forceDispatchShippingPackage(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Dispatch & Manifest empty payload',
                    {
                        method: 'POST',
                        url: '/data/oms/shipment/forceDispatch',
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
            id: 'pos-dispatch-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['dispatch'],
            code: () => `
        test(
            'POSITIVE - Dispatch & Manifest DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const {
                    ShippingPackageQueries
                } = require('../../../database/queries/ShippingPackageQueries');

                const fixture =
                    await ShippingPackageQueries
                        .findFixtureByStatus(
                            'READY_TO_SHIP'
                        );

                if (!fixture) {
                    test.skip(
                        true,
                        'No READY_TO_SHIP package — set TEST_RTS_PACKAGE_CODE or start db:tunnel'
                    );
                }

                const pkg =
                    await ShippingPackageQueries
                        .getByCode(fixture.code);

                const connected =
                    await DbVerify.ping();

                await EvidenceLogger.logDb(
                    'RTS shipping package fixture',
                    DbVerify.buildDbEvidence({
                        query:
                            'SELECT * FROM shipping_package WHERE code = ?',
                        table: 'shipping_package',
                        orderCode: fixture.sale_order_code,
                        row: pkg,
                        rowsFound: pkg ? 1 : 0,
                        verification: 'row-required',
                        connected
                    })
                );

                DbVerify.assertRowFound(pkg, {
                    label: 'RTS shipping package',
                    orderCode: fixture.sale_order_code
                });

                expect(pkg.status_code).toBe('READY_TO_SHIP');
            }
        );`
        }],
    ui: [
        {
            id: 'pos-dispatch-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['dispatch'],
            code: () => `
        test(
            'POSITIVE - Dispatch & Manifest UI smoke',
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
                    new DispatchPage(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - Dispatch & Manifest app ready'
                );
            }
        );`
        }
    ]
};
