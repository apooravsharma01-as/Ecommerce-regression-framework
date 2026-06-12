const FailureAnalyzer =
    require('../../agents/llm/FailureAnalyzer');

class AIFailureHook {

    static isEnabled() {

        return process.env.ENABLE_AI_FAILURE_ANALYSIS
            === 'true';
    }

    static async analyzeFailure(
        testInfo
    ) {

        if (
            testInfo.status ===
            testInfo.expectedStatus
        ) {
            return;
        }

        const errorMessage =
            testInfo.error?.message
            || 'No error message found';

        const stackTrace =
            testInfo.error?.stack
            || 'No stack trace found';

        console.log('\n--- FAILED TEST DETECTED ---');
        console.log('Test:', testInfo.title);
        console.log('Error:', errorMessage);

        const analysis =
            await FailureAnalyzer.analyze({
                testName: testInfo.title,
                error: errorMessage,
                stackTrace,
                useLlm: this.isEnabled()
            });

        console.log('\n--- Failure Analysis ---');
        console.log('Type:', analysis.failureType);
        console.log('Root Cause:', analysis.rootCause);
        console.log('Suggested Fix:', analysis.suggestedFix);
        console.log('Confidence:', analysis.confidence);
        console.log('Source:', analysis.source);

        if (analysis.llmAnalysis) {
            console.log('\n--- LLM Analysis ---');
            console.log(analysis.llmAnalysis);
        }

        if (analysis.llmError) {
            console.log(
                '\nLLM analysis skipped:',
                analysis.llmError
            );
        }

        return analysis;
    }
}

module.exports = AIFailureHook;
