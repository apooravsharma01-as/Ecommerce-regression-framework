const FailureAnalyzer =
    require('../ai/FailureAnalyzer');

    
const {
    allure
} = require('allure-playwright');

class AIReporter {

    static async attachFailureAnalysis({
        testName,
        error,
        stackTrace
    }) {

        const analysis =
            await FailureAnalyzer.analyze({

                testName,

                error,

                stackTrace

            });

        await allure.attachment(
            'AI Failure Analysis',
            analysis,
            'text/plain'
        );

        return analysis;
    }

}

module.exports = AIReporter;