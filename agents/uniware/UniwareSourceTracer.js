const fs = require('fs');
const path = require('path');

class UniwareSourceTracer {

    static getUniwarePath() {

        return process.env.UNIWARE_PATH
            || path.join(
                process.env.HOME,
                'Uniware'
            );
    }

    static trace() {

        const uniwarePath =
            this.getUniwarePath();

        if (!fs.existsSync(uniwarePath)) {
            return {
                available: false,
                path: uniwarePath,
                endpoints: [],
                entities: [],
                domains: []
            };
        }

        const endpoints =
            this.extractEndpoints(uniwarePath);

        const entities =
            this.extractEntities(uniwarePath);

        return {
            available: true,
            path: uniwarePath,
            endpoints,
            entities,
            domains: this.mapDomains(endpoints, entities)
        };
    }

    static extractEndpoints(uniwarePath) {

        const endpoints = [];
        const restFile =
            path.join(
                uniwarePath,
                'UniwareWeb/src/main/java/com/uniware/web/services/rest/UniwareRESTServicesEndPoint.java'
            );

        if (!fs.existsSync(restFile)) {
            return endpoints;
        }

        const content =
            fs.readFileSync(restFile, 'utf8');

        const pathPattern =
            /@Path\s*\(\s*"([^"]+)"\s*\)/g;

        const paths = [];
        let match;

        while ((match = pathPattern.exec(content)) !== null) {
            paths.push(match[1]);
        }

        const methodPattern =
            /public\s+(\w+)\s+(\w+)\s*\(/g;

        const methods = [];
        let methodMatch;

        while ((methodMatch = methodPattern.exec(content)) !== null) {
            methods.push({
                returnType: methodMatch[1],
                name: methodMatch[2]
            });
        }

        for (let i = 0; i < paths.length; i++) {

            const apiPath = paths[i];
            const method = methods[i] || { name: 'unknown' };
            const normalized =
                apiPath.startsWith('/')
                    ? `/data${apiPath}`
                    : `/data/${apiPath}`;

            endpoints.push({
                path: normalized,
                rawPath: apiPath,
                methodName: method.name,
                domain: this.inferDomain(apiPath)
            });
        }

        return endpoints;
    }

    static extractEntities(uniwarePath) {

        const entities = [];
        const entityDir =
            path.join(
                uniwarePath,
                'UniwareCore/src/main/java/com/uniware/core/entity'
            );

        if (!fs.existsSync(entityDir)) {
            return entities;
        }

        const files =
            this.getJavaFiles(entityDir);

        for (const file of files) {

            const content =
                fs.readFileSync(file, 'utf8');

            const tableMatch =
                content.match(
                    /@Table\s*\(\s*name\s*=\s*"([^"]+)"/
                );

            const classMatch =
                content.match(
                    /public\s+class\s+(\w+)/
                );

            if (!tableMatch || !classMatch) {
                continue;
            }

            const fields =
                this.extractEntityFields(content);

            entities.push({
                className: classMatch[1],
                table: tableMatch[1],
                file: path.relative(uniwarePath, file),
                fields,
                domain: this.inferDomain(classMatch[1])
            });
        }

        return entities;
    }

    static extractEntityFields(content) {

        const fields = [];
        const fieldPattern =
            /@Column\s*\(\s*name\s*=\s*"([^"]+)"[^)]*\)\s*(?:private|protected)\s+\w+\s+(\w+)/g;

        let match;

        while ((match = fieldPattern.exec(content)) !== null) {

            fields.push({
                column: match[1],
                property: match[2]
            });
        }

        const gstMatch =
            content.match(/gstTaxType/g);

        if (gstMatch) {
            fields.push({
                column: 'gst_tax_type_id',
                property: 'gstTaxType'
            });
        }

        return fields;
    }

    static mapDomains(endpoints, entities) {

        const domainMap = {};

        for (const endpoint of endpoints) {

            const domain =
                endpoint.domain || 'other';

            if (!domainMap[domain]) {
                domainMap[domain] = {
                    endpoints: [],
                    tables: [],
                    entities: []
                };
            }

            domainMap[domain].endpoints.push(endpoint.path);
        }

        for (const entity of entities) {

            const domain =
                entity.domain || 'other';

            if (!domainMap[domain]) {
                domainMap[domain] = {
                    endpoints: [],
                    tables: [],
                    entities: []
                };
            }

            domainMap[domain].tables.push(entity.table);
            domainMap[domain].entities.push(entity.className);
        }

        return domainMap;
    }

    static inferDomain(value) {

        const lower =
            value.toLowerCase();

        if (
            lower.includes('itemtype')
            || lower.includes('item_type')
            || lower.includes('/catalog/')
            || lower.includes('taxtype')
        ) {
            return 'product-creation';
        }

        if (
            lower.includes('saleorder')
            || lower.includes('sale_order')
            || lower.includes('/oms/')
        ) {
            return 'sale-order';
        }

        if (
            lower.includes('login')
            || lower.includes('auth')
            || lower.includes('oauth')
        ) {
            return 'login-auth';
        }

        if (
            lower.includes('vendor')
            || lower.includes('purchase')
            || lower.includes('grn')
        ) {
            return 'inbound';
        }

        if (lower.includes('inventory')) {
            return 'inventory';
        }

        return 'other';
    }

    static findByChangedFiles(changedFiles) {

        const trace = this.trace();
        const impacted = {
            endpoints: [],
            tables: [],
            entities: [],
            domains: new Set()
        };

        for (const file of changedFiles) {

            const lower =
                file.toLowerCase();

            for (const endpoint of trace.endpoints) {

                const endpointKey =
                    endpoint.rawPath.toLowerCase()
                        .replace(/[^a-z0-9]/g, '');

                const fileKey =
                    lower.replace(/[^a-z0-9]/g, '');

                if (
                    fileKey.includes('itemtype')
                    && endpointKey.includes('itemtype')
                ) {
                    impacted.endpoints.push(endpoint.path);
                    impacted.domains.add(endpoint.domain);
                }

                if (
                    fileKey.includes('saleorder')
                    && endpointKey.includes('saleorder')
                ) {
                    impacted.endpoints.push(endpoint.path);
                    impacted.domains.add(endpoint.domain);
                }
            }

            for (const entity of trace.entities) {

                const classLower =
                    entity.className.toLowerCase();

                if (
                    lower.includes(classLower)
                    || lower.includes(entity.table)
                ) {
                    impacted.entities.push(entity.className);
                    impacted.tables.push(entity.table);
                    impacted.domains.add(entity.domain);
                }
            }

            const domain =
                this.inferDomain(file);

            if (domain !== 'other') {
                impacted.domains.add(domain);
            }
        }

        impacted.domains = [...impacted.domains];
        impacted.endpoints = [...new Set(impacted.endpoints)];
        impacted.tables = [...new Set(impacted.tables)];
        impacted.entities = [...new Set(impacted.entities)];

        return impacted;
    }

    static getJavaFiles(dir, files = []) {

        const items =
            fs.readdirSync(dir);

        for (const item of items) {

            const fullPath =
                path.join(dir, item);

            const stat =
                fs.statSync(fullPath);

            if (stat.isDirectory()) {
                this.getJavaFiles(fullPath, files);
            } else if (item.endsWith('.java')) {
                files.push(fullPath);
            }
        }

        return files;
    }
}

module.exports = UniwareSourceTracer;
