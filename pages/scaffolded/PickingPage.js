const { BASE_URL } =
    require('../../utils/ApiPaths');

const UiEvidenceHelper =
    require('../../utils/UiEvidenceHelper');

class PickingPage {

    constructor(page) {
        this.page = page;
        this.panelSelector =
            '#ngframe, .main-content, #main-content, [data-testid="picklistDiv"], #picklistDiv, [data-testid="message"], #message, [data-testid="picklistTemplate"], #picklistTemplate, [data-testid="picklistCode"], #picklistCode, [data-testid="itemCode"], #itemCode, [data-testid="pickItem"], #pickItem';
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

    async captureScreenshot(label = 'Picking') {

        return UiEvidenceHelper.captureScreenshot(
            this.page
        );
    }
}

module.exports = { PickingPage };
