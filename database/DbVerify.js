const { DbConnection } =
    require('./DbConnection');

class DbVerify {

    static getResolvedConfig() {

        return DbConnection.resolveConfig();
    }

    static getTargetLabel() {

        const config =
            this.getResolvedConfig();

        return (
            `${config.host || 'unknown'}`
            + `:${config.port || 3306}`
            + `/${config.database || ''}`
        );
    }

    static isLikelyLocal(host = null) {

        if (process.env.DB_USE_UAT === 'true') {
            return false;
        }

        const resolved =
            (host || this.getResolvedConfig().host || '')
                .toLowerCase();

        return (
            resolved === '127.0.0.1'
            || resolved === 'localhost'
            || resolved === '::1'
            || resolved === ''
        );
    }

    static getApiHost() {

        const baseUrl =
            process.env.BASE_URL
            || 'https://stguat.unicommerce.info';

        try {
            return new URL(baseUrl).hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    static isApiOnRemote() {

        const host =
            this.getApiHost();

        return Boolean(host) && !this.isLikelyLocal(host);
    }

    static hasApiDbMismatch() {

        if (process.env.DB_SKIP_VERIFY === 'true') {
            return true;
        }

        if (process.env.DB_FORCE_VERIFY === 'true') {
            return false;
        }

        return (
            this.isApiOnRemote()
            && this.isLikelyLocal()
        );
    }

    static getMismatchReason() {

        return (
            'API writes to '
            + (process.env.BASE_URL || 'UAT')
            + ' but DB points to local MySQL ('
            + this.getTargetLabel()
            + '). Set DB_USE_UAT=true with UAT_DB_HOST, UAT_DB_USER,'
            + ' UAT_DB_PASSWORD, UAT_DB_NAME in .env — or set'
            + ' DB_SKIP_VERIFY=true to skip DB checks locally.'
        );
    }

    static resolveVerificationStatus(record = {}) {

        const verification =
            record.verification || 'row-required';

        const rowsFound =
            record.rowsFound
            ?? (record.row ? 1 : 0);

        if (verification === 'skipped') {
            return 'skipped';
        }

        if (verification === 'connectivity') {
            return record.connected === false
                ? 'failed'
                : 'passed';
        }

        return rowsFound > 0
            ? 'passed'
            : 'failed';
    }

    static skipIfApiDbMismatch(test, context = {}) {

        if (process.env.DB_SKIP_VERIFY === 'true') {

            const reason =
                this.getMismatchReason();

            const EvidenceLogger =
                require('../utils/EvidenceLogger');

            EvidenceLogger.append({
                type: 'db',
                label:
                    context.label
                    || 'DB verification skipped',
                status: 'skipped',
                record: {
                    verification: 'skipped',
                    rowsFound: 0,
                    row: null,
                    reason,
                    dbTarget: this.getTargetLabel(),
                    likelyLocal: this.isLikelyLocal(),
                    orderCode: context.orderCode || null
                }
            });

            test.skip(true, reason);
            return;
        }

        const warning =
            this.hasApiDbMismatch()
                ? this.getMismatchReason()
                : null;

        if (!warning) {
            return;
        }

        const EvidenceLogger =
            require('../utils/EvidenceLogger');

        EvidenceLogger.append({
            type: 'db',
            label:
                context.label
                || 'DB environment notice',
            status: 'failed',
            record: {
                verification: 'row-required',
                rowsFound: 0,
                row: null,
                reason:
                    warning
                    + ' Test will execute — expect fail if row missing.',
                dbTarget: this.getTargetLabel(),
                likelyLocal: this.isLikelyLocal(),
                orderCode: context.orderCode || null
            }
        });
    }

    static assertMinimumRows(count, context = {}) {

        const { expect } =
            require('@playwright/test');

        expect(
            count,
            `Expected at least ${context.minRows || 1} row(s) for ${context.label || 'record'}`
            + `${context.orderCode ? ` (${context.orderCode})` : ''}`
            + ` on ${this.getTargetLabel()}.`
            + ` Found ${count}.`
        ).toBeGreaterThanOrEqual(
            context.minRows || 1
        );

        return count;
    }

    static async ping() {

        const connection =
            await DbConnection.getConnection();

        const [rows] =
            await connection.execute('SELECT 1 AS ok');

        await connection.end();

        return rows[0]?.ok === 1;
    }

    static buildDbEvidence({
        query,
        table,
        orderCode = null,
        row = null,
        rowsFound = null,
        verification = 'row-required',
        connected = null,
        reason = null
    }) {

        const resolvedRows =
            rowsFound ?? (row ? 1 : 0);

        const record = {
            query,
            table,
            orderCode,
            dbTarget: this.getTargetLabel(),
            likelyLocal: this.isLikelyLocal(),
            verification,
            rowsFound: resolvedRows,
            row: row || null,
            connected,
            reason
        };

        record.status =
            this.resolveVerificationStatus(record);

        return record;
    }

    static assertRowFound(row, context = {}) {

        const { expect } =
            require('@playwright/test');

        const hint =
            this.isLikelyLocal()
                ? ' API writes to UAT but DB_HOST points to local MySQL. Set DB_HOST to UAT MySQL replica.'
                : ' Verify DB credentials and replication lag.';

        expect(
            row,
            `Expected DB row for ${context.label || 'record'}`
            + `${context.orderCode ? ` (${context.orderCode})` : ''}`
            + ` on ${this.getTargetLabel()}.${hint}`
        ).not.toBeNull();

        return row;
    }
}

module.exports = DbVerify;
