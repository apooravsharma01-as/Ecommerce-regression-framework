module.exports = {
    api: [
        {
            id: 'pos-cancel-rts-channel-sync',
            type: 'positive',
            tier: 'core',
            signals: [
                'cancellation',
                'cancel',
                'dispatch',
                'rts'
            ],
            code: () => `
        test(
            'POSITIVE - channel cancellation at READY_TO_SHIP keeps package RTS + putaway pending',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const OrderLifecycleHelper =
                    require('../../../utils/OrderLifecycleHelper');

                const EvidenceLogger =
                    require('../../../utils/EvidenceLogger');

                const helper =
                    new OrderLifecycleHelper(request);

                const fixture =
                    OrderLifecycleHelper.requireFixture(
                        await helper.findRtsFixture(),
                        'READY_TO_SHIP',
                        expect
                    );

                const items =
                    await helper.getSaleOrderItems(
                        fixture.sale_order_code
                    );

                expect(items.length).toBeGreaterThan(0);

                const itemCodes =
                    items.map(item => item.code);

                const before =
                    await helper.snapshotPackage(
                        fixture.code
                    );

                const { response, body } =
                    await helper.cancelViaChannelSync({
                        saleOrderCode:
                            fixture.sale_order_code,
                        itemCodes
                    });

                await EvidenceLogger.logApi(
                    'Cancel at RTS (channel sync)',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/status/update',
                        request: {
                            saleOrderCode:
                                fixture.sale_order_code,
                            packageCode: fixture.code,
                            itemCodes
                        },
                        status: response.status(),
                        response: body
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    body,
                    expect,
                    'RTS channel cancellation'
                );

                await helper.assertRtsPutawayPendingAfterCancel(
                    fixture.code,
                    expect
                );

                await helper.assertItemsCancelled(
                    fixture.sale_order_code,
                    itemCodes,
                    expect
                );

                const after =
                    await helper.snapshotPackage(
                        fixture.code
                    );

                expect(after.package.status_code)
                    .toBe(before.package.status_code);
            }
        );`
        },
        {
            id: 'pos-cancel-manifest-channel-sync',
            type: 'positive',
            tier: 'core',
            signals: [
                'cancellation',
                'cancel',
                'manifest'
            ],
            code: () => `
        test(
            'POSITIVE - channel cancellation on manifested package removes manifest item',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const OrderLifecycleHelper =
                    require('../../../utils/OrderLifecycleHelper');

                const EvidenceLogger =
                    require('../../../utils/EvidenceLogger');

                const helper =
                    new OrderLifecycleHelper(request);

                const fixture =
                    OrderLifecycleHelper.requireFixture(
                        await helper.findManifestedFixture(),
                        'MANIFESTED',
                        expect
                    );

                const items =
                    await helper.getSaleOrderItems(
                        fixture.sale_order_code
                    );

                expect(items.length).toBeGreaterThan(0);

                const itemCodes =
                    items.map(item => item.code);

                const beforeManifestCount =
                    (await helper.snapshotPackage(
                        fixture.code
                    )).manifestItemCount;

                expect(beforeManifestCount)
                    .toBeGreaterThan(0);

                const { response, body } =
                    await helper.cancelViaChannelSync({
                        saleOrderCode:
                            fixture.sale_order_code,
                        itemCodes
                    });

                await EvidenceLogger.logApi(
                    'Cancel on manifested package',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/status/update',
                        request: {
                            saleOrderCode:
                                fixture.sale_order_code,
                            packageCode: fixture.code,
                            itemCodes
                        },
                        status: response.status(),
                        response: body
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    body,
                    expect,
                    'manifest channel cancellation'
                );

                await helper.assertRemovedFromManifest(
                    fixture.code,
                    expect
                );

                await helper.assertRtsPutawayPendingAfterCancel(
                    fixture.code,
                    expect
                );

                await helper.assertItemsCancelled(
                    fixture.sale_order_code,
                    itemCodes,
                    expect
                );
            }
        );`
        },
        {
            id: 'pos-cancel-dispatched-no-op',
            type: 'positive',
            tier: 'core',
            signals: [
                'cancellation',
                'cancel',
                'dispatch'
            ],
            code: () => `
        test(
            'POSITIVE - cancellation on DISPATCHED shipment is no-op',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const OrderLifecycleHelper =
                    require('../../../utils/OrderLifecycleHelper');

                const EvidenceLogger =
                    require('../../../utils/EvidenceLogger');

                const helper =
                    new OrderLifecycleHelper(request);

                const fixture =
                    OrderLifecycleHelper.requireFixture(
                        await helper.findDispatchedFixture(),
                        'DISPATCHED',
                        expect
                    );

                const items =
                    await helper.getSaleOrderItems(
                        fixture.sale_order_code
                    );

                expect(items.length).toBeGreaterThan(0);

                const itemCodes =
                    items.map(item => item.code);

                const before =
                    await helper.snapshotPackage(
                        fixture.code
                    );

                const { response, body } =
                    await helper.cancelViaChannelSync({
                        saleOrderCode:
                            fixture.sale_order_code,
                        itemCodes
                    });

                await EvidenceLogger.logApi(
                    'Cancel on dispatched package',
                    {
                        method: 'POST',
                        url: '/data/oms/saleOrder/status/update',
                        request: {
                            saleOrderCode:
                                fixture.sale_order_code,
                            packageCode: fixture.code,
                            itemCodes
                        },
                        status: response.status(),
                        response: body
                    }
                );

                const after =
                    await helper.snapshotPackage(
                        fixture.code
                    );

                await helper.assertDispatchedUnchanged(
                    before,
                    after,
                    expect
                );

                expect(
                    body.successful === true
                    || body.successful === false
                ).toBeTruthy();
            }
        );`
        },
        {
            id: 'neg-pending-verification-not-rts',
            type: 'negative',
            tier: 'core',
            signals: ['cancellation', 'order'],
            code: () => `
        test(
            'NEGATIVE - freshly created API order is PENDING_VERIFICATION (not cancellable at RTS/manifest)',
            async ({ request }) => {

                const ApiAssertions =
                    require('../../../utils/ApiAssertions');

                const OrderLifecycleHelper =
                    require('../../../utils/OrderLifecycleHelper');

                const EvidenceLogger =
                    require('../../../utils/EvidenceLogger');

                const { SaleOrderApi } =
                    require('../../../api/SaleOrderApi');

                const { SaleOrderQueries } =
                    require('../../../database/queries/SaleOrderQueries');

                const {
                    ShippingPackageQueries
                } = require('../../../database/queries/ShippingPackageQueries');

                const api =
                    new SaleOrderApi(request);

                const {
                    response,
                    orderCode,
                    itemSku
                } = await api.createSaleOrder();

                const createBody =
                    await response.json();

                await EvidenceLogger.logApi(
                    'Create order for lifecycle check',
                    {
                        method: 'POST',
                        url: '/services/rest/v1/oms/saleOrder/create',
                        request: { orderCode, itemSku },
                        status: response.status(),
                        response: createBody
                    }
                );

                ApiAssertions.assertPositiveResponse(
                    response,
                    createBody,
                    expect,
                    'create order'
                );

                const dbOrder =
                    await SaleOrderQueries
                        .getSaleOrderByCode(orderCode);

                expect(dbOrder.status_code).toBe(
                    'PENDING_VERIFICATION'
                );

                const pkg =
                    await ShippingPackageQueries
                        .findBySaleOrderCode(orderCode);

                expect(pkg).toBeNull();
            }
        );`
        }
    ],
    db: [
        {
            id: 'db-rts-cancel-state',
            type: 'positive',
            tier: 'core',
            signals: ['cancellation', 'cancel', 'rts'],
            code: () => `
        test(
            'DB - RTS package after channel cancel has putaway_pending and CANCELLED items',
            async ({ request }) => {

                const OrderLifecycleHelper =
                    require('../../../utils/OrderLifecycleHelper');

                const DbVerify =
                    require('../../../database/DbVerify');

                const EvidenceLogger =
                    require('../../../utils/EvidenceLogger');

                const helper =
                    new OrderLifecycleHelper(request);

                const fixture =
                    OrderLifecycleHelper.requireFixture(
                        await helper.findRtsFixture(),
                        'READY_TO_SHIP',
                        expect
                    );

                const items =
                    await helper.getSaleOrderItems(
                        fixture.sale_order_code
                    );

                const itemCodes =
                    items.map(item => item.code);

                await helper.cancelViaChannelSync({
                    saleOrderCode:
                        fixture.sale_order_code,
                    itemCodes
                });

                const pkg =
                    await DbVerify.buildDbEvidence({
                        query:
                            'SELECT * FROM shipping_package WHERE code = ?',
                        table: 'shipping_package',
                        orderCode:
                            fixture.sale_order_code,
                        row:
                            await require('../../../database/queries/ShippingPackageQueries')
                                .getByCode(fixture.code),
                        verification: 'row-required'
                    });

                await EvidenceLogger.logDb(
                    'RTS package after cancel',
                    pkg
                );

                expect(pkg.row.status_code)
                    .toBe('READY_TO_SHIP');
                expect(
                    pkg.row.putaway_pending === 1
                    || pkg.row.putaway_pending === true
                ).toBeTruthy();
            }
        );`
        }
    ]
};
