const fs = require('fs');
const path = require('path');

class RegressionReporter {

    static generateMarkdown(report) {

        const lines = [];

        lines.push('# Regression Report');
        lines.push('');
        lines.push(`**Generated:** ${report.timestamp}`);
        lines.push(`**Trigger:** ${report.trigger || 'n/a'}`);
        lines.push('');

        if (report.jira) {
            lines.push('## JIRA');
            lines.push('');
            lines.push(`- **Ticket:** [${report.jira.issueKey}](${report.jira.url})`);
            lines.push(`- **Summary:** ${report.jira.summary}`);
            lines.push(`- **Status:** ${report.jira.status || 'n/a'}`);
            lines.push('');
        }

        if (report.pr) {
            lines.push('## Pull Request');
            lines.push('');
            lines.push(`- **PR:** #${report.pr.prNumber}`);
            lines.push(`- **Repo:** ${report.pr.repo}`);
            lines.push(`- **Changed files:** ${report.pr.changedFiles?.length || 0}`);
            lines.push('');
        }

        if (report.storyParsing?.llmUsed) {
            lines.push('## LLM Story Parsing');
            lines.push('');
            lines.push(`- **Summary:** ${report.storyParsing.summary || 'n/a'}`);
            lines.push(`- **Domains:** ${(report.storyParsing.domains || []).join(', ') || 'none'}`);
            lines.push('');
        }

        const impact =
            report.impact || {};

        lines.push('## Impact Analysis');
        lines.push('');
        lines.push(`- **Domains:** ${(impact.domains || []).join(', ') || 'none'}`);
        lines.push(`- **Changed files:** ${(impact.changedFiles || []).length}`);
        lines.push(`- **API endpoints:** ${(impact.endpoints || []).length}`);
        lines.push(`- **DB tables:** ${(impact.tables || []).join(', ') || 'none'}`);
        lines.push('');

        if (report.diffAnalysis?.signals?.length) {
            lines.push('## Diff Analysis');
            lines.push('');
            lines.push(`- **Signals:** ${report.diffAnalysis.signals.join(', ')}`);
            lines.push(`- **Validation change:** ${report.diffAnalysis.hasValidationChange}`);
            lines.push('');
        }

        if (report.generation?.domains?.length) {
            lines.push('## Generated Scenarios');
            lines.push('');
            report.generation.domains.forEach(domain => {
                if (!domain.scenarios) {
                    return;
                }

                Object.entries(domain.scenarios).forEach(([layer, summary]) => {
                    lines.push(
                        `- **${domain.domain}.${layer}:** ${summary.positive} positive, ${summary.negative} negative, ${summary.edge} edge`
                    );
                });
            });
            lines.push('');
        }

        if (report.generation?.files?.length) {
            lines.push('## Generated Tests');
            lines.push('');
            report.generation.files.forEach(file => {
                lines.push(`- \`${file}\``);
            });
            lines.push('');
        }

        lines.push('## Test Execution');
        lines.push('');

        const execution =
            report.execution || {};

        if (!execution.executed) {
            lines.push(`Skipped: ${execution.reason || 'not executed'}`);
        } else {
            lines.push(`- **Result:** ${execution.passed ? 'PASSED' : 'FAILED'}`);
            lines.push(`- **Duration:** ${execution.durationMs || 0}ms`);
            lines.push(`- **Tests run:** ${(execution.tests || []).length}`);
        }

        lines.push('');

        if (report.allure?.generated) {
            lines.push('## Allure');
            lines.push('');
            lines.push(`Report: \`${report.allure.reportPath}\``);
            lines.push('');
        }

        return lines.join('\n');
    }

    static write(report, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const cacheDir =
            path.join(rootDir, '.cache');

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const markdown =
            this.generateMarkdown(report);

        const mdPath =
            path.join(
                cacheDir,
                'regression-report.md'
            );

        fs.writeFileSync(mdPath, markdown);

        const allureResults =
            path.join(rootDir, 'allure-results');

        if (fs.existsSync(allureResults)) {
            fs.writeFileSync(
                path.join(
                    allureResults,
                    'regression-report.md'
                ),
                markdown
            );
        }

        return {
            markdown,
            path: mdPath
        };
    }
}

module.exports = RegressionReporter;
