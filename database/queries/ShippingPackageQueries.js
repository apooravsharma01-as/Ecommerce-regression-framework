const { DbConnection } =
    require('../DbConnection');

class ShippingPackageQueries {

    static async query(sql, params = []) {

        const connection =
            await DbConnection.getConnection();

        try {
            const [rows] =
                await connection.execute(sql, params);

            return rows;
        } finally {
            await connection.end();
        }
    }

    static async getByCode(code) {

        const rows =
            await this.query(
                `
                SELECT
                    sp.id,
                    sp.code,
                    sp.status_code,
                    sp.putaway_pending,
                    sp.shipping_manifest_id,
                    so.code AS sale_order_code
                FROM shipping_package sp
                LEFT JOIN sale_order so
                    ON sp.sale_order_id = so.id
                WHERE sp.code = ?
                LIMIT 1
                `,
                [code]
            );

        return rows[0] || null;
    }

    static async findBySaleOrderCode(
        saleOrderCode,
        statusCode = null
    ) {

        let sql =
            `
            SELECT
                sp.id,
                sp.code,
                sp.status_code,
                sp.putaway_pending,
                sp.shipping_manifest_id,
                so.code AS sale_order_code
            FROM shipping_package sp
            INNER JOIN sale_order so
                ON sp.sale_order_id = so.id
            WHERE so.code = ?
            `;

        const params = [saleOrderCode];

        if (statusCode) {
            sql += ' AND sp.status_code = ?';
            params.push(statusCode);
        }

        sql += ' ORDER BY sp.id DESC LIMIT 1';

        const rows =
            await this.query(sql, params);

        return rows[0] || null;
    }

    static async findFixtureByStatus(
        statusCode,
        options = {}
    ) {

        const envKey =
            statusCode === 'READY_TO_SHIP'
                ? 'TEST_RTS_PACKAGE_CODE'
                : statusCode === 'MANIFESTED'
                    ? 'TEST_MANIFESTED_PACKAGE_CODE'
                    : statusCode === 'DISPATCHED'
                        ? 'TEST_DISPATCHED_PACKAGE_CODE'
                        : null;

        if (envKey && process.env[envKey]) {

            return this.getByCode(
                process.env[envKey]
            );
        }

        const minAgeMinutes =
            options.minAgeMinutes ?? 5;

        const rows =
            await this.query(
                `
                SELECT
                    sp.id,
                    sp.code,
                    sp.status_code,
                    sp.putaway_pending,
                    sp.shipping_manifest_id,
                    so.code AS sale_order_code
                FROM shipping_package sp
                LEFT JOIN sale_order so
                    ON sp.sale_order_id = so.id
                WHERE sp.status_code = ?
                  AND sp.created < DATE_SUB(NOW(), INTERVAL ? MINUTE)
                ORDER BY sp.id DESC
                LIMIT 1
                `,
                [statusCode, minAgeMinutes]
            );

        return rows[0] || null;
    }

    static async isOnManifest(packageCode) {

        const rows =
            await this.query(
                `
                SELECT smi.id
                FROM shipping_manifest_item smi
                INNER JOIN shipping_package sp
                    ON smi.shipping_package_id = sp.id
                WHERE sp.code = ?
                LIMIT 1
                `,
                [packageCode]
            );

        return rows.length > 0;
    }
}

module.exports = { ShippingPackageQueries };
