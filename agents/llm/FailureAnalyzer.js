const fs = require('fs');
const path = require('path');
const PromptBuilder =
    require('./PromptBuilder');
const LLMClient =
    require('./LLMClient');

class FailureAnalyzer {

    static ruleBasedAnalyze({
        testName,
        error,
        stackTrace
    }) {

        const text =
            `${error}\n${stackTrace}`.toLowerCase();

        let failureType = 'unknown';
        let rootCause = 'Unable to determine root cause from error text.';
        let suggestedFix =
            'Review test logs, screenshots, and trace artifacts.';
        let confidence = '40%';

        if (
            text.includes('timeout')
            || text.includes('timed out')
        ) {
            failureType = 'timeout';
            rootCause =
                'Element or navigation did not complete within the configured timeout.';
            suggestedFix =
                'Increase timeout, add explicit waits, or verify the target page/API is reachable.';
            confidence = '70%';
        } else if (
            text.includes('expect(')
            || text.includes('assertion')
            || text.includes('tobe')
        ) {
            failureType = 'assertion';
            rootCause =
                'Actual application state did not match the expected assertion.';
            suggestedFix =
                'Validate test data, API response shape, and UI selectors against current app behavior.';
            confidence = '75%';
        } else if (
            text.includes('401')
            || text.includes('403')
            || text.includes('oauth')
        ) {
            failureType = 'authentication';
            rootCause =
                'Authentication or authorization failed for the request.';
            suggestedFix =
                'Verify OAuth credentials, token refresh, and required headers (e.g. facility).';
            confidence = '80%';
        } else if (
            text.includes('econnrefused')
            || text.includes('database')
            || text.includes('mysql')
        ) {
            failureType = 'database';
            rootCause =
                'Database connection or query failed.';
            suggestedFix =
                'Confirm DB_HOST/DB_PORT in .env and that MySQL is running with expected schema.';
            confidence = '85%';
        } else if (
            text.includes('locator')
            || text.includes('selector')
            || text.includes('not visible')
        ) {
            failureType = 'ui-locator';
            rootCause =
                'UI element was not found or not interactable.';
            suggestedFix =
                'Update page object selectors or wait for the correct page state before interaction.';
            confidence = '72%';
        }

        return {
            testName,
            failureType,
            rootCause,
            suggestedFix,
            confidence,
            source: 'rules'
        };
    }

    static async analyze({
        testName,
        error,
        stackTrace,
        useLlm = false,
        rootDir = process.cwd()
    }) {

        const ruleResult =
            this.ruleBasedAnalyze({
                testName,
                error,
                stackTrace
            });

        if (
            !useLlm
            || !LLMClient.isAvailable()
        ) {
            return ruleResult;
        }

        try {

            const prompt =
                PromptBuilder.buildFailureAnalysisPrompt({
                    testName,
                    error,
                    stackTrace
                });

            const llmAnalysis =
                await LLMClient.generate(prompt);

            const merged = {
                ...ruleResult,
                llmAnalysis,
                source: 'llm+rules'
            };

            this.cacheAnalysis(
                merged,
                rootDir
            );

            return merged;

        } catch (llmError) {

            return {
                ...ruleResult,
                llmError: llmError.message
            };
        }
    }

    static cacheAnalysis(analysis, rootDir) {

        const cacheDir =
            path.join(rootDir, '.cache');

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cacheFile =
            path.join(
                cacheDir,
                'failure-analysis.json'
            );

        let existing = [];

        if (fs.existsSync(cacheFile)) {
            existing =
                JSON.parse(
                    fs.readFileSync(cacheFile, 'utf8')
                );
        }

        existing.push({
            timestamp: new Date().toISOString(),
            ...analysis
        });

        fs.writeFileSync(
            cacheFile,
            JSON.stringify(existing, null, 2)
        );
    }
}

module.exports = FailureAnalyzer;
