const { execSync } = require('child_process');
const UniwareSourceTracer =
    require('./UniwareSourceTracer');

class GitImpactScanner {

    static getChangedFiles(options = {}) {

        const repoPath =
            options.repoPath
            || UniwareSourceTracer.getUniwarePath();

        if (options.simulateFiles?.length > 0) {
            return {
                available: true,
                repoPath,
                baseBranch: 'simulated',
                changedFiles: options.simulateFiles,
                simulated: true
            };
        }

        const baseBranch =
            options.baseBranch || 'production';

        if (!this.isGitRepo(repoPath)) {
            return {
                available: false,
                changedFiles: [],
                error: `Not a git repo: ${repoPath}`
            };
        }

        const changedFiles =
            this.tryDiffStrategies(
                repoPath,
                baseBranch
            );

        return {
            available: true,
            repoPath,
            baseBranch,
            changedFiles
        };
    }

    static tryDiffStrategies(repoPath, baseBranch) {

        const strategies = [
            `origin/${baseBranch}...HEAD`,
            `${baseBranch}...HEAD`,
            'HEAD~1',
            'HEAD~3'
        ];

        for (const strategy of strategies) {

            try {

                if (strategy.includes('...')) {

                    try {
                        execSync(
                            `git -C "${repoPath}" fetch origin ${baseBranch} --depth 1`,
                            { stdio: 'pipe' }
                        );
                    } catch {
                        // continue with local refs
                    }
                }

                const output =
                    execSync(
                        strategy.includes('...')
                            ? `git -C "${repoPath}" diff --name-only ${strategy}`
                            : `git -C "${repoPath}" diff --name-only ${strategy}`,
                        { encoding: 'utf8', stdio: 'pipe' }
                    ).trim();

                const files =
                    output
                        ? output.split('\n').filter(Boolean)
                        : [];

                if (files.length > 0) {
                    return files;
                }

            } catch {
                continue;
            }
        }

        return [];
    }

    static isGitRepo(repoPath) {

        try {
            execSync(
                `git -C "${repoPath}" rev-parse --is-inside-work-tree`,
                { stdio: 'pipe' }
            );
            return true;
        } catch {
            return false;
        }
    }

    static analyze(options = {}) {

        const gitResult =
            this.getChangedFiles(options);

        const uniwareImpact =
            UniwareSourceTracer.findByChangedFiles(
                gitResult.changedFiles
            );

        return {
            ...gitResult,
            uniwareImpact
        };
    }
}

module.exports = GitImpactScanner;
