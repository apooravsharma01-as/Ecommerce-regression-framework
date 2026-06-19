const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = {
    "reassignReverseProviderToReversePickup": "/data/oms/returns/reversePickup/reassignReverseProvider",
    "cancelReversePickup": "/data/oms/returns/reversePickup/cancel",
    "resolveCustomerDispute": "/data/oms/returns/reversePickup/resolveCustomerDispute",
    "raiseDispute": "/data/oms/returns/reversePickup/raiseDispute",
    "getPendingReshipments": "/data/oms/returns/pendingReshipments",
    "checkServiceabilityForReversePickups": "/data/oms/returns/reversePickup/checkServiceability",
    "editReversePickupMetadata": "/data/oms/returns/reversePickup/metadata/edit",
    "completeReversePickup": "/data/oms/returns/reversePickup/complete"
};

class ReturnsApi {

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

        return { reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(), shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(), shippingCourier: "sample_shippingCourier", trackingNumber: "sample_trackingNumber", pickUpAddress: null, trackingLink: "https://example.com" };
    }


    async reassignReverseProviderToReversePickup(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(), shippingProviderCode: "SHIPPINGPROVIDERCODE_" + Date.now(), shippingCourier: "sample_shippingCourier", trackingNumber: "sample_trackingNumber", pickUpAddress: null, trackingLink: "https://example.com" };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/reassignReverseProvider`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async cancelReversePickup(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCode: "REVERSEPICKUPCODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/cancel`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async resolveCustomerDispute(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCodes: [] };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/resolveCustomerDispute`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async raiseDispute(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { disputeType: "sample_disputeType", reversePickupDisputes: [], reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(), disputeReason: "sample_disputeReason" };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/raiseDispute`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getPendingReshipments(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/pendingReshipments`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async checkServiceabilityForReversePickups(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCodes: [] };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/checkServiceability`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async editReversePickupMetadata(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(), customFieldValues: [] };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/metadata/edit`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async completeReversePickup(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { reversePickupCode: "REVERSEPICKUPCODE_" + Date.now(), saleOrderItems: [], saleOrderLineItems: [], userId: 1, forceComplete: false, skuCode: "SKU" + Date.now(), quantity: 1 };

        return this.request.post(
            `${BASE_URL}/data/oms/returns/reversePickup/complete`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }

    async callPrimary() {

        return this.reassignReverseProviderToReversePickup();
    }
}

module.exports = { ReturnsApi, SCAFFOLD_PATHS };
