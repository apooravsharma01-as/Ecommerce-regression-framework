// FILE: api/ProductApi.js

const AuthHelper =
    require('../utils/AuthHelper');

class ProductApi {

    constructor(request, accessToken = null) {
        this.request = request;
        this.accessToken = accessToken;
        this.baseUrl =
            process.env.BASE_URL
            || 'https://stguat.unicommerce.info';
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

    buildItemTypePayload(skuCode, overrides = {}) {

        return {
            imageUrl: null,
            skuCode,
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
            expirableFromCategory: true,
            ...overrides
        };
    }

    async createProduct(randomSku, overrides = {}) {

        await this.ensureAuthenticated();

        const response =
            await this.request.post(
                `${this.baseUrl}/data/catalog/itemType/create`,
                {
                    headers: AuthHelper.authHeaders(
                        this.accessToken
                    ),

                    data: {
                        itemType: this.buildItemTypePayload(
                            randomSku,
                            overrides
                        )
                    }
                }
            );

        return response;
    }

    async createProductWithGst(skuCode, gstTaxTypeCode) {

        return this.createProduct(skuCode, {
            gstTaxTypeCode
        });
    }

    async getProductBySku(skuCode) {

        await this.ensureAuthenticated();

        const response =
            await this.request.post(
                `${this.baseUrl}/data/catalog/get/itemType`,
                {
                    headers: AuthHelper.authHeaders(
                        this.accessToken
                    ),

                    data: {
                        skuCode
                    }
                }
            );

        return await response.json();
    }
}

module.exports = { ProductApi };