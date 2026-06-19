const { SaleOrderApi } =
    require('../api/SaleOrderApi');

const { DispatchApi } =
    require('../api/scaffolded/dispatchApi');

const { SaleOrderQueries } =
    require('../database/queries/SaleOrderQueries');

const {
    ShippingPackageQueries
} = require('../database/queries/ShippingPackageQueries');

const {
    ShippingManifestQueries
} = require('../database/queries/ShippingManifestQueries');

const STATES =
    require('./orderLifecycle/states');

class OrderLifecycleHelper {

    constructor(request) {

        this.request = request;
        this.saleOrderApi =
            new SaleOrderApi(request);
        this.dispatchApi =
            new DispatchApi(request);
    }

    static requireFixture(
        fixture,
        statusCode,
        expect
    ) {

        expect(
            fixture,
            `No ${statusCode} shipping package found in UAT DB. `
            + `Set TEST_${statusCode}_PACKAGE_CODE in .env `
            + 'or seed a package in that state before running cancellation tests.'
        ).toBeTruthy();

        expect(
            fixture.sale_order_code,
            `Package ${fixture.code} has no linked sale order`
        ).toBeTruthy();

        return fixture;
    }

    async getSaleOrderItems(saleOrderCode) {

        return SaleOrderQueries
            .getSaleOrderItemsByCode(saleOrderCode);
    }

    async findRtsFixture() {

        return ShippingPackageQueries
            .findFixtureByStatus(
                STATES.SHIPPING_PACKAGE.READY_TO_SHIP
            );
    }

    async findManifestedFixture() {

        const manifested =
            await ShippingPackageQueries
                .findFixtureByStatus('MANIFESTED');

        if (manifested) {
            return manifested;
        }

        const rows =
            await ShippingPackageQueries.query(
                `
                SELECT
                    sp.id,
                    sp.code,
                    sp.status_code,
                    sp.putaway_pending,
                    sp.shipping_manifest_id,
                    so.code AS sale_order_code
                FROM shipping_package sp
                INNER JOIN shipping_manifest_item smi
                    ON smi.shipping_package_id = sp.id
                INNER JOIN sale_order so
                    ON sp.sale_order_id = so.id
                WHERE sp.status_code IN ('READY_TO_SHIP', 'MANIFESTED')
                ORDER BY sp.id DESC
                LIMIT 1
                `
            );

        return rows[0] || null;
    }

    async findDispatchedFixture() {

        return ShippingPackageQueries
            .findFixtureByStatus(
                STATES.SHIPPING_PACKAGE.DISPATCHED
            );
    }

    async cancelViaChannelSync({
        saleOrderCode,
        itemCodes,
        channel
    }) {

        const saleOrderItems =
            itemCodes.map(code => ({
                code,
                status: STATES.ITEM.CANCELLED
            }));

        const response =
            await this.saleOrderApi
                .updateSaleOrderStatus({
                    saleOrderCode,
                    channel,
                    saleOrderItems
                });

        const body =
            await response.json().catch(() => ({}));

        return { response, body };
    }

    async cancelDirect({
        saleOrderCode,
        itemCodes,
        cancelReason
    }) {

        const response =
            await this.saleOrderApi.cancelSaleOrder({
                saleOrderCode,
                saleOrderItemCodes: itemCodes,
                cancelReason
            });

        const body =
            await response.json().catch(() => ({}));

        return { response, body };
    }

    async snapshotPackage(packageCode) {

        const pkg =
            await ShippingPackageQueries
                .getByCode(packageCode);

        const manifestItemCount =
            await ShippingManifestQueries
                .countItemsForPackage(packageCode);

        const items =
            pkg?.sale_order_code
                ? await this.getSaleOrderItems(
                    pkg.sale_order_code
                )
                : [];

        return {
            package: pkg,
            manifestItemCount,
            items
        };
    }

    async assertRtsPutawayPendingAfterCancel(
        packageCode,
        expect
    ) {

        const pkg =
            await ShippingPackageQueries
                .getByCode(packageCode);

        expect(pkg).toBeTruthy();
        expect(pkg.status_code).toBe(
            STATES.SHIPPING_PACKAGE.READY_TO_SHIP
        );
        expect(
            pkg.putaway_pending === 1
            || pkg.putaway_pending === true
        ).toBeTruthy();
    }

    async assertItemsCancelled(
        saleOrderCode,
        itemCodes,
        expect
    ) {

        const items =
            await this.getSaleOrderItems(
                saleOrderCode
            );

        for (const itemCode of itemCodes) {

            const item =
                items.find(row =>
                    row.code === itemCode
                );

            expect(item).toBeTruthy();
            expect(item.status_code).toBe(
                STATES.ITEM.CANCELLED
            );
        }
    }

    async assertRemovedFromManifest(
        packageCode,
        expect
    ) {

        const count =
            await ShippingManifestQueries
                .countItemsForPackage(packageCode);

        expect(count).toBe(0);
    }

    async assertDispatchedUnchanged(
        before,
        after,
        expect
    ) {

        expect(after.package?.status_code)
            .toBe(before.package?.status_code);
        expect(after.manifestItemCount)
            .toBe(before.manifestItemCount);
    }
}

module.exports = OrderLifecycleHelper;
