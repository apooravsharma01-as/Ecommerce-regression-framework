class JiraFetcher {

    static isConfigured() {

        return Boolean(
            process.env.JIRA_BASE_URL
            && process.env.JIRA_EMAIL
            && process.env.JIRA_API_TOKEN
        );
    }

    static buildAuthHeader() {

        const token = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString('base64');

        return `Basic ${token}`;
    }

    static extractTextFromAdf(node) {

        if (!node) {
            return '';
        }

        if (typeof node === 'string') {
            return node;
        }

        if (node.text) {
            return node.text;
        }

        if (!Array.isArray(node.content)) {
            return '';
        }

        return node.content
            .map(child =>
                this.extractTextFromAdf(child)
            )
            .join(' ')
            .trim();
    }

    static async fetch(issueKey) {

        if (!this.isConfigured()) {
            throw new Error(
                'JIRA not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env'
            );
        }

        const baseUrl =
            process.env.JIRA_BASE_URL
                .replace(/\/$/, '');

        const response =
            await fetch(
                `${baseUrl}/rest/api/3/issue/${issueKey}`,
                {
                    headers: {
                        Authorization:
                            this.buildAuthHeader(),
                        Accept: 'application/json'
                    }
                }
            );

        if (!response.ok) {
            const body =
                await response.text();

            throw new Error(
                `JIRA fetch failed (${response.status}): ${body}`
            );
        }

        const issue =
            await response.json();

        const fields =
            issue.fields || {};

        const summary =
            fields.summary || '';

        const description =
            typeof fields.description === 'string'
                ? fields.description
                : this.extractTextFromAdf(
                    fields.description
                );

        const storyText =
            [summary, description]
                .filter(Boolean)
                .join('\n\n');

        return {
            issueKey,
            summary,
            description,
            storyText,
            status:
                fields.status?.name || null,
            issueType:
                fields.issuetype?.name || null,
            url: `${baseUrl}/browse/${issueKey}`
        };
    }
}

module.exports = JiraFetcher;
