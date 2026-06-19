const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = {
    "bulkAllocateShippingProvider": "/data/oms/shipment/bulk/provider/allocate",
    "assignManualTrackingNumber": "/data/oms/shipment/awb/assign",
    "markShippingPackageDelivered": "/data/oms/shipment/markDelivered",
    "addShippingPackageToManifest": "/data/oms/shipment/manifest/addShippingPackage",
    "forceDispatchShippingPackage": "/data/oms/shipment/forceDispatch",
    "removeShippingPackageHoldBeforeManifest": "/data/oms/shipment/holdBeforeManifest/remove",
    "bulkPreAllocateShippingProvider": "/data/oms/shipment/bulk/provider/preallocate",
    "refreshShippingLabel": "/data/oms/shipment/refreshShippingLabel"
};

class ShipmentApi {

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

        return { shippingPackageCodes: [], userId: 1 };
    }


    async bulkAllocateShippingProvider(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCodes: [], userId: 1 };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/bulk/provider/allocate`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async assignManualTrackingNumber(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), trackingNumber: "sample_trackingNumber" };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/awb/assign`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async markShippingPackageDelivered(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), podCode: "PODCODE_" + Date.now(), courierStatus: "sample_courierStatus" };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/markDelivered`,
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


    async removeShippingPackageHoldBeforeManifest(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCodes: [] };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/holdBeforeManifest/remove`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async bulkPreAllocateShippingProvider(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { preAllocateRequests: [], userId: 1 };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/bulk/provider/preallocate`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async refreshShippingLabel(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/shipment/refreshShippingLabel`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }

    async callPrimary() {

        return this.bulkAllocateShippingProvider();
    }
}

module.exports = { ShipmentApi, SCAFFOLD_PATHS };
