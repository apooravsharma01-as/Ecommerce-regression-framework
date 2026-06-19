import {
  buildScenariosFromReport,
  computeStatsFromScenarios,
  enrichScenariosWithLayers,
  getExpectedOutcome,
  linkFeedToScenarios
} from './scenarioUtils';

export const EVIDENCE_API_VERSION = 2;

export function countLayerTests(layers = {}) {

  return ['ui', 'api', 'db'].reduce((sum, layer) => {
    return sum + (layers[layer]?.tests?.length || 0);
  }, 0);
}

export function hasTestResults(evidence, report) {

  if (evidence?.hasResultFiles === true) {
    return true;
  }

  if (evidence?.reportExists === true) {
    return true;
  }

  if ((evidence?.feedCount || 0) > 0) {
    return true;
  }

  if (countLayerTests(evidence?.layers) > 0) {
    return true;
  }

  if (report?.execution?.executed === true) {
    return true;
  }

  return false;
}

export function isStaleEvidenceApi(health) {

  if (!health?.ok) {
    return false;
  }

  return (
    health.evidenceApiVersion == null
    || health.evidenceApiVersion < EVIDENCE_API_VERSION
  );
}

export function resolveScenarios(evidence, report) {

  const layers = evidence?.layers || {};
  const reportScenarios = buildScenariosFromReport(report);

  const titleByKey = new Map(
    reportScenarios.map(scenario => [
      `${scenario.domain}:${scenario.layer}:${scenario.id}`,
      scenario.title
    ])
  );

  let scenarios =
    evidence?.scenariosConsidered?.length
      ? evidence.scenariosConsidered.map(scenario => {
          const key =
            `${scenario.domain}:${scenario.layer}:${scenario.id}`;

          const reportTitle =
            titleByKey.get(key);

          return {
            ...scenario,
            title:
              scenario.title
              && scenario.title !== scenario.id
                ? scenario.title
                : (reportTitle || scenario.title || scenario.id),
            expectedOutcome:
              scenario.expectedOutcome
              || getExpectedOutcome(scenario.type)
          };
        })
      : reportScenarios;

  scenarios = enrichScenariosWithLayers(scenarios, layers);

  if ((evidence?.feed || []).length > 0) {
    scenarios = linkFeedToScenarios(
      scenarios,
      evidence.feed
    );
  }

  return scenarios.map(scenario => ({
    ...scenario,
    status:
      scenario.status
      && scenario.status !== 'pending'
        ? scenario.status
        : scenario.executed
          ? (scenario.status || 'pending')
          : (scenario.status || 'not_run')
  }));
}

export function resolveScenarioStats(evidence, scenarios, report) {

  const enriched =
    computeStatsFromScenarios(scenarios);

  const apiStats =
    evidence?.scenarioStats;

  const apiHasOutcomes =
    apiStats?.overall
    && (
      apiStats.overall.passed
      + apiStats.overall.failed
      + apiStats.overall.skipped
    ) > 0;

  if (apiHasOutcomes) {
    return apiStats;
  }

  const enrichedHasOutcomes =
    enriched.overall.passed
    + enriched.overall.failed
    + enriched.overall.skipped > 0;

  if (enrichedHasOutcomes) {
    return enriched;
  }

  const tr =
    report?.execution?.testResults;

  if (tr?.total > 0) {
    return {
      ...enriched,
      overall: {
        total: tr.total,
        passed: tr.passed || 0,
        failed: tr.failed || 0,
        skipped: tr.skipped || 0,
        pending: Math.max(
          0,
          tr.total
            - (tr.passed || 0)
            - (tr.failed || 0)
            - (tr.skipped || 0)
        ),
        notRun: 0
      }
    };
  }

  return enriched;
}

export function isRunComplete(stats) {

  if (!stats?.overall?.total) {
    return false;
  }

  const {
    total,
    passed,
    failed,
    skipped
  } = stats.overall;

  return passed + failed + skipped >= total;
}

export function formatTypeSubtext(typeStats) {

  if (!typeStats?.total) {
    return 'no scenarios';
  }

  const parts = [];

  if (typeStats.failed > 0) {
    parts.push(`${typeStats.failed} failed`);
  }

  if (typeStats.skipped > 0) {
    parts.push(`${typeStats.skipped} skipped`);
  }

  if (typeStats.pending > 0) {
    parts.push(`${typeStats.pending} pending`);
  }

  if (typeStats.notRun > 0) {
    parts.push(`${typeStats.notRun} not run`);
  }

  const done =
    typeStats.passed
    + typeStats.failed
    + typeStats.skipped
    >= typeStats.total;

  if (parts.length === 0 && done) {
    return 'all done';
  }

  return parts.join(' · ') || `${typeStats.total} scenarios`;
}
