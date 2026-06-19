const fs = require('fs');
const path = require('path');

class DbQueryGenerator {

    static toClassName(flowId) {

        return flowId
            .split('-')
            .map(part =>
                part.charAt(0).toUpperCase() + part.slice(1)
            )
            .join('');
    }

    static generate(flow, entities, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const className =
            `${this.toClassName(flow.id)}Queries`;

        const outputDir =
            path.join(
                rootDir,
                'database/queries/scaffolded'
            );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const primary =
            entities[0];

        const table =
            primary?.table || `${flow.id.replace(/-/g, '_')}_record`;

        const codeColumn =
            primary?.fields?.find(field =>
                field.column.includes('code')
            )?.column || 'code';

        const content = `
const { DbConnection } =
    require('../../DbConnection');

class ${className} {

    static async getLatestByCode(code) {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute(
                \`
                SELECT *
                FROM ${table}
                WHERE ${codeColumn} = ?
                ORDER BY id DESC
                LIMIT 1
                \`,
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
                \`
                SELECT COUNT(*) AS total
                FROM ${table}
                WHERE created > DATE_SUB(NOW(), INTERVAL ? MINUTE)
                \`,
                [limitMinutes]
            );

        await connection.end();

        return rows[0]?.total || 0;
    }
}

module.exports = { ${className} };
`;

        const filePath =
            path.join(
                outputDir,
                `${flow.id}Queries.js`
            );

        fs.writeFileSync(
            filePath,
            content.trim() + '\n'
        );

        return {
            file: path.relative(rootDir, filePath),
            className,
            table
        };
    }
}

module.exports = DbQueryGenerator;
