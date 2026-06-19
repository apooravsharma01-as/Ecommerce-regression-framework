const { DbConnection } =
    require('../DbConnection');

class SaleOrderQueries {

    static async getSaleOrderByCode(code) {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute(
                `
                SELECT
                    id,
                    code,
                    status_code
                FROM sale_order
                WHERE code = ?
                `,
                [code]
            );

        await connection.end();

        return rows[0];
    }

    static async getSaleOrderItemsByCode(code) {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute(
                `
                SELECT
                    soi.id,
                    soi.code,
                    soi.status_code,
                    soi.item_sku
                FROM sale_order_item soi
                INNER JOIN sale_order so
                    ON soi.sale_order_id = so.id
                WHERE so.code = ?
                `,
                [code]
            );

        await connection.end();

        return rows;
    }

    static async getSaleOrderByCodeWithRetry(
        code,
        maxRetries = 10,
        delayMs = 2000
    ) {

        for (let attempt = 1; attempt <= maxRetries; attempt++) {

            const order =
                await this.getSaleOrderByCode(code);

            if (order) {
                return order;
            }

            await new Promise(resolve =>
                setTimeout(resolve, delayMs)
            );
        }

        return null;
    }
}

module.exports = { SaleOrderQueries };
