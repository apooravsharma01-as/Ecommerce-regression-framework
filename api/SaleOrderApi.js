const AuthHelper =
    require('../utils/AuthHelper');

const { ProductApi } =
    require('./ProductApi');

const { API_PATHS } =
    require('../utils/ApiPaths');

class SaleOrderApi {

    constructor(request, accessToken = null) {
        this.request = request;
        this.accessToken = accessToken;
        this.productApi =
            new ProductApi(request, accessToken);
    }

    async ensureAuthenticated() {

        if (!this.accessToken) {
            this.accessToken =
                await AuthHelper.getAccessToken(
                    this.request
                );
            this.productApi.accessToken =
                this.accessToken;
        }

        return this.accessToken;
    }

    buildSaleOrderPayload(skuCode, orderCode) {

        return {
            saleOrder: {
                code: orderCode,
                channel:
                    process.env.SO_CHANNEL
                    || 'CUSTOM',
                customerCode:
                    process.env.SO_CUSTOMER_CODE
                    || 'SushantTest',
                cashOnDelivery: true,
                currencyCode: 'INR',
                saleOrderItems: [
                    {
                        itemSku: skuCode,
                        itemName: skuCode,
                        shippingMethodCode: 'STD',
                        sellingPrice: 700.54,
                        totalPrice: 700.54,
                        code: `${skuCode}-0`,
                        onHold: false
                    }
                ]
            }
        };
    }

    async createSaleOrder(skuCode = null) {

        await this.ensureAuthenticated();

        const itemSku =
            skuCode || `SOSKU${Date.now()}`;

        if (!skuCode) {
            await this.productApi
                .createProduct(itemSku);
        }

        const orderCode =
            `SO${Date.now()}`;

        const response =
            await this.request.post(
                API_PATHS.saleOrder.create,
                {
                    headers: AuthHelper.authHeaders(
                        this.accessToken
                    ),
                    data: this.buildSaleOrderPayload(
                        itemSku,
                        orderCode
                    )
                }
            );

        return {
            response,
            orderCode,
            itemSku
        };
    }

    async searchSaleOrder(orderCode) {

        await this.ensureAuthenticated();

        return this.request.post(
            API_PATHS.saleOrder.search,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    orderCode,
                    searchOptions: {
                        displayLength: 10,
                        displayStart: 0
                    }
                }
            }
        );
    }

    async createSaleOrderWithInvalidSku(itemSku) {

        await this.ensureAuthenticated();

        const orderCode =
            `BADSO${Date.now()}`;

        return this.request.post(
            API_PATHS.saleOrder.create,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: this.buildSaleOrderPayload(
                    itemSku,
                    orderCode
                )
            }
        );
    }

    async createInternationalSaleOrder(options = {}) {

        await this.ensureAuthenticated();

        const itemSku =
            options.itemSku
            || `INTSKU${Date.now()}`;

        await this.productApi
            .createProduct(itemSku);

        const orderCode =
            options.orderCode
            || `INT${Date.now()}`;

        const country =
            options.country || 'AE';

        const response =
            await this.request.post(
                API_PATHS.saleOrder.create,
                {
                    headers: AuthHelper.authHeaders(
                        this.accessToken
                    ),
                    data: {
                        saleOrder: {
                            code: orderCode,
                            channel:
                                process.env.SO_CHANNEL
                                || 'CUSTOM',
                            customerCode:
                                process.env.SO_CUSTOMER_CODE
                                || 'SushantTest',
                            cashOnDelivery: true,
                            currencyCode: 'AED',
                            addresses: [
                                {
                                    country,
                                    pincode:
                                        options.pincode || '',
                                    state:
                                        options.state || '',
                                    city: 'Dubai',
                                    addressLine1:
                                        'International Test Address'
                                }
                            ],
                            saleOrderItems: [
                                {
                                    itemSku,
                                    itemName: itemSku,
                                    shippingMethodCode: 'STD',
                                    sellingPrice: 700.54,
                                    totalPrice: 700.54,
                                    code: `${itemSku}-0`,
                                    onHold: false
                                }
                            ]
                        }
                    }
                }
            );

        return {
            response,
            orderCode,
            itemSku
        };
    }

    async createSaleOrderWithoutItems() {

        await this.ensureAuthenticated();

        const orderCode =
            `EMPTY${Date.now()}`;

        return this.request.post(
            API_PATHS.saleOrder.create,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    saleOrder: {
                        code: orderCode,
                        channel:
                            process.env.SO_CHANNEL
                            || 'CUSTOM',
                        customerCode:
                            process.env.SO_CUSTOMER_CODE
                            || 'SushantTest',
                        cashOnDelivery: true,
                        currencyCode: 'INR',
                        saleOrderItems: []
                    }
                }
            }
        );
    }

    async cancelSaleOrder({
        saleOrderCode,
        saleOrderItemCodes = [],
        cancelReason = 'Automation regression cancel'
    }) {

        await this.ensureAuthenticated();

        const items =
            (saleOrderItemCodes || []).map(code => ({
                code,
                cancelReason
            }));

        return this.request.post(
            API_PATHS.saleOrder.cancel,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    saleOrder: {
                        code: saleOrderCode,
                        saleOrderItems: items
                    }
                }
            }
        );
    }

    async cancelSaleOrderBySku({
        saleOrderCode,
        itemSku,
        cancelReason = 'Automation regression cancel'
    }) {

        await this.ensureAuthenticated();

        return this.request.post(
            API_PATHS.saleOrder.cancelBySku,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    saleOrder: {
                        code: saleOrderCode,
                        saleOrderItems: [
                            {
                                itemSku,
                                cancelReason
                            }
                        ]
                    }
                }
            }
        );
    }

    async updateSaleOrderStatus({
        saleOrderCode,
        channel = process.env.SO_CHANNEL || 'CUSTOM',
        saleOrderItems = []
    }) {

        await this.ensureAuthenticated();

        return this.request.post(
            API_PATHS.saleOrder.statusUpdate,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    saleOrder: {
                        code: saleOrderCode,
                        channel,
                        saleOrderItems
                    }
                }
            }
        );
    }

    async getSaleOrder(saleOrderCode) {

        await this.ensureAuthenticated();

        return this.request.post(
            API_PATHS.saleOrder.get,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    saleOrderCode
                }
            }
        );
    }
}

module.exports = { SaleOrderApi };
