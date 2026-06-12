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

    static buildStoryParsingPrompt({
        story,
        availableDomains
    }) {

        const domainList =
            availableDomains
                .map(domain => `- ${domain.id}: ${domain.keywords.join(', ')}`)
                .join('\n');

        return `
You are a QA impact analyst for an ecommerce platform (Uniware).

Given this change description, identify which regression domains are impacted.

Story:
${story}

Available domains:
${domainList}

Respond with ONLY valid JSON (no markdown fences):
{
  "domains": ["domain-id"],
  "summary": "one line impact summary",
  "keywords": ["matched", "terms"]
}
`;
    }
}

module.exports = PromptBuilder;
