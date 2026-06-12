const AuthHelper =
    require('../utils/AuthHelper');

const { API_PATHS } =
    require('../utils/ApiPaths');

class InventoryApi {

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

    getFacilityCode() {

        return process.env.FACILITY_CODE || '05';
    }

    buildHeaders() {

        return {
            ...AuthHelper.authHeaders(
                this.accessToken
            ),
            facility: this.getFacilityCode()
        };
    }

    async getInventorySnapshot(skuCodes) {

        await this.ensureAuthenticated();

        const skus =
            Array.isArray(skuCodes)
                ? skuCodes
                : [skuCodes];

        return this.request.post(
            API_PATHS.inventory.snapshot,
            {
                headers: this.buildHeaders(),
                data: {
                    itemTypeSKUs: skus
                }
            }
        );
    }
}

module.exports = { InventoryApi };
