const fs = require('fs');
const path = require('path');
const UniwareDtoExtractor =
    require('../../uniware/UniwareDtoExtractor');

class ApiClientGenerator {

    static toClassName(flowId) {

        return flowId
            .split('-')
            .map(part =>
                part.charAt(0).toUpperCase() + part.slice(1)
            )
            .join('');
    }

    static toMethodName(endpoint) {

        const base =
            endpoint.methodName
            || endpoint.segment
            || 'call';

        return base
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+|_+$/g, '')
            || 'callEndpoint';
    }

    static generate(flow, endpoints, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const uniwarePath =
            options.uniwarePath || null;

        const className =
            `${this.toClassName(flow.id)}Api`;

        const outputDir =
            path.join(rootDir, 'api/scaffolded');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const uniqueEndpoints =
            this.dedupeEndpoints(endpoints);

        const primary =
            uniqueEndpoints[0];

        const primaryPayload =
            this.resolvePayload(
                primary,
                uniwarePath
            );

        const methods =
            uniqueEndpoints
                .slice(0, 8)
                .map(endpoint =>
                    this.buildMethod(
                        endpoint,
                        uniwarePath
                    )
                )
                .join('\n\n');

        const pathsObject =
            this.buildPathsObject(
                uniqueEndpoints.slice(0, 8)
            );

        const content = `
const AuthHelper =
    require('../../utils/AuthHelper');

const { BASE_URL } =
    require('../../utils/ApiPaths');

const SCAFFOLD_PATHS = ${JSON.stringify(pathsObject, null, 4)};

class ${className} {

    constructor(request, accessToken = null) {
        this.request = request;
        this.accessToken = accessToken;
    }

    async ensureAuthenticated() {

        if (!this.accessToken) {
            this.accessToken =
                await AuthHelper.getAccessToken(
                    this.request
                );
        }

        return this.accessToken;
    }

    buildDefaultPayload() {

        return ${primaryPayload.inlinePayload};
    }

${methods}

    async callPrimary() {

        return this.${this.toMethodName(primary)}();
    }
}

module.exports = { ${className}, SCAFFOLD_PATHS };
`;

        const filePath =
            path.join(
                outputDir,
                `${flow.id}Api.js`
            );

        fs.writeFileSync(
            filePath,
            content.trim() + '\n'
        );

        return {
            file: path.relative(rootDir, filePath),
            className,
            endpoints: uniqueEndpoints.length,
            primaryPath: primary?.path,
            primaryMethod:
                this.toMethodName(primary),
            samplePayloadExpr:
                primaryPayload.payloadExpr,
            requestClass:
                primaryPayload.requestClass || null
        };
    }

    static resolvePayload(endpoint, uniwarePath) {

        const requestClass =
            endpoint?.requestType
            || UniwareDtoExtractor.inferRequestType(
                endpoint?.methodName
            );

        if (requestClass && uniwarePath) {

            const dto =
                UniwareDtoExtractor.extractPayload(
                    uniwarePath,
                    requestClass
                );

            if (dto.fields?.length > 0) {
                return {
                    payloadExpr: dto.payloadExpr,
                    inlinePayload:
                        this.exprToInline(dto.payloadExpr),
                    requestClass: dto.requestClass
                };
            }
        }

        return {
            payloadExpr: '{ timestamp: Date.now() }',
            inlinePayload:
                '{ timestamp: Date.now() }',
            requestClass: null
        };
    }

    static exprToInline(payloadExpr) {

        return payloadExpr
            .replace(/\n\s*/g, ' ')
            .trim();
    }

    static dedupeEndpoints(endpoints) {

        const seen = new Set();

        return endpoints.filter(endpoint => {

            const key =
                `${endpoint.method}:${endpoint.path}`;

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }

    static buildMethod(endpoint, uniwarePath) {

        const methodName =
            this.toMethodName(endpoint);

        const httpMethod =
            (endpoint.method || 'POST').toLowerCase();

        const payload =
            this.resolvePayload(
                endpoint,
                uniwarePath
            );

        return `
    async ${methodName}(payload = null) {

        await this.ensureAuthenticated();

        const body =
            payload || ${payload.inlinePayload};

        return this.request.${httpMethod}(
            \`\${BASE_URL}${endpoint.path}\`,
            {
                headers: AuthHelper.authHeaders(
                    this.accessToken
                ),
                data: body
            }
        );
    }`;
    }

    static buildPathsObject(endpoints) {

        const paths = {};

        for (const endpoint of endpoints) {

            const key =
                this.toMethodName(endpoint)
                    .replace(/[^a-zA-Z0-9]/g, '_');

            paths[key] = endpoint.path;
        }

        return paths;
    }
}

module.exports = ApiClientGenerator;
