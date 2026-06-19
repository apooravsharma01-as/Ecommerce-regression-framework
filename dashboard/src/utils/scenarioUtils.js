export function normalizeScenarioName(name = '') {

  return name
    .trim()
    .toLowerCase()
    .replace(/^(positive|negative|edge|e2e|pos|neg)\s*[-:]?\s*/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

export function scenarioIdKeywords(id = '') {

  return normalizeScenarioName(
    id.replace(/^(pos|neg|edge|e2e)-/, '')
  );
}

export function getExpectedOutcome(type) {

  if (type === 'negative') {
    return 'API should reject invalid input (test passes when API returns error)';
  }

  if (type === 'edge') {
    return 'Boundary case handled without server crash';
  }

  return 'API success + valid response (DB row when applicable)';
}

export function buildScenariosFromReport(report) {

  const domains =
    report?.generation?.domains || [];

  const executed =
    report?.execution?.executed === true;

  const scenarios = [];

  for (const domain of domains) {

    if (!domain.scenarios) {
      continue;
    }

    for (const [layer, summary] of Object.entries(domain.scenarios)) {

      for (const scenario of summary.scenarios || []) {
        scenarios.push({
          domain: domain.domain,
          layer,
          id: scenario.id,
          type: scenario.type,
          title: scenario.title || scenario.id,
          tier: scenario.tier,
          expectedOutcome: getExpectedOutcome(scenario.type),
          status: executed ? 'pending' : 'not_run',
          executed: false
        });
      }
    }
  }

  return scenarios;
}

export function enrichScenariosWithLayers(scenarios = [], layers = {}) {

  const tests =
    ['ui', 'api', 'db'].flatMap(layer =>
      (layers[layer]?.tests || []).map(test => ({
        ...test,
        layer
      }))
    );

  if (!tests.length) {
    return scenarios;
  }

  return scenarios.map(scenario => {

    if (
      ['passed', 'failed', 'skipped', 'broken']
        .includes(scenario.status)
      && scenario.executed
    ) {
      return {
        ...scenario,
        expectedOutcome:
          scenario.expectedOutcome
          || getExpectedOutcome(scenario.type)
      };
    }

    const title =
      normalizeScenarioName(
        scenario.title || scenario.id
      );

    const match =
      tests.find(test => {

        if (test.layer !== scenario.layer) {
          return false;
        }

        const testName =
          normalizeScenarioName(test.name);

        const idKeywords =
          scenarioIdKeywords(scenario.id || '');

        return (
          testName === title
          || testName.includes(title)
          || title.includes(testName)
          || (
            idKeywords.length > 3
            && testName.includes(idKeywords)
          )
        );
      });

    if (!match) {
      return {
        ...scenario,
        expectedOutcome:
          scenario.expectedOutcome
          || getExpectedOutcome(scenario.type)
      };
    }

    return {
      ...scenario,
      status: match.status,
      executed: true,
      proofTest: match.name,
      expectedOutcome:
        scenario.expectedOutcome
        || getExpectedOutcome(scenario.type)
    };
  });
}

export function computeStatsFromScenarios(scenarios = []) {

  const types = ['positive', 'negative', 'edge'];
  const stats = {
    overall: {
      total: scenarios.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      notRun: 0
    }
  };

  for (const key of types) {
    const items =
      scenarios.filter(s => s.type === key);

    stats[key] = {
      total: items.length,
      passed:
        items.filter(s => s.status === 'passed').length,
      failed:
        items.filter(s =>
          s.status === 'failed'
          || s.status === 'broken'
        ).length,
      skipped:
        items.filter(s => s.status === 'skipped').length,
      pending:
        items.filter(s => s.status === 'pending').length,
      notRun:
        items.filter(s => s.status === 'not_run').length
    };
  }

  stats.overall.passed =
    scenarios.filter(s => s.status === 'passed').length;
  stats.overall.failed =
    scenarios.filter(s =>
      s.status === 'failed' || s.status === 'broken'
    ).length;
  stats.overall.skipped =
    scenarios.filter(s => s.status === 'skipped').length;
  stats.overall.pending =
    scenarios.filter(s => s.status === 'pending').length;
  stats.overall.notRun =
    scenarios.filter(s => s.status === 'not_run').length;

  return stats;
}

export function linkFeedToScenarios(scenarios = [], feed = []) {

  return scenarios.map(scenario => {

    const proofName =
      scenario.proofTest
      || scenario.title
      || scenario.id;

    const proof =
      feed.filter(item => {

        if (!item.testName) {
          return false;
        }

        const itemName =
          normalizeScenarioName(item.testName);

        const target =
          normalizeScenarioName(proofName);

        return (
          itemName === target
          || itemName.includes(target)
          || target.includes(itemName)
        );
      });

    return {
      ...scenario,
      proof,
      proofCount: proof.length
    };
  });
}

export function formatScenarioSubtext(scenario) {

  const parts = [
    scenario.type,
    scenario.domain,
    scenario.layer
  ];

  if (scenario.proofCount > 0) {
    parts.push(`${scenario.proofCount} evidence`);
  }

  return parts.join(' · ');
}
