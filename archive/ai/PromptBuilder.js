class PromptBuilder {

    static buildFailureAnalysisPrompt({
        testName,
        error,
        stackTrace
    }) {

        return `
You are a Senior QA Automation Engineer.

Analyze the following Playwright test failure.

Test Name:
${testName}

Error:
${error}

Stack Trace:
${stackTrace}

Provide your response in the following format:

Failure Type:
<failure type>

Root Cause:
<root cause>

Suggested Fix:
<suggested fix>

Confidence:
<confidence percentage>
`;
    }

}

module.exports = PromptBuilder;