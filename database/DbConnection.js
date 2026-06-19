const mysql = require('mysql2/promise');
require('dotenv').config();

class DbConnection {

    static resolveConfig() {

        const useUat =
            process.env.DB_USE_UAT === 'true';

        return {
            host:
                useUat
                    ? (
                        process.env.UAT_DB_HOST
                        || process.env.DB_HOST
                    )
                    : process.env.DB_HOST,
            port: Number(
                useUat
                    ? (
                        process.env.UAT_DB_PORT
                        || process.env.DB_PORT
                    )
                    : process.env.DB_PORT
            ) || 3306,
            user:
                useUat
                    ? (
                        process.env.UAT_DB_USER
                        || process.env.DB_USER
                    )
                    : process.env.DB_USER,
            password:
                useUat
                    ? (
                        process.env.UAT_DB_PASSWORD
                        || process.env.DB_PASSWORD
                    )
                    : process.env.DB_PASSWORD,
            database:
                useUat
                    ? (
                        process.env.UAT_DB_NAME
                        || process.env.DB_NAME
                    )
                    : process.env.DB_NAME
        };
    }

    static async getConnection() {

        return await mysql.createConnection(
            this.resolveConfig()
        );

    }

}

module.exports = { DbConnection };