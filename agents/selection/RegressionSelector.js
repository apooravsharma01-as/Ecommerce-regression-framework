class RegressionSelector {

    static select(impactResult) {

        const tests =
            impactResult.selectedTests || [];

        const playwrightCommand =
            tests.length > 0
                ? `npx playwright test ${tests.join(' ')}`
                : 'npx playwright test';

        return {
            tests,
            count: tests.length,
            playwrightCommand,
            summary: this.buildSummary(impactResult)
        };
    }

    static buildSummary(impactResult) {

        return {
            trigger: impactResult.trigger,
            domains: impactResult.domains,
            layers: {
                ui: impactResult.impactedUI.length,
                api: impactResult.impactedAPI.length,
                db: impactResult.impactedDB.length
            },
            tables: impactResult.tables,
            endpoints: impactResult.endpoints
        };
    }
}

module.exports = RegressionSelector;
