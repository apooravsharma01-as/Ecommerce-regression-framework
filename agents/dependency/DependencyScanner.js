const fs = require('fs');
const path = require('path');

class DependencyScanner {

    static buildGraph(rootDir = process.cwd()) {

        const nodes = [];
        const edges = [];

        const scanTargets = [
            { dir: 'pages', type: 'page' },
            { dir: 'api', type: 'api' },
            { dir: 'database/queries', type: 'query' },
            { dir: 'tests', type: 'test' }
        ];

        for (const target of scanTargets) {

            const fullDir =
                path.join(rootDir, target.dir);

            if (!fs.existsSync(fullDir)) {
                continue;
            }

            const files =
                this.getFiles(fullDir);

            for (const file of files) {

                if (!file.endsWith('.js')) {
                    continue;
                }

                const content =
                    fs.readFileSync(file, 'utf8');

                const relativePath =
                    path.relative(rootDir, file);

                const node = {
                    id: relativePath,
                    type: target.type,
                    layer: this.getLayer(relativePath),
                    imports: this.extractImports(content, file, rootDir),
                    endpoints: this.extractEndpoints(content),
                    tables: this.extractTables(content),
                    methods: this.extractMethods(content, target.type),
                    tags: this.extractTags(content)
                };

                nodes.push(node);

                for (const imp of node.imports) {

                    edges.push({
                        from: relativePath,
                        to: imp,
                        type: 'imports'
                    });
                }

                for (const endpoint of node.endpoints) {

                    edges.push({
                        from: relativePath,
                        to: endpoint,
                        type: 'calls'
                    });
                }

                for (const table of node.tables) {

                    edges.push({
                        from: relativePath,
                        to: table,
                        type: 'queries'
                    });
                }
            }
        }

        return { nodes, edges };
    }

    static getLayer(filePath) {

        if (filePath.startsWith('tests/ui')) {
            return 'ui';
        }

        if (filePath.startsWith('tests/api')) {
            return 'api';
        }

        if (filePath.startsWith('tests/db')) {
            return 'db';
        }

        if (filePath.startsWith('pages')) {
            return 'ui';
        }

        if (filePath.startsWith('api')) {
            return 'api';
        }

        if (filePath.startsWith('database')) {
            return 'db';
        }

        return 'other';
    }

    static getFiles(folderPath, files = []) {

        const items =
            fs.readdirSync(folderPath);

        for (const item of items) {

            const fullPath =
                path.join(folderPath, item);

            const stat =
                fs.statSync(fullPath);

            if (stat.isDirectory()) {
                this.getFiles(fullPath, files);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    static extractImports(content, filePath, rootDir) {

        const imports = [];
        const patterns = [
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /from\s+['"]([^'"]+)['"]/g
        ];

        for (const pattern of patterns) {

            let match;

            while ((match = pattern.exec(content)) !== null) {

                const importPath = match[1];

                if (importPath.startsWith('.')) {

                    const resolved =
                        this.resolveImport(
                            importPath,
                            path.dirname(filePath),
                            rootDir
                        );

                    if (resolved) {
                        imports.push(resolved);
                    }
                }
            }
        }

        return [...new Set(imports)];
    }

    static resolveImport(importPath, fromDir, rootDir) {

        const base =
            path.resolve(fromDir, importPath);

        const candidates = [
            base,
            `${base}.js`,
            path.join(base, 'index.js')
        ];

        for (const candidate of candidates) {

            if (fs.existsSync(candidate)) {
                return path.relative(rootDir, candidate);
            }
        }

        return null;
    }

    static extractEndpoints(content) {

        const endpoints = [];
        const urlPattern =
            /['"`](https?:\/\/[^'"`]+|\/data\/[^'"`]+)['"`]/g;

        let match;

        while ((match = urlPattern.exec(content)) !== null) {

            const url = match[1];
            const pathOnly =
                url.includes('/data/')
                    ? url.substring(url.indexOf('/data/'))
                    : url;

            endpoints.push(pathOnly);
        }

        return [...new Set(endpoints)];
    }

    static extractTables(content) {

        const tables = [];
        const fromPattern =
            /FROM\s+([a-z_][a-z0-9_]*)/gi;

        let match;

        while ((match = fromPattern.exec(content)) !== null) {
            tables.push(match[1].toLowerCase());
        }

        return [...new Set(tables)];
    }

    static extractMethods(content, type) {

        if (type !== 'page' && type !== 'api') {
            return [];
        }

        const methods = [];
        const methodPattern =
            /async\s+(\w+)\s*\(/g;

        let match;

        while ((match = methodPattern.exec(content)) !== null) {
            methods.push(match[1]);
        }

        return methods;
    }

    static extractTags(content) {

        const tags = new Set();
        const keywords = [
            'gst',
            'tax',
            'sku',
            'product',
            'login',
            'saleorder',
            'sale_order',
            'item_type',
            'vendor',
            'catalog'
        ];

        const lower =
            content.toLowerCase();

        for (const keyword of keywords) {

            if (lower.includes(keyword)) {
                tags.add(keyword);
            }
        }

        return [...tags];
    }

    static saveCache(graph, cachePath) {

        const dir =
            path.dirname(cachePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            cachePath,
            JSON.stringify(graph, null, 2)
        );
    }

    static loadOrBuild(rootDir, cachePath) {

        if (fs.existsSync(cachePath)) {

            const stat =
                fs.statSync(cachePath);

            const cacheAge =
                Date.now() - stat.mtimeMs;

            if (cacheAge < 5 * 60 * 1000) {
                return JSON.parse(
                    fs.readFileSync(cachePath, 'utf8')
                );
            }
        }

        const graph =
            this.buildGraph(rootDir);

        this.saveCache(graph, cachePath);

        return graph;
    }
}

module.exports = DependencyScanner;
