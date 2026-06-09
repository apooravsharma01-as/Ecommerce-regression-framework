// FILE: api/ProductApi.js

class ProductApi {

    constructor(request) {
        this.request = request;
    }

    async createProduct(randomSku) {

        const response =
            await this.request.post(
                'https://stguat.unicommerce.info/data/catalog/itemType/create',
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },

                    data: {
                        itemType: {
                            imageUrl: null,
                            skuCode: randomSku,
                            name: 'Automation Product',
                            categoryCode: 'Default',
                            batchGroupCode: null,
                            hsnCode: '',
                            skuType: 'GOODS',
                            enabled: true,
                            fragile: false,
                            dangerousGood: false,
                            costPrice: '223',
                            maxRetailPrice: '3212',
                            basePrice: '323',
                            taxTypeCode: 'Accessory12.5',
                            gstTaxTypeCode: 'newgst111',
                            type: 'SIMPLE',
                            description: '',
                            length: null,
                            width: null,
                            height: null,
                            weight: null,
                            brand: null,
                            color: null,
                            size: null,
                            minOrderSize: 1,
                            scanIdentifier: null,
                            ean: '',
                            upc: '',
                            isbn: '',
                            itemDetailFieldsText: null,
                            tags: null,
                            tat: '',
                            customFieldValues: [
                                {
                                    name: 'productest',
                                    value: null
                                }
                            ],
                            expirable: null,
                            determineExpiryFrom: 'FROM_CATEGORY',
                            shelfLife: '',
                            dispatchExpiryTolerance: null,
                            grnExpiryTolerance: '',
                            returnExpiryTolerance: '',
                            componentItemTypes: null,
                            expirableFromCategory: true
                        }
                    }
                }
            );

        return response;
    }

    async getProductBySku(skuCode) {

        const response =
            await this.request.post(
                'https://stguat.unicommerce.info/data/catalog/get/itemType',
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },

                    data: {
                        skuCode
                    }
                }
            );

        return await response.json();
    }
}

module.exports = { ProductApi };