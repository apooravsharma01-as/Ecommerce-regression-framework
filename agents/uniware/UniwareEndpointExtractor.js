const fs = require('fs');
const path = require('path');
const UniwareSourceTracer =
    require('./UniwareSourceTracer');

class UniwareEndpointExtractor {

    static getControllerDir(uniwarePath) {

        return path.join(
            uniwarePath,
            'UniwareWeb/src/main/java/com/uniware/web/controller'
        );
    }

    static extractAll(uniwarePath) {

        const controllerDir =
            this.getControllerDir(uniwarePath);

        if (!fs.existsSync(controllerDir)) {
            return [];
        }

        const endpoints = [];
        const files =
            UniwareSourceTracer.getJavaFiles(controllerDir);

        for (const file of files) {

            const relative =
                path.relative(uniwarePath, file);

            if (
                !relative.includes('Resource')
                && !relative.includes('Controller')
            ) {
                continue;
            }

            endpoints.push(
                ...this.parseResourceFile(file)
            );
        }

        return endpoints;
    }

    static parseResourceFile(filePath) {

        const content =
            fs.readFileSync(filePath, 'utf8');

        const classPathMatch =
            content.match(
                /@Path\s*\(\s*"([^"]+)"\s*\)/
            );

        if (!classPathMatch) {
            return [];
        }

        const basePath =
            classPathMatch[1].replace(/\/$/, '');

        const endpoints = [];

        const methodRegex =
            /@(GET|POST|PUT|DELETE)[\s\S]*?@Path\s*\(\s*"([^"]+)"\s*\)[\s\S]*?public\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g;

        let match;

        while ((match = methodRegex.exec(content)) !== null) {

            const httpMatch = match[1];
            const segment = match[2];
            const javaMethod = match[4];
            const params = match[5] || '';

            const requestType =
                params
                    .split(',')
                    .map(part => {

                        const bits =
                            part.trim().split(/\s+/);

                        if (bits.length >= 2) {
                            return bits[0];
                        }

                        return bits[bits.length - 1];
                    })
                    .find(type =>
                        type
                        && !type.startsWith('@')
                        && type !== 'String'
                        && type !== 'Integer'
                        && type !== 'request'
                        && !type.startsWith('Http')
                    ) || null;

            const fullPath =
                `${basePath}/${segment}`
                    .replace(/\/+/g, '/');

            endpoints.push({
                path: fullPath,
                segment,
                method: httpMatch,
                methodName: javaMethod,
                requestType,
                sourceFile:
                    path.basename(filePath),
                domain: this.inferFlowFromPath(fullPath)
            });
        }

        return endpoints;
    }

    static inferFlowFromPath(apiPath) {

        const lower =
            apiPath.toLowerCase();

        if (lower.includes('dispatch') || lower.includes('manifest')) {
            return 'dispatch';
        }

        if (lower.includes('shipment') || lower.includes('awb')) {
            return 'shipment';
        }

        if (lower.includes('picklist') || lower.includes('picker')) {
            return 'picking';
        }

        if (lower.includes('packer') || lower.includes('packlist')) {
            return 'packing';
        }

        if (lower.includes('putaway')) {
            return 'putaway';
        }

        if (lower.includes('inflow') || lower.includes('grn')) {
            return 'grn';
        }

        if (
            lower.includes('return')
            || lower.includes('reversepickup')
            || lower.includes('/rto')
        ) {
            return 'returns';
        }

        if (lower.includes('saleorder')) {
            return 'sale-order';
        }

        if (lower.includes('catalog') || lower.includes('itemtype')) {
            return 'product-creation';
        }

        if (lower.includes('inventory')) {
            return 'inventory';
        }

        return 'other';
    }

    static matchFlows(story, flowDefinitions) {

        const lower =
            (story || '').toLowerCase();

        const matched = [];

        for (const flow of Object.values(flowDefinitions)) {

            const hit =
                flow.keywords.some(keyword =>
                    lower.includes(keyword.toLowerCase())
                );

            if (hit) {
                matched.push(flow.id);
            }
        }

        return [...new Set(matched)];
    }

    static scoreEndpoint(endpoint, flow) {

        const text =
            `${endpoint.path} ${endpoint.methodName} ${endpoint.segment}`
                .toLowerCase();

        let score = 0;

        for (const pattern of flow.pathPatterns) {

            if (text.includes(pattern.toLowerCase())) {
                score += 10;
            }
        }

        if (text.includes(`/oms/${flow.id}`)) {
            score += 8;
        }

        if (text.includes('/data/oms/shipment')) {
            score += 6;
        }

        if (text.includes(flow.id.toLowerCase())) {
            score += 5;
        }

        if (endpoint.method === 'POST') {
            score += 2;
        }

        return score;
    }

    static filterEndpoints(endpoints, flowIds, flowDefinitions) {

        if (!flowIds.length) {
            return [];
        }

        const ranked = [];

        for (const flowId of flowIds) {

            const flow =
                flowDefinitions[flowId];

            if (!flow) {
                continue;
            }

            for (const endpoint of endpoints) {

                const score =
                    this.scoreEndpoint(endpoint, flow);

                if (score <= 0) {
                    continue;
                }

                ranked.push({
                    ...endpoint,
                    score,
                    flowId
                });
            }
        }

        return ranked
            .sort((a, b) => b.score - a.score)
            .filter((endpoint, index, list) =>
                list.findIndex(item =>
                    item.path === endpoint.path
                ) === index
            );
    }

    static filterEntities(entities, flowIds, flowDefinitions) {

        const patterns =
            flowIds.flatMap(id => {
                const flow =
                    flowDefinitions[id];

                return flow
                    ? [
                        ...flow.entityPatterns,
                        ...flow.tablePatterns
                    ]
                    : [];
            });

        return entities.filter(entity => {

            const text =
                `${entity.className} ${entity.table}`
                    .toLowerCase();

            return patterns.some(pattern =>
                text.includes(pattern.toLowerCase())
            );
        });
    }
}

module.exports = UniwareEndpointExtractor;
