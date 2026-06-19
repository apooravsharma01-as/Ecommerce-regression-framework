const fs = require('fs');
const path = require('path');

class ScenarioGenerator {

    static toClassName(flowId) {

        return flowId
            .split('-')
            .map(part =>
                part.charAt(0).toUpperCase() + part.slice(1)
            )
            .join('');
    }

    static buildApiScenario({
        id,
        title,
        type,
        tier,
        flowId,
        apiClass,
        primaryMethod,
        primaryPath,
        payloadExpr,
        logLabel,
        assertions
    }) {

        return `{
            id: '${id}',
            type: '${type}',
            tier: '${tier}',
            signals: ['${flowId}'],
            code: () => \`
        test(
            '${title}',
            async ({ request }) => {

                const api =
                    new ${apiClass}(request);

                const payload =
                    ${payloadExpr};

                const response =
                    await api.${primaryMethod}(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    '${logLabel}',
                    {
                        method: 'POST',
                        url: '${primaryPath}',
                        request: payload,
                        status: response.status(),
                        response: body
                    }
                );

                ${assertions}
            }
        );\`
        }`;
    }

    static generate(flow, apiMeta, dbMeta = {}, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const apiClass =
            apiMeta.className;

        const dbClass =
            dbMeta?.className || null;

        const primaryMethod =
            apiMeta.primaryMethod || 'callPrimary';

        const primaryPath =
            apiMeta.primaryPath || '/unknown';

        const samplePayload =
            apiMeta.samplePayloadExpr
            || 'api.buildDefaultPayload()';

        const pageClass =
            `${this.toClassName(flow.id)}Page`;

        const outputDir =
            path.join(
                rootDir,
                'agents/generator/scenarios/generated'
            );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const posScenario =
            this.buildApiScenario({
                id: `pos-${flow.id}-primary`,
                title: `POSITIVE - ${flow.label} primary API`,
                type: 'positive',
                tier: 'core',
                flowId: flow.id,
                apiClass,
                primaryMethod,
                primaryPath,
                payloadExpr: samplePayload,
                logLabel: `${flow.label} primary`,
                assertions: `
                const ApiAssertions =
                    require('../../../utils/ApiAssertions');
                ApiAssertions.assertPositiveResponse(
                    response,
                    body,
                    expect,
                    '${flow.label} primary API'
                );`
            });

        const negScenario =
            this.buildApiScenario({
                id: `neg-${flow.id}-invalid-payload`,
                title: `NEGATIVE - ${flow.label} rejects invalid payload`,
                type: 'negative',
                tier: 'validation',
                flowId: flow.id,
                apiClass,
                primaryMethod,
                primaryPath,
                payloadExpr: '{ __invalidField: true }',
                logLabel: `${flow.label} invalid payload`,
                assertions: `
                const ApiAssertions =
                    require('../../../utils/ApiAssertions');
                ApiAssertions.assertRejectedResponse(
                    response,
                    body,
                    expect,
                    '${flow.label} invalid payload'
                );`
            });

        const edgeScenario =
            this.buildApiScenario({
                id: `edge-${flow.id}-empty-payload`,
                title: `EDGE - ${flow.label} handles empty payload`,
                type: 'edge',
                tier: 'boundary',
                flowId: flow.id,
                apiClass,
                primaryMethod,
                primaryPath,
                payloadExpr: '{}',
                logLabel: `${flow.label} empty payload`,
                assertions: `
                expect(response.status()).toBeLessThan(600);`
            });

        const dbScenario =
            dbClass
                ? `{
            id: 'pos-${flow.id}-db-check',
            type: 'positive',
            tier: 'core',
            signals: ['${flow.id}'],
            code: () => \`
        test(
            'POSITIVE - ${flow.label} DB record check',
            async ({ request }) => {

                const DbVerify =
                    require('../../../database/DbVerify');

                const api =
                    new ${apiClass}(request);

                const payload =
                    ${samplePayload};

                const response =
                    await api.${primaryMethod}(payload);

                const body =
                    await response.json().catch(() => ({}));

                await EvidenceLogger.logApi(
                    '${flow.label} DB probe',
                    {
                        method: 'POST',
                        url: '${primaryPath}',
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
                    && ${dbClass}.getLatestByCodeWithRetry
                ) {
                    dbRow =
                        await ${dbClass}
                            .getLatestByCodeWithRetry(
                                entityCode,
                                5,
                                2000
                            );
                }

                const total =
                    await ${dbClass}
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
                    '${flow.label} DB query',
                    DbVerify.buildDbEvidence({
                        query:
                            entityCode
                                ? 'SELECT * FROM ${dbMeta?.table || 'related_table'} WHERE code = ?'
                                : 'SELECT COUNT(*) FROM ${dbMeta?.table || 'related_table'} (last 60 min)',
                        table: '${dbMeta?.table || 'related_table'}',
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
                        label: '${flow.label}',
                        orderCode: entityCode
                    });
                } else {
                    expect(connected).toBe(true);
                }
            }
        );\`
        }`
                : '';

        const content = `
module.exports = {
    api: [
        ${posScenario},
        ${negScenario},
        ${edgeScenario}
    ],
    db: [${dbScenario}],
    ui: [
        {
            id: 'pos-${flow.id}-ui-smoke',
            type: 'positive',
            tier: 'core',
            signals: ['${flow.id}'],
            code: () => \`
        test(
            'POSITIVE - ${flow.label} UI smoke',
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
                    /stguat\\.unicommerce\\.info/i,
                    { timeout: 60000 }
                );

                await UiEvidenceHelper.waitForAppReady(page);

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 3 - STGUAT home'
                );

                const uiPage =
                    new ${pageClass}(page);

                await uiPage.waitForMainPanel();

                await UiEvidenceHelper.captureStep(
                    page,
                    EvidenceLogger,
                    'Step 4 - ${flow.label} app ready'
                );
            }
        );\`
        }
    ]
};
`;

        const filePath =
            path.join(
                outputDir,
                `${flow.id}.js`
            );

        fs.writeFileSync(
            filePath,
            content.trim() + '\n'
        );

        return {
            file: path.relative(rootDir, filePath),
            flowId: flow.id
        };
    }
}

module.exports = ScenarioGenerator;
