const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = {
    "getPicklistList": "/data/wms/aos/b2c/picking/picklist/list",
    "getPicklistPickingPerformance": "/data/wms/aos/b2b/picking/picklist/performance/get",
    "submitTotePostPicking": "/data/wms/aos/b2c/picklist/picking/tote/submit",
    "updateStartPicking": "/data/oms/picker/startPicking/update",
    "getPicklistShelfList": "/data/wms/aos/b2b/picking/picklist/section/shelf/detail",
    "getPickLocationSuggestions": "/data/wms/aos/b2b/picklist/picking/shelf/suggest",
    "capturePickingPerformance": "/data/wms/aos/b2c/picking/picklist/performance/capture"
};

class PickingApi {

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

        return { timestamp: Date.now() };
    }


    async getPicklistList(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.post(
            `${BASE_URL}/data/wms/aos/b2b/picking/picklist/list`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getPicklistPickingPerformance(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.post(
            `${BASE_URL}/data/wms/aos/b2b/picking/picklist/performance/get`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getPicklistList(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.post(
            `${BASE_URL}/data/wms/aos/b2c/picking/picklist/list`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async submitTotePostPicking(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { pickBucketCode: "PICKBUCKETCODE_" + Date.now(), userId: 1, picklistCode: "PICKLISTCODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/wms/aos/b2c/picklist/picking/tote/submit`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async updateStartPicking(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { picklistCodes: [] };

        return this.request.post(
            `${BASE_URL}/data/oms/picker/startPicking/update`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getPicklistShelfList(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.get(
            `${BASE_URL}/data/wms/aos/b2b/picking/picklist/section/shelf/detail`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getPickLocationSuggestions(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { timestamp: Date.now() };

        return this.request.get(
            `${BASE_URL}/data/wms/aos/b2b/picklist/picking/shelf/suggest`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async capturePickingPerformance(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { picklistCode: "PICKLISTCODE_" + Date.now(), event: "sample_event", pickerCode: "PICKERCODE_" + Date.now(), packingStationCode: "PACKINGSTATIONCODE_" + Date.now() };

        return this.request.get(
            `${BASE_URL}/data/wms/aos/b2c/picking/picklist/performance/capture`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }

    async callPrimary() {

        return this.getPicklistList();
    }
}

module.exports = { PickingApi, SCAFFOLD_PATHS };
