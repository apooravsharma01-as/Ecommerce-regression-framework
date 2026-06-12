const { DbConnection } =
    require('../DbConnection');

class ProductQueries {

    static async getProductBySku(
        skuCode
    ) {

        const connection =
            await DbConnection
                .getConnection();

        const [rows] =
            await connection.execute(
                `
                SELECT
                    id,
                    sku_code,
                    name,
                    enabled
                FROM item_type
                WHERE sku_code = ?
                `,
                [skuCode]
            );

        await connection.end();

        return rows[0];
    }

    static async getProductBySkuWithRetry(
        skuCode,
        maxRetries = 15,
        delayMs = 2000
    ) {

        for (let attempt = 1; attempt <= maxRetries; attempt++) {

            const product =
                await this.getProductBySku(skuCode);

            if (product) {
                return product;
            }

            await new Promise(resolve =>
                setTimeout(resolve, delayMs)
            );
        }

        return null;
    }
}

module.exports = {
    ProductQueries
};