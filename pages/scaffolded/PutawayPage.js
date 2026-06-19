const { BASE_URL } =
    require('../../utils/ApiPaths');

const UiEvidenceHelper =
    require('../../utils/UiEvidenceHelper');

class PutawayPage {

    constructor(page) {
        this.page = page;
        this.panelSelector =
            '#ngframe, .main-content, #main-content, [data-testid="putawayDiv"], #putawayDiv, [data-testid="putawayTemplate"], #putawayTemplate, [data-testid="error"], #error, [data-testid="putawayCode"], #putawayCode, [data-testid="shelfCode"], #shelfCode, [data-testid="itemCode"], #itemCode';
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

    async captureScreenshot(label = 'Putaway') {

        return UiEvidenceHelper.captureScreenshot(
            this.page
        );
    }
}

module.exports = { PutawayPage };
