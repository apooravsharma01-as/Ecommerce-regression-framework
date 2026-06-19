const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = {
    "CreatePutawayAndAddPutbackPendingItems": "/data/putaway/manager/picklist/putbackPendingItem/add",
    "addPutbackPendingItemToPutaway": "/data/putaway/manager/putbackitem/add",
    "addNonTraceablePicklistItemsToPutaway": "/data/putaway/picklist/putbackitem/add",
    "addPutbackAcceptedItemsToPutawayPicklistItem": "/data/wms/b2b/picklist/v2/putaway/add",
    "createPutawayList": "/data/putaway/createPutawayList",
    "addWorkOrderItemToPutaway": "/data/kittig/putaway/add/workorderitem",
    "getGatePassItemsForPutaway": "/data/putaway/manager/gatePass/items/get"
};

class PutawayApi {

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

        return { userId: 1, wsPutbackPendingToPutawayItems: [], shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), picklistCode: "PICKLISTCODE_" + Date.now() };
    }


    async CreatePutawayAndAddPutbackPendingItems(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { userId: 1, wsPutbackPendingToPutawayItems: [], shippingPackageCode: "SHIPPINGPACKAGECODE_" + Date.now(), picklistCode: "PICKLISTCODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/putaway/manager/picklist/putbackPendingItem/add`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async addPutbackPendingItemToPutaway(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { itemCode: "ITEMCODE_" + Date.now(), userId: 1, putawayCode: "PUTAWAYCODE_" + Date.now(), inventoryType: "sample_inventoryType", inventoryAdded: false, reason: "sample_reason", qcRejectionIds: "sample_qcRejectionIds" };

        return this.request.post(
            `${BASE_URL}/data/putaway/manager/putbackitem/add`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async addNonTraceablePicklistItemsToPutaway(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { putawayCode: "PUTAWAYCODE_" + Date.now(), userId: 1, putbackItems: [], picklistCode: "PICKLISTCODE_" + Date.now(), skuCode: "SKU" + Date.now(), inventoryAdded: false, skuCode: "SKU" + Date.now(), quantity: 1, batchCode: "BATCHCODE_" + Date.now(), inventoryType: "sample_inventoryType", reason: "sample_reason", qcRejectionIds: "sample_qcRejectionIds" };

        return this.request.post(
            `${BASE_URL}/data/putaway/picklist/putbackitem/add`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async addPutbackAcceptedItemsToPutawayPicklistItem(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { putawayCode: "PUTAWAYCODE_" + Date.now(), userId: 1, putbackItems: [], picklistCode: "PICKLISTCODE_" + Date.now(), skuCode: "SKU" + Date.now(), inventoryAdded: false, skuCode: "SKU" + Date.now(), quantity: 1, batchCode: "BATCHCODE_" + Date.now(), inventoryType: "sample_inventoryType", reason: "sample_reason", qcRejectionIds: "sample_qcRejectionIds" };

        return this.request.post(
            `${BASE_URL}/data/wms/b2b/picklist/v2/putaway/add`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async createPutawayList(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { userId: 1, putawayCode: "PUTAWAYCODE_" + Date.now(), forcefullySuggestShelf: false, username: "Test User" };

        return this.request.post(
            `${BASE_URL}/data/putaway/manager/createPutawayList`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async createPutawayList(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { userId: 1, putawayCode: "PUTAWAYCODE_" + Date.now(), forcefullySuggestShelf: false, username: "Test User" };

        return this.request.post(
            `${BASE_URL}/data/putaway/createPutawayList`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async addWorkOrderItemToPutaway(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { putawayCode: "PUTAWAYCODE_" + Date.now(), userId: 1, workOrderCode: "WORKORDERCODE_" + Date.now(), inventoryAdded: "sample_inventoryAdded", putbackItems: [] };

        return this.request.post(
            `${BASE_URL}/data/kittig/putaway/add/workorderitem`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }


    async getGatePassItemsForPutaway(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || { code: "CODE_" + Date.now() };

        return this.request.post(
            `${BASE_URL}/data/putaway/manager/gatePass/items/get`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }

    async callPrimary() {

        return this.CreatePutawayAndAddPutbackPendingItems();
    }
}

module.exports = { PutawayApi, SCAFFOLD_PATHS };
