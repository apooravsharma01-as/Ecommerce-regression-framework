const JiraFetcher =
    require('./JiraFetcher');

class JiraReporter {

    static buildComment(report) {

        const impact =
            report.impact || {};

        const execution =
            report.execution || {};

        const status =
            !execution.executed
                ? 'ANALYSIS ONLY'
                : execution.passed
                    ? 'PASSED'
                    : 'FAILED';

        const scenarioLines =
            (report.generation?.domains || [])
                .flatMap(domain => {
                    const summary =
                        domain.scenarios;

                    if (!summary) {
                        return [];
                    }

                    return Object.entries(summary)
                        .map(([layer, data]) =>
                            `${domain.domain}.${layer}: ${data.positive} positive, ${data.negative} negative, ${data.edge} edge`
                        );
                });

        const lines = [
            'Regression Agent Results',
            '',
            `Status: ${status}`,
            `Trigger: ${report.trigger || 'n/a'}`,
            `Domains: ${(impact.domains || []).join(', ') || 'none'}`,
            `Diff signals: ${(report.diffAnalysis?.signals || []).join(', ') || 'n/a'}`,
            `Tests: ${(report.tests || []).length}`,
            ''
        ];

        if (scenarioLines.length > 0) {
            lines.push('Generated scenarios:');
            lines.push(...scenarioLines);
            lines.push('');
        }

        if (execution.executed) {
            lines.push(
                `Duration: ${((execution.durationMs || 0) / 1000).toFixed(1)}s`
            );
        }

        return lines.join('\n');
    }

    static isEnabled() {

        return process.env.JIRA_COMMENTS_ENABLED === 'true';
    }

    static async postComment(issueKey, report) {

        if (!this.isEnabled()) {
            return {
                posted: false,
                reason: 'JIRA comments disabled (set JIRA_COMMENTS_ENABLED=true to enable)'
            };
        }

        if (!JiraFetcher.isConfigured()) {
            return {
                posted: false,
                reason: 'JIRA not configured'
            };
        }

        const baseUrl =
            process.env.JIRA_BASE_URL
                .replace(/\/$/, '');

        const body =
            this.buildComment(report);

        const response =
            await fetch(
                `${baseUrl}/rest/api/3/issue/${issueKey}/comment`,
                {
                    method: 'POST',
                    headers: {
                        Authorization:
                            JiraFetcher.buildAuthHeader(),
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        body: {
                            type: 'doc',
                            version: 1,
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [
                                        {
                                            type: 'text',
                                            text: body
                                        }
                                    ]
                                }
                            ]
                        }
                    })
                }
            );

        if (!response.ok) {
            const errorBody =
                await response.text();

            return {
                posted: false,
                issueKey,
                error: `JIRA comment failed (${response.status}): ${errorBody}`
            };
        }

        const result =
            await response.json();

        return {
            posted: true,
            issueKey,
            commentId: result.id,
            url: `${baseUrl}/browse/${issueKey}`
        };
    }
}

module.exports = JiraReporter;
