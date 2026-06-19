const fs = require('fs');
const path = require('path');
const UniwareSourceTracer =
    require('./UniwareSourceTracer');

class UniwareUiLocatorExtractor {

    static findViewFiles(uniwarePath, flowId) {

        const roots = [
            path.join(uniwarePath, 'UniwareWeb/src/main/webapp'),
            path.join(uniwarePath, 'UniwareWeb/WebContent')
        ];

        const terms =
            [
                flowId,
                flowId.replace(/-/g, ''),
                flowId.replace(/-/g, '_')
            ];

        const matches = [];

        for (const root of roots) {

            if (!fs.existsSync(root)) {
                continue;
            }

            this.walk(root, file => {

                const lower =
                    file.toLowerCase();

                if (
                    !lower.endsWith('.jsp')
                    && !lower.endsWith('.html')
                    && !lower.endsWith('.js')
                ) {
                    return;
                }

                if (
                    terms.some(term =>
                        lower.includes(term)
                    )
                ) {
                    matches.push(file);
                }
            });
        }

        return matches.slice(0, 5);
    }

    static walk(dir, visitor) {

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

            const fullPath =
                path.join(dir, entry.name);

            if (entry.isDirectory()) {
                this.walk(fullPath, visitor);
                continue;
            }

            visitor(fullPath);
        }
    }

    static extractLocators(filePath) {

        const content =
            fs.readFileSync(filePath, 'utf8');

        const locators = [];

        const patterns = [
            /id\s*=\s*"([^"]+)"/g,
            /data-testid\s*=\s*"([^"]+)"/g,
            /ng-click\s*=\s*"([^"]+)"/g
        ];

        for (const pattern of patterns) {

            let match;

            while ((match = pattern.exec(content)) !== null) {

                const value = match[1];

                if (
                    value.length > 2
                    && value.length < 80
                    && !value.includes('<')
                    && !value.includes('#=')
                    && !value.includes('${')
                ) {
                    locators.push(value);
                }
            }
        }

        return [...new Set(locators)].slice(0, 8);
    }

    static extractForFlow(flowId, uniwarePath) {

        const path =
            uniwarePath
            || UniwareSourceTracer.getUniwarePath();

        const files =
            this.findViewFiles(path, flowId);

        const locators = [];

        for (const file of files) {

            try {
                locators.push(
                    ...this.extractLocators(file)
                );
            } catch {
                continue;
            }
        }

        return {
            files,
            locators: [...new Set(locators)].slice(0, 6)
        };
    }
}

module.exports = UniwareUiLocatorExtractor;
