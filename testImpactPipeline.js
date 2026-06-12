const DependencyScanner =
    require('./agents/dependency/DependencyScanner');
const UniwareSourceTracer =
    require('./agents/uniware/UniwareSourceTracer');
const ImpactAnalyzer =
    require('./agents/impact/ImpactAnalyzer');
const RegressionSelector =
    require('./agents/selection/RegressionSelector');

console.log('=== Step 1: Dependency Scanner ===\n');

const graph =
    DependencyScanner.buildGraph(process.cwd());

console.log(`Nodes: ${graph.nodes.length}`);
console.log(`Edges: ${graph.edges.length}`);
console.log('Sample nodes:');
console.log(
    graph.nodes.slice(0, 4).map(n => ({
        id: n.id,
        layer: n.layer,
        tags: n.tags
    }))
);

console.log('\n=== Step 2: Uniware Source Tracer ===\n');

const uniware =
    UniwareSourceTracer.trace();

console.log(`Uniware available: ${uniware.available}`);
console.log(`Path: ${uniware.path}`);
console.log(`Endpoints found: ${uniware.endpoints.length}`);
console.log(`Entities found: ${uniware.entities.length}`);

const productEndpoints =
    uniware.endpoints.filter(e =>
        e.domain === 'product-creation'
    ).slice(0, 3);

console.log('Product endpoints sample:');
console.log(productEndpoints);

const itemTypeEntity =
    uniware.entities.find(e =>
        e.className === 'ItemType'
    );

console.log('ItemType entity:');
console.log(
    itemTypeEntity
        ? { table: itemTypeEntity.table, file: itemTypeEntity.file }
        : 'NOT FOUND'
);

console.log('\n=== Step 3: Impact Analyzer (GST story) ===\n');

const impact =
    ImpactAnalyzer.analyze({
        story: 'GST validation changed for product creation flow',
        gitDiff: false
    });

console.log('Domains:', impact.domains);
console.log('Impacted UI:', impact.impactedUI);
console.log('Impacted API:', impact.impactedAPI);
console.log('Impacted DB:', impact.impactedDB);
console.log('Tables:', impact.tables);
console.log('Selected tests:', impact.selectedTests);

console.log('\n=== Step 4: Regression Selector ===\n');

const selection =
    RegressionSelector.select(impact);

console.log('Playwright command:');
console.log(selection.playwrightCommand);

console.log('\n=== Pipeline OK ===\n');
