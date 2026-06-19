const { BASE_URL } =
    require('../../utils/ApiPaths');

const UiEvidenceHelper =
    require('../../utils/UiEvidenceHelper');

class ShipmentPage {

    constructor(page) {
        this.page = page;
        this.panelSelector =
            '#ngframe, .main-content, #main-content, [data-testid="itemCode"], #itemCode, [data-testid="searching"], #searching, [data-testid="itemDiv"], #itemDiv, [data-testid="itemComments"], #itemComments, [data-testid="orderTemplate"], #orderTemplate, [data-testid="createShipment"], #createShipment';
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

    async captureScreenshot(label = 'Shipment Creation') {

        return UiEvidenceHelper.captureScreenshot(
            this.page
        );
    }
}

module.exports = { ShipmentPage };
