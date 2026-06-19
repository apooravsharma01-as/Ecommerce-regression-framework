const fs = require('fs');
const path = require('path');

class UniwareDtoExtractor {

    static findDtoFile(uniwarePath, className) {

        const roots = [
            path.join(uniwarePath, 'UniwareCore/src/main/java'),
            path.join(uniwarePath, 'UniwareWeb/src/main/java'),
            path.join(uniwarePath, 'UniwareServices/src/main/java')
        ];

        const fileName = `${className}.java`;

        for (const root of roots) {

            if (!fs.existsSync(root)) {
                continue;
            }

            const match =
                this.findFileRecursive(root, fileName);

            if (match) {
                return match;
            }
        }

        return null;
    }

    static findFileRecursive(dir, fileName) {

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

            const fullPath =
                path.join(dir, entry.name);

            if (entry.isDirectory()) {

                const found =
                    this.findFileRecursive(
                        fullPath,
                        fileName
                    );

                if (found) {
                    return found;
                }

                continue;
            }

            if (entry.name === fileName) {
                return fullPath;
            }
        }

        return null;
    }

    static parseFields(javaContent) {

        const fields = [];
        const regex =
            /private\s+([\w.<>,\s]+?)\s+(\w+)\s*;/g;

        let match;

        while ((match = regex.exec(javaContent)) !== null) {

            const rawType =
                match[1].trim();

            const name =
                match[2];

            if (
                name === 'serialVersionUID'
                || rawType.includes('Logger')
            ) {
                continue;
            }

            fields.push({
                name,
                type: rawType
                    .replace(/\s+/g, '')
            });
        }

        return fields;
    }

    static sampleValue(field, className) {

        const { name, type } = field;
        const lower = name.toLowerCase();

        if (type.includes('List') || type.includes('[]')) {
            return '[]';
        }

        if (
            type.startsWith('Ws')
            || type.includes('Detail')
            || type.includes('DTO')
        ) {
            return 'null';
        }

        if (type === 'boolean' || type === 'Boolean') {
            return false;
        }

        if (
            type === 'int'
            || type === 'Integer'
            || type === 'long'
            || type === 'Long'
        ) {
            return 1;
        }

        if (type === 'Date') {
            return Date.now();
        }

        if (lower.includes('code')) {
            if (lower.includes('saleorder')) {
                return '"SO" + Date.now()';
            }

            if (lower.includes('action')) {
                return '"RETURN"';
            }

            if (lower.includes('sku')) {
                return '"SKU" + Date.now()';
            }

            return `"${name.toUpperCase()}_" + Date.now()`;
        }

        if (lower.includes('email')) {
            return '"test@example.com"';
        }

        if (lower.includes('pincode') || lower.includes('zip')) {
            return '"110020"';
        }

        if (lower.includes('state')) {
            return '"UP"';
        }

        if (lower.includes('country')) {
            return '"IN"';
        }

        if (lower.includes('phone') || lower.includes('mobile')) {
            return '"9999999999"';
        }

        if (lower.includes('name')) {
            return '"Test User"';
        }

        if (lower.includes('url') || lower.includes('link')) {
            return '"https://example.com"';
        }

        return `"sample_${name}"`;
    }

    static buildPayloadExpr(fields, className) {

        if (!fields.length) {
            return '{ timestamp: Date.now() }';
        }

        const lines =
            fields
                .slice(0, 12)
                .map(field => {
                    const value =
                        this.sampleValue(field, className);

                    return `            ${field.name}: ${value}`;
                });

        return `{\n${lines.join(',\n')}\n        }`;
    }

    static extractPayload(uniwarePath, requestClassName) {

        if (!requestClassName || !uniwarePath) {
            return {
                fields: [],
                payloadExpr: '{ timestamp: Date.now() }'
            };
        }

        const dtoFile =
            this.findDtoFile(uniwarePath, requestClassName);

        if (!dtoFile) {
            return {
                fields: [],
                payloadExpr: '{ timestamp: Date.now() }',
                requestClass: requestClassName
            };
        }

        const content =
            fs.readFileSync(dtoFile, 'utf8');

        const fields =
            this.parseFields(content);

        return {
            fields,
            payloadExpr:
                this.buildPayloadExpr(
                    fields,
                    requestClassName
                ),
            requestClass: requestClassName,
            sourceFile: dtoFile
        };
    }

    static inferRequestType(methodName) {

        if (
            !methodName
            || methodName.includes('/')
            || methodName.includes('_')
        ) {
            return null;
        }

        const capitalized =
            methodName.charAt(0).toUpperCase()
            + methodName.slice(1);

        return `${capitalized}Request`;
    }

    static extractFromMethodBlock(methodBlock, uniwarePath) {

        const paramMatch =
            methodBlock.match(
                /public\s+\w+(?:<[^>]+>)?\s+\w+\s*\(\s*(\w+)\s+(\w+)\s*\)/
            );

        if (!paramMatch) {
            return null;
        }

        const requestClass =
            paramMatch[1];

        if (
            requestClass === 'String'
            || requestClass === 'Integer'
            || requestClass.startsWith('Http')
        ) {
            return null;
        }

        return this.extractPayload(
            uniwarePath,
            requestClass
        );
    }
}

module.exports = UniwareDtoExtractor;
