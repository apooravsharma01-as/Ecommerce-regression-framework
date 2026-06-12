const AuthHelper =
    require('../utils/AuthHelper');

const { API_PATHS } =
    require('../utils/ApiPaths');

class VendorCatalogApi {

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

    async getVendorItemTypes(
        vendorCode = process.env.VENDOR_CODE || 'sushant01'
    ) {

        await this.ensureAuthenticated();

        return this.request.post(
            API_PATHS.vendor.getItemTypes,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: {
                    vendorCode,
                    pageNumber: 0,
                    pageSize: 10
                }
            }
        );
    }
}

module.exports = { VendorCatalogApi };
