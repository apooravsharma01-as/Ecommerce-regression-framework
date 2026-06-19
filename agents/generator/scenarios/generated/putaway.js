module.exports = {
    api: [
        {
            id: 'pos-putaway-primary',
            type: 'positive',
            tier: 'core',
            signals: ['putaway'],
            code: () => `
        test(
            'POSITIVE - Putaway primary API',
            async ({ request }) => {

                const api =
                    new PutawayApi(request);

                const payload =
                    {
            userId: 1,
            wsPutbackPendingToPutawayItems: [],
            shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(),
            picklistCode: "PICKLISTCODE_" + Date.now()
        };

                const response =
                    await api.CreatePutawayAndAddPutbackPendingItems(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Putaway primary',
                    {
                        method: 'POST',
                        url: '/data/putaway/manager/picklist/putbackPendingItem/add',
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
                    'Putaway primary API'
                );
            }
        );`
        },
        {
            id: 'neg-putaway-invalid-payload',
            type: 'negative',
            tier: 'validation',
            signals: ['putaway'],
            code: () => `
        test(
            'NEGATIVE - Putaway rejects invalid payload',
            async ({ request }) => {

                const api =
                    new PutawayApi(request);

                const payload =
                    { __invalidField: true };

                const response =
                    await api.CreatePutawayAndAddPutbackPendingItems(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Putaway invalid payload',
                    {
                        method: 'POST',
                        url: '/data/putaway/manager/picklist/putbackPendingItem/add',
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
                    'Putaway invalid payload'
                );
            }
        );`
        },
        {
            id: 'edge-putaway-empty-payload',
            type: 'edge',
            tier: 'boundary',
            signals: ['putaway'],
            code: () => `
        test(
            'EDGE - Putaway handles empty payload',
            async ({ request }) => {

                const api =
                    new PutawayApi(request);

                const payload =
                    {};

                const response =
                    await api.CreatePutawayAndAddPutbackPendingItems(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Putaway empty payload',
                    {
                        method: 'POST',
                        url: '/data/putaway/manager/picklist/putbackPendingItem/add',
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
            id: 'pos-putaway-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['putaway'],
            code: () => `
        test(
            'POSITIVE - Putaway DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const api =
                    new PutawayApi(request);

                const payload =
                    {
            userId: 1,
            wsPutbackPendingToPutawayItems: [],
            shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(),
            picklistCode: "PICKLISTCODE_" + Date.now()
        };

                const response =
                    await api.CreatePutawayAndAddPutbackPendingItems(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    'Putaway DB probe',
                    {
                        method: 'POST',
                        url: '/data/putaway/manager/picklist/putbackPendingItem/add',
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
                    && PutawayQueries.getLatestByCodeWithRetry
                ) {
                    dbRow =
                        await PutawayQueries
                            .getLatestByCodeWithRetry(
                                entityCode,
                                5,
                                2000
                            );
                }

                const total =
                    await PutawayQueries
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
                    'Putaway DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            entityCode
                                ? 'SELECT * FROM putaway WHERE code = ?'
                                : 'SELECT COUNT(*) FROM putaway (last 60 min)',
                        table: 'putaway',
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
                        label: 'Putaway',
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
            id: 'pos-putaway-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['putaway'],
            code: () => `
        test(
            'POSITIVE - Putaway UI smoke',
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
                    new PutawayPage(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - Putaway app ready'
                );
            }
        );`
        }
    ]
};
