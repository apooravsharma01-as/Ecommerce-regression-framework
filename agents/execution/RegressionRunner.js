const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RegressionRunner {

    static run(tests, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const uniqueTests =
            [...new Set(tests)];

        if (uniqueTests.length === 0) {
            return {
                executed: false,
                reason: 'No tests to run',
                tests: []
            };
        }

        const command =
            [
                'npx playwright test',
                uniqueTests.join(' '),
                '--project=chromium',
                '--workers=1'
            ].join(' ');

        const startTime = Date.now();

        try {

            execSync(command, {
                cwd: rootDir,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    ...(options.env || {}),
                    CI: process.env.CI || 'false'
                }
            });

            return {
                executed: true,
                passed: true,
                tests: uniqueTests,
                command,
                durationMs: Date.now() - startTime
            };

        } catch (error) {

            return {
                executed: true,
                passed: false,
                tests: uniqueTests,
                command,
                durationMs: Date.now() - startTime,
                exitCode: error.status
            };
        }
    }

    static generateAllureReport(options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        try {

            const envFile =
                path.join(rootDir, 'environment.properties');

            const allureResults =
                path.join(rootDir, 'allure-results');

            if (
                fs.existsSync(envFile)
                && fs.existsSync(allureResults)
            ) {
                fs.copyFileSync(
                    envFile,
                    path.join(
                        allureResults,
                        'environment.properties'
                    )
                );
            }

            execSync(
                'npx allure generate allure-results --clean -o allure-report',
                {
                    cwd: rootDir,
                    stdio: 'pipe'
                }
            );

            return {
                generated: true,
                reportPath:
                    path.join(rootDir, 'allure-report')
            };

        } catch (error) {

            return {
                generated: false,
                error: error.message
            };
        }
    }

    static attachImpactReport(report, options = {}) {

        const rootDir =
            options.rootDir || process.cwd();

        const allureResults =
            path.join(rootDir, 'allure-results');

        if (!fs.existsSync(allureResults)) {
            fs.mkdirSync(allureResults, { recursive: true });
        }

        fs.writeFileSync(
            path.join(allureResults, 'impact-report.json'),
            JSON.stringify(report, null, 2)
        );

        fs.writeFileSync(
            path.join(rootDir, '.cache/regression-report.json'),
            JSON.stringify(report, null, 2)
        );
    }
}

module.exports = RegressionRunner;
