const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PrImpactScanner =
    require('../github/PrImpactScanner');
const UniwareSourceTracer =
    require('../uniware/UniwareSourceTracer');

const SIGNAL_PATTERNS = [
    { signal: 'gst', patterns: [/gst/i, /gsttax/i] },
    { signal: 'tax', patterns: [/tax/i, /taxtype/i] },
    { signal: 'validation', patterns: [/validat/i, /@valid/i, /@notnull/i, /@size/i] },
    { signal: 'sku', patterns: [/sku/i, /itemtype/i, /item_type/i] },
    { signal: 'product', patterns: [/product/i, /catalog/i, /itemtype/i] },
    { signal: 'order', patterns: [/saleorder/i, /sale_order/i, /oms/i] },
    { signal: 'inventory', patterns: [/inventory/i, /stock/i, /snapshot/i] },
    { signal: 'vendor', patterns: [/vendor/i, /procure/i] },
    { signal: 'duplicate', patterns: [/duplicate/i, /already exists/i, /unique/i] },
    { signal: 'boundary', patterns: [/@size/i, /maxlength/i, /minlength/i, /length must/i] },
    { signal: 'auth', patterns: [/oauth/i, /login/i, /auth/i] }
];

class DiffAnalyzer {

    static fetchDiff(options = {}) {

        if (options.prNumber) {

            const prResult =
                PrImpactScanner.getFullDiff({
                    prNumber: options.prNumber,
                    repo: options.repo,
                    repoPath: options.repoPath
                });

            return {
                source: 'github-pr',
                changedFiles: prResult.changedFiles,
                diffContent: prResult.diffContent || '',
                error: prResult.error
            };
        }

        if (options.simulateFiles?.length > 0) {
            return {
                source: 'simulate',
                changedFiles: options.simulateFiles,
                diffContent:
                    this.buildSimulatedDiff(
                        options.simulateFiles
                    )
            };
        }

        if (options.gitDiff) {

            const repoPath =
                options.repoPath
                || UniwareSourceTracer.getUniwarePath();

            try {

                const diffContent =
                    execSync(
                        `git -C "${repoPath}" diff HEAD~1`,
                        { encoding: 'utf8', stdio: 'pipe' }
                    );

                const changedFiles =
                    execSync(
                        `git -C "${repoPath}" diff --name-only HEAD~1`,
                        { encoding: 'utf8', stdio: 'pipe' }
                    ).trim().split('\n').filter(Boolean);

                return {
                    source: 'git',
                    changedFiles,
                    diffContent
                };

            } catch (error) {
                return {
                    source: 'git',
                    changedFiles: [],
                    diffContent: '',
                    error: error.message
                };
            }
        }

        return {
            source: 'none',
            changedFiles: [],
            diffContent: ''
        };
    }

    static buildSimulatedDiff(files) {

        return files.map(file => {
            const name =
                path.basename(file, path.extname(file));

            return [
                `diff --git a/${file} b/${file}`,
                `+++ b/${file}`,
                `+// regression simulation for ${name}`,
                `+validateGstTaxTypeCode(itemType)`,
                `+throw new ValidationException("INVALID_TAX_TYPE_CODE")`
            ].join('\n');
        }).join('\n\n');
    }

    static analyze(diffContent = '', changedFiles = []) {

        const text =
            `${diffContent}\n${changedFiles.join('\n')}`;

        const signals = new Set();
        const changedMethods = new Set();
        const addedLines = [];

        for (const { signal, patterns } of SIGNAL_PATTERNS) {
            if (patterns.some(pattern => pattern.test(text))) {
                signals.add(signal);
            }
        }

        const lines =
            diffContent.split('\n');

        for (const line of lines) {

            if (!line.startsWith('+') || line.startsWith('+++')) {
                continue;
            }

            const content =
                line.slice(1).trim();

            if (!content || content.startsWith('//')) {
                continue;
            }

            addedLines.push(content);

            const methodMatch =
                content.match(
                    /(?:public|private|protected)\s+[\w<>,\s]+\s+(\w+)\s*\(/
                );

            if (methodMatch) {
                changedMethods.add(methodMatch[1]);
            }
        }

        if (
            changedFiles.some(file =>
                /itemtype|item_type|product/i.test(file)
            )
        ) {
            signals.add('product');
            signals.add('sku');
        }

        if (
            changedFiles.some(file =>
                /saleorder|sale_order/i.test(file)
            )
        ) {
            signals.add('order');
        }

        return {
            signals: [...signals],
            changedMethods: [...changedMethods],
            addedLines: addedLines.slice(0, 50),
            changedFiles,
            hasValidationChange:
                signals.has('validation')
                || signals.has('gst')
                || signals.has('tax'),
            hasGstChange:
                signals.has('gst')
                || signals.has('tax'),
            hasBoundaryChange:
                signals.has('boundary'),
            hasDuplicateHandling:
                signals.has('duplicate')
        };
    }

    static analyzeFromStory(story = '') {

        const lower =
            story.toLowerCase();

        const signals = new Set();

        for (const { signal, patterns } of SIGNAL_PATTERNS) {
            if (patterns.some(pattern => pattern.test(lower))) {
                signals.add(signal);
            }
        }

        return {
            signals: [...signals],
            changedMethods: [],
            addedLines: [],
            changedFiles: [],
            hasValidationChange:
                signals.has('validation')
                || signals.has('gst')
                || signals.has('tax'),
            hasGstChange:
                signals.has('gst')
                || signals.has('tax'),
            hasBoundaryChange:
                signals.has('boundary'),
            hasDuplicateHandling:
                signals.has('duplicate'),
            source: 'story'
        };
    }

    static merge(analysisA = {}, analysisB = {}) {

        const signals =
            new Set([
                ...(analysisA.signals || []),
                ...(analysisB.signals || [])
            ]);

        const changedMethods =
            new Set([
                ...(analysisA.changedMethods || []),
                ...(analysisB.changedMethods || [])
            ]);

        return {
            signals: [...signals],
            changedMethods: [...changedMethods],
            addedLines: [
                ...(analysisA.addedLines || []),
                ...(analysisB.addedLines || [])
            ].slice(0, 50),
            changedFiles: [
                ...new Set([
                    ...(analysisA.changedFiles || []),
                    ...(analysisB.changedFiles || [])
                ])
            ],
            hasValidationChange:
                analysisA.hasValidationChange
                || analysisB.hasValidationChange
                || signals.has('validation'),
            hasGstChange:
                analysisA.hasGstChange
                || analysisB.hasGstChange
                || signals.has('gst')
                || signals.has('tax'),
            hasBoundaryChange:
                analysisA.hasBoundaryChange
                || analysisB.hasBoundaryChange,
            hasDuplicateHandling:
                analysisA.hasDuplicateHandling
                || analysisB.hasDuplicateHandling,
            sources: [
                analysisA.source,
                analysisB.source
            ].filter(Boolean)
        };
    }
}

module.exports = DiffAnalyzer;
