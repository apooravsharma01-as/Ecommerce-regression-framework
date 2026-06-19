const { DbConnection } =
    require('../DbConnection');

class ShippingManifestQueries {

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

    static async getManifestForPackage(packageCode) {

        const rows =
            await this.query(
                `
                SELECT
                    sm.id,
                    sm.code,
                    sm.status_code
                FROM shipping_manifest sm
                INNER JOIN shipping_manifest_item smi
                    ON smi.shipping_manifest_id = sm.id
                INNER JOIN shipping_package sp
                    ON smi.shipping_package_id = sp.id
                WHERE sp.code = ?
                ORDER BY sm.id DESC
                LIMIT 1
                `,
                [packageCode]
            );

        return rows[0] || null;
    }

    static async countItemsForPackage(packageCode) {

        const rows =
            await this.query(
                `
                SELECT COUNT(*) AS count
                FROM shipping_manifest_item smi
                INNER JOIN shipping_package sp
                    ON smi.shipping_package_id = sp.id
                WHERE sp.code = ?
                `,
                [packageCode]
            );

        return rows[0]?.count || 0;
    }
}

module.exports = { ShippingManifestQueries };
