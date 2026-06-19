const fs = require('fs');
const path = require('path');
const UniwareUiLocatorExtractor =
    require('../../uniware/UniwareUiLocatorExtractor');

class PageObjectGenerator {

    static toClassName(flowId) {

        return flowId
            .split('-')
            .map(part =>
                part.charAt(0).toUpperCase() + part.slice(1)
            )
            .join('');
    }

    static sanitizeLocators(locators = []) {

        return locators.filter(locator =>
            locator
            && !locator.includes('<')
            && !locator.includes('#=')
            && !locator.includes('${')
            && locator.length < 60
        );
    }

    static generate(flow, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const uniwarePath =
            options.uniwarePath || null;

        const className =
            `${this.toClassName(flow.id)}Page`;

        const outputDir =
            path.join(rootDir, 'pages/scaffolded');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const uiScan =
            uniwarePath
                ? UniwareUiLocatorExtractor.extractForFlow(
                    flow.id,
                    uniwarePath
                )
                : { locators: [], files: [] };

        const cleanLocators =
            this.sanitizeLocators(uiScan.locators);

        const locatorSelectors =
            [
                '#ngframe',
                '.main-content',
                '#main-content',
                ...cleanLocators.map(locator =>
                    `[data-testid="${locator}"], #${locator}`
                )
            ].join(', ');

        const content = `
const { BASE_URL } =
    require('../../utils/ApiPaths');

const UiEvidenceHelper =
    require('../../utils/UiEvidenceHelper');

class ${className} {

    constructor(page) {
        this.page = page;
        this.panelSelector =
            '${locatorSelectors.replace(/'/g, "\\'")}';
    }

    async navigate() {

        await this.page.goto(
            BASE_URL,
            {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            }
        );
    }

    async waitForMainPanel() {

        await UiEvidenceHelper.waitForAppReady(
            this.page
        );
    }

    async captureScreenshot(label = '${flow.label}') {

        return UiEvidenceHelper.captureScreenshot(
            this.page
        );
    }
}

module.exports = { ${className} };
`;

        const filePath =
            path.join(
                outputDir,
                `${className}.js`
            );

        fs.writeFileSync(
            filePath,
            content.trim() + '\n'
        );

        return {
            file: path.relative(rootDir, filePath),
            className,
            route: flow.uiRoutes?.[0] || '/',
            locators: cleanLocators,
            viewFiles: uiScan.files.map(file =>
                path.relative(uniwarePath || rootDir, file)
            )
        };
    }
}

module.exports = PageObjectGenerator;
