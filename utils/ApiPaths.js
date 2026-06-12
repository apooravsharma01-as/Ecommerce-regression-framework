const BASE_URL =
    process.env.BASE_URL
    || 'https://stguat.unicommerce.info';

const API_PATHS = {
    oauth: `${BASE_URL}/oauth/token`,
    product: {
        create: `${BASE_URL}/data/catalog/itemType/create`,
        get: `${BASE_URL}/data/catalog/get/itemType`
    },
    saleOrder: {
        create: `${BASE_URL}/services/rest/v1/oms/saleOrder/create`,
        search: `${BASE_URL}/services/rest/v1/oms/saleOrder/search`
    },
    vendor: {
        getItemTypes:
            `${BASE_URL}/services/rest/v1/purchase/vendorItemType/getVendorItemTypes`
    },
    inventory: {
        snapshot:
            `${BASE_URL}/services/rest/v1/inventory/inventorySnapshot/get`
    }
};

module.exports = { API_PATHS, BASE_URL };
