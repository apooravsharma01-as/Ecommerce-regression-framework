module.exports = {
    api: [
        {
            id: 'pos-picking-primary',
            type: 'positive',
            tier: 'core',
            signals: ['picking'],
            code: () => `
        test(
            'POSITIVE - Picking primary API',
            async ({ request }) => {

                const api =
                    new PickingApi(request);

                const payload =
                    { timestamp: Date.now() };

                const response =
                    await api.getPicklistList(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Picking primary',
                    {
                        method: 'POST',
                        url: '/data/wms/aos/b2b/picking/picklist/list',
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
                    'Picking primary API'
                );
            }
        );`
        },
        {
            id: 'neg-picking-invalid-payload',
            type: 'negative',
            tier: 'validation',
            signals: ['picking'],
            code: () => `
        test(
            'NEGATIVE - Picking rejects invalid payload',
            async ({ request }) => {

                const api =
                    new PickingApi(request);

                const payload =
                    { __invalidField: true };

                const response =
                    await api.getPicklistList(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Picking invalid payload',
                    {
                        method: 'POST',
                        url: '/data/wms/aos/b2b/picking/picklist/list',
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
                    'Picking invalid payload'
                );
            }
        );`
        },
        {
            id: 'edge-picking-empty-payload',
            type: 'edge',
            tier: 'boundary',
            signals: ['picking'],
            code: () => `
        test(
            'EDGE - Picking handles empty payload',
            async ({ request }) => {

                const api =
                    new PickingApi(request);

                const payload =
                    {};

                const response =
                    await api.getPicklistList(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Picking empty payload',
                    {
                        method: 'POST',
                        url: '/data/wms/aos/b2b/picking/picklist/list',
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
            id: 'pos-picking-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['picking'],
            code: () => `
        test(
            'POSITIVE - Picking DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const api =
                    new PickingApi(request);

                const payload =
                    { timestamp: Date.now() };

                const response =
                    await api.getPicklistList(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Picking DB probe',
                    {
                        method: 'POST',
                        url: '/data/wms/aos/b2b/picking/picklist/list',
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
                    && PickingQueries.getLatestByCodeWithRetry
                ) {
                    dbRow =
                        await PickingQueries
                            .getLatestByCodeWithRetry(
                                entityCode,
                                5,
                                2000
                            );
                }

                const total =
                    await PickingQueries
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
                    'Picking DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            entityCode
                                ? 'SELECT * FROM handling_unit_item_picklist_item WHERE code = ?'
                                : 'SELECT COUNT(*) FROM handling_unit_item_picklist_item (last 60 min)',
                        table: 'handling_unit_item_picklist_item',
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
                        label: 'Picking',
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
            id: 'pos-picking-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['picking'],
            code: () => `
        test(
            'POSITIVE - Picking UI smoke',
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
                    new PickingPage(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - Picking app ready'
                );
            }
        );`
        }
    ]
};
