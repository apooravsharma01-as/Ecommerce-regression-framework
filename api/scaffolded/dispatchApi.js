const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = {
    "forceDispatchShippingPackage": "/data/oms/shipment/forceDispatch",
    "reshipShippingPackage": "/data/oms/returns/shipment/redispatch",
    "dispatchASN": "/data/vendor/asn/dispatch",
    "getShippingProvidersForManifest": "/data/oms/shipment/manifest/fetchShippingProviders",
    "getMaxAllowedPackageInManifest": "/data/oms/shipment/manifest/getMaxAllowedPackageInManifest",
    "addShippingPackageToManifest": "/data/oms/shipment/manifest/addShippingPackage",
    "fetchManifestShippingProvidersSummary": "/data/oms/shipment/manifest/fetchProvidersSummary",
    "getShippingManifest": "/data/oms/shipment/manifest/fetch"
};

class DispatchApi {

    constructor(request, accessToken = null) {
        this.request = request;
        this.accessToken = accessToken;
    }

    async ensureAuthenticated() {

        if (!this.accessToken) {
            this.accessToken =
                await AuthHelper.getAccessToken(
                    this.request
                );
        }

        return this.accessToken;
    }

    buildDefaultPayload() {

        return { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(), trackingNumber: "sample_trackingNumber", invoiceCode: "INVOICECODE_" + Date.now(), userId: 1 };
    }


    async forceDispatchShippingPackage(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(), trackingNumber: "sample_trackingNumber", invoiceCode: "INVOICECODE_" + Date.now(), userId: 1 };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/forceDispatch`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async reshipShippingPackage(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), saleOrderCode: "SO" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/shipment/redispatch`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async dispatchASN(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { asnCode: "ASNCODE_" + Date.now(), expectedDeliveryDate: 1781705022778, purchaseOrderCode: "PURCHASEORDERCODE_" + Date.now(), vendorCode: "VENDORCODE_" + Date.now(), customFieldValues: [], skuCode: "SKU" + Date.now(), quantity: 1 };

        return this.request.post(
            `${BASE_URL}/data/vendor/asn/dispatch`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getShippingProvidersForManifest(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { channelCode: "CHANNELCODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/manifest/fetchShippingProviders`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getMaxAllowedPackageInManifest(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/manifest/getMaxAllowedPackageInManifest`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async addShippingPackageToManifest(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingManifestCode: "SHIPPINGMANIFESTCODE_" + Date.now(), awbOrShipmentCode: "AWBORSHIPMENTCODE_" + Date.now(), shippingPackageTypeCode: "SHIPPINGPACKAGETYPECODE_" + Date.now(), sptItemSealID: "sample_sptItemSealID" };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/manifest/addShippingPackage`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async fetchManifestShippingProvidersSummary(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { code: "CODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/manifest/fetchProvidersSummary`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getShippingManifest(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingManifestCode: "SHIPPINGMANIFESTCODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/manifest/fetch`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }

    async callPrimary() {

        return this.forceDispatchShippingPackage();
    }
}

module.exports = { DispatchApi, SCAFFOLD_PATHS };
