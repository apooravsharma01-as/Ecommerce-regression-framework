const PromptBuilder =
    require('./PromptBuilder');

const LLMClient =
    require('./LLMClient');

class FailureAnalyzer {

    static async analyze({
        testName,
        error,
        stackTrace
    }) {

        const prompt =
            PromptBuilder
                .buildFailureAnalysisPrompt({

                    testName,

                    error,

                    stackTrace

                });

        const analysis =
            await LLMClient
                .generate(prompt);

        return analysis;
    }

}

module.exports = FailureAnalyzer;