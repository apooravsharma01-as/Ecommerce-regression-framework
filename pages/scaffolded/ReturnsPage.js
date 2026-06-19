const { BASE_URL } =
    require('../../utils/ApiPaths');

const UiEvidenceHelper =
    require('../../utils/UiEvidenceHelper');

class ReturnsPage {

    constructor(page) {
        this.page = page;
        this.panelSelector =
            '#ngframe, .main-content, #main-content';
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

    async captureScreenshot(label = 'Returns / RTO') {

        return UiEvidenceHelper.captureScreenshot(
            this.page
        );
    }
}

module.exports = { ReturnsPage };
