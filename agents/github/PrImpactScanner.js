const { execSync } = require('child_process');
const UniwareSourceTracer =
    require('../uniware/UniwareSourceTracer');

class PrImpactScanner {

    static getFullDiff(options = {}) {

        const prNumber =
            options.prNumber;

        if (!prNumber) {
            return {
                available: false,
                changedFiles: [],
                diffContent: '',
                error: 'PR number is required'
            };
        }

        const repo =
            options.repo
            || process.env.GITHUB_REPO
            || process.env.GITHUB_REPOSITORY
            || 'devops-unicommerce/Uniware';

        const repoPath =
            options.repoPath
            || UniwareSourceTracer.getUniwarePath();

        try {

            const diffContent =
                execSync(
                    `gh pr diff ${prNumber} --repo ${repo}`,
                    {
                        encoding: 'utf8',
                        stdio: 'pipe',
                        cwd: repoPath
                    }
                ).trim();

            const changedFiles =
                diffContent
                    ? [
                        ...new Set(
                            [...diffContent.matchAll(
                                /^diff --git a\/(.+?) b\//gm
                            )].map(match => match[1])
                        )
                    ]
                    : [];

            return {
                available: true,
                prNumber,
                repo,
                repoPath,
                changedFiles,
                diffContent,
                source: 'github-pr'
            };

        } catch (error) {

            const gitFallback =
                this.tryGitBranchDiff(
                    prNumber,
                    repoPath
                );

            if (gitFallback.available) {
                return gitFallback;
            }

            return {
                available: false,
                prNumber,
                repo,
                repoPath,
                changedFiles: [],
                diffContent: '',
                error: error.message
            };
        }
    }

    static tryGitBranchDiff(branchRef, repoPath) {

        if (!branchRef || !repoPath) {
            return { available: false };
        }

        const cleanBranch =
            String(branchRef)
                .split('/')
                .pop()
                .trim();

        const strategies = [
            branchRef,
            cleanBranch,
            `origin/${cleanBranch}`,
            `feature/${cleanBranch}`
        ];

        for (const strategy of strategies) {

            try {

                const diffContent =
                    execSync(
                        `git -C "${repoPath}" diff production...${strategy}`,
                        {
                            encoding: 'utf8',
                            stdio: 'pipe'
                        }
                    ).trim();

                const changedFiles =
                    execSync(
                        `git -C "${repoPath}" diff --name-only production...${strategy}`,
                        {
                            encoding: 'utf8',
                            stdio: 'pipe'
                        }
                    ).trim().split('\n').filter(Boolean);

                if (changedFiles.length > 0) {
                    return {
                        available: true,
                        prNumber: branchRef,
                        repoPath,
                        changedFiles,
                        diffContent,
                        source: 'git-branch-fallback'
                    };
                }

            } catch {
                continue;
            }
        }

        return { available: false };
    }

    static getChangedFiles(options = {}) {

        const fullDiff =
            this.getFullDiff(options);

        if (fullDiff.available) {
            return fullDiff;
        }

        const prNumber =
            options.prNumber;

        if (!prNumber) {
            return {
                available: false,
                changedFiles: [],
                error: 'PR number is required'
            };
        }

        const repo =
            options.repo
            || process.env.GITHUB_REPO
            || 'devops-unicommerce/Uniware';

        const repoPath =
            options.repoPath
            || UniwareSourceTracer.getUniwarePath();

        try {

            const output =
                execSync(
                    `gh pr diff ${prNumber} --repo ${repo} --name-only`,
                    {
                        encoding: 'utf8',
                        stdio: 'pipe',
                        cwd: repoPath
                    }
                ).trim();

            const changedFiles =
                output
                    ? output.split('\n').filter(Boolean)
                    : [];

            return {
                available: true,
                prNumber,
                repo,
                repoPath,
                changedFiles,
                source: 'github-pr'
            };

        } catch (error) {

            const gitFallback =
                this.tryGitBranchDiff(
                    prNumber,
                    repoPath
                );

            if (gitFallback.available) {
                return {
                    ...gitFallback,
                    repo
                };
            }

            return {
                available: false,
                prNumber,
                repo,
                changedFiles: [],
                error: error.message
            };
        }
    }

    static analyze(options = {}) {

        const prResult =
            this.getChangedFiles(options);

        const uniwareImpact =
            UniwareSourceTracer.findByChangedFiles(
                prResult.changedFiles
            );

        return {
            ...prResult,
            uniwareImpact
        };
    }
}

module.exports = PrImpactScanner;
