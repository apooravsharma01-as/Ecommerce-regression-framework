const { DbConnection } =
    require('../../DbConnection');

class ShipmentQueries {

    static async getLatestByCode(code) {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute(
                `
                SELECT *
                FROM multi_part_shipping_package
                WHERE code = ?
                ORDER BY id DESC
                LIMIT 1
                `,
                [code]
            );

        await connection.end();

        return rows[0] || null;
    }

    static async getLatestByCodeWithRetry(
        code,
        maxRetries = 3,
        delayMs = 1000
    ) {

        for (let attempt = 1; attempt <= maxRetries; attempt++) {

            const row =
                await this.getLatestByCode(code);

            if (row) {
                return row;
            }

            await new Promise(resolve =>
                setTimeout(resolve, delayMs)
            );
        }

        return null;
    }

    static async countRecent(limitMinutes = 30) {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute(
                `
                SELECT COUNT(*) AS total
                FROM multi_part_shipping_package
                WHERE created > DATE_SUB(NOW(), INTERVAL ? MINUTE)
                `,
                [limitMinutes]
            );

        await connection.end();

        return rows[0]?.total || 0;
    }
}

module.exports = { ShipmentQueries };
