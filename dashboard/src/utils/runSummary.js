import {
  buildScenariosFromReport,
  enrichScenariosWithLayers,
  getExpectedOutcome,
  linkFeedToScenarios
} from './scenarioUtils';

const DOMAIN_LABELS = {
  'sale-order-cancellation': 'Sale Order Cancellation',
  'sale-order': 'Sale Order',
  'product-creation': 'Product Creation',
  dispatch: 'Dispatch & Manifest',
  shipment: 'Shipment',
  picking: 'Picking',
  packing: 'Packing',
  putaway: 'Putaway',
  grn: 'GRN / Inflow',
  returns: 'Returns / RTO',
  inventory: 'Inventory',
  'vendor-catalog': 'Vendor Catalog'
};

const DOMAIN_WHY = {
  'sale-order-cancellation':
    'Story covers accepting cancellation on Ready-to-Ship and Manifested packages — we must prove RTS stays RTS with putaway pending, manifest items are removed, and dispatched shipments are no-ops.',
  'sale-order':
    'Sale order APIs and DB state are in the impact zone — create/search flows and order status must stay correct.',
  dispatch:
    'Dispatch and manifest flows are linked to shipping packages — manifest providers and RTS fixtures must be reachable.',
  'product-creation':
    'Product / GST / catalog changes need API create + DB row proof.',
  shipment:
    'Shipment creation and package lifecycle are in scope.',
  inventory:
    'Inventory snapshot or stock checks are required for this change.',
  'vendor-catalog':
    'Vendor catalog APIs must return valid data after the change.'
};

const LAYER_HOW = {
  api: 'Called Uniware REST API and checked HTTP status + business flag (successful: true/false).',
  db: 'Queried UAT database via tunnel and verified row exists with expected status codes.',
  ui: 'Opened STGUAT in browser, logged in, and captured screenshots of the relevant screen.'
};

function formatDomain(domain = '') {

  return DOMAIN_LABELS[domain] || domain.replace(/-/g, ' ');
}

function explainWhy(scenario, report) {

  const domainWhy =
    DOMAIN_WHY[scenario.domain]
    || `Selected because "${report?.trigger || 'the story'}" maps to the ${formatDomain(scenario.domain)} domain.`;

  if (scenario.type === 'negative') {
    return `${domainWhy} This negative case proves invalid input is rejected — a pass means the API correctly said no.`;
  }

  if (scenario.type === 'edge') {
    return `${domainWhy} This edge case checks boundary handling without a server crash.`;
  }

  return domainWhy;
}

function summarizeApiProof(item) {

  const parts = [];

  if (item.method && item.url) {
    parts.push(`${item.method} ${item.url}`);
  }

  if (item.httpStatus != null) {
    parts.push(`HTTP ${item.httpStatus}`);
  }

  if (item.response?.successful === true) {
    parts.push('business: accepted (successful=true)');
  } else if (item.response?.successful === false) {
    parts.push('business: rejected (successful=false)');
  } else if (item.businessOutcome) {
    parts.push(`outcome: ${item.businessOutcome}`);
  }

  return parts.join(' · ') || 'API call logged';
}

function summarizeDbProof(item) {

  const record = item.record || {};
  const parts = [];

  if (record.query) {
    parts.push(record.query);
  }

  const rows =
    item.rowsFound
    ?? record.rowsFound;

  if (rows != null) {
    parts.push(`${rows} row${rows === 1 ? '' : 's'}`);
  }

  if (record.row?.status_code) {
    parts.push(`status_code=${record.row.status_code}`);
  }

  if (record.row?.putaway_pending != null) {
    parts.push(`putaway_pending=${record.row.putaway_pending}`);
  }

  if (record.verification) {
    parts.push(record.verification);
  }

  return parts.join(' · ') || 'DB query logged';
}

function explainHow(scenario, proof = []) {

  const layerIntro =
    LAYER_HOW[scenario.layer]
    || `Executed ${scenario.layer} test.`;

  const apiProof =
    proof.filter(item => item.type === 'api');

  const dbProof =
    proof.filter(item => item.type === 'db');

  const uiProof =
    proof.filter(item =>
      item.type === 'ui' || item.type === 'video'
    );

  const details = [];

  if (apiProof.length > 0) {
    details.push(
      ...apiProof.map(item =>
        summarizeApiProof(item)
      )
    );
  }

  if (dbProof.length > 0) {
    details.push(
      ...dbProof.map(item =>
        summarizeDbProof(item)
      )
    );
  }

  if (uiProof.length > 0) {
    details.push(
      `${uiProof.length} screenshot/video capture${uiProof.length === 1 ? '' : 's'}`
    );
  }

  if (details.length === 0) {
    return layerIntro;
  }

  return `${layerIntro} ${details.join('; ')}.`;
}

function explainResult(scenario, proof = []) {

  const status = scenario.status || 'not_run';

  if (status === 'not_run') {
    return 'Not executed yet — run full regression to get proof.';
  }

  if (status === 'pending') {
    return 'Waiting for execution to finish.';
  }

  if (status === 'skipped') {
    return 'Test was skipped.';
  }

  const apiItems =
    proof.filter(item => item.type === 'api');

  const dbItems =
    proof.filter(item => item.type === 'db');

  if (status === 'passed') {

    if (scenario.type === 'negative') {
      const rejected =
        apiItems.some(item =>
          item.response?.successful === false
          || item.businessOutcome === 'failed'
        );

      if (rejected) {
        return 'Pass — API correctly rejected invalid input (successful=false as expected).';
      }

      return 'Pass — negative case behaved as expected.';
    }

    const apiOk =
      apiItems.length === 0
      || apiItems.every(item =>
        item.response?.successful === true
        || item.businessOutcome === 'passed'
      );

    const dbOk =
      dbItems.length === 0
      || dbItems.every(item => {
        const rows =
          item.rowsFound
          ?? item.record?.rowsFound;

        const verification =
          item.verification
          ?? item.record?.verification;

        if (verification === 'connectivity') {
          return true;
        }

        return rows == null || rows > 0;
      });

    if (apiOk && dbOk) {
      return 'Pass — API accepted the request and DB evidence matches expected state.';
    }

    return 'Pass — Playwright assertion succeeded.';
  }

  if (status === 'failed' || status === 'broken') {

    const apiFail =
      apiItems.find(item =>
        item.response?.successful === false
        && scenario.type !== 'negative'
      );

    if (apiFail) {
      return 'Fail — API returned successful=false when success was required.';
    }

    const dbFail =
      dbItems.find(item => {
        const rows =
          item.rowsFound
          ?? item.record?.rowsFound;

        const verification =
          item.verification
          ?? item.record?.verification;

        return (
          verification === 'row-required'
          && rows === 0
        );
      });

    if (dbFail) {
      return 'Fail — DB row not found or 0 rows when a real record was required.';
    }

    return 'Fail — assertion did not match expected behaviour.';
  }

  return getExpectedOutcome(scenario.type);
}

export function buildRunSummary(report, evidence) {

  const trigger =
    report?.trigger || 'Regression run';

  const executed =
    report?.execution?.executed === true;

  const layers = evidence?.layers || {};

  let scenarios =
    buildScenariosFromReport(report);

  scenarios =
    enrichScenariosWithLayers(scenarios, layers);

  if ((evidence?.feed || []).length > 0) {
    scenarios =
      linkFeedToScenarios(
        scenarios,
        evidence.feed
      );
  }

  const domains =
    [...new Set(scenarios.map(s => s.domain))];

  const signals =
    report?.diffAnalysis?.signals
    || report?.storyParsing?.signals
    || [];

  const items =
    scenarios.map((scenario, index) => ({
      step: index + 1,
      id: `${scenario.domain}:${scenario.layer}:${scenario.id}`,
      title: scenario.title || scenario.id,
      domain: scenario.domain,
      domainLabel: formatDomain(scenario.domain),
      layer: scenario.layer,
      type: scenario.type,
      status: scenario.status || 'not_run',
      why: explainWhy(scenario, report),
      how: explainHow(scenario, scenario.proof || []),
      result: explainResult(scenario, scenario.proof || []),
      expectedOutcome:
        scenario.expectedOutcome
        || getExpectedOutcome(scenario.type),
      proofCount: scenario.proofCount || 0,
      proof: scenario.proof || []
    }));

  const stats = {
    total: items.length,
    passed: items.filter(i => i.status === 'passed').length,
    failed: items.filter(i =>
      i.status === 'failed' || i.status === 'broken'
    ).length,
    pending: items.filter(i => i.status === 'pending').length,
    notRun: items.filter(i =>
      i.status === 'not_run' || i.status === 'skipped'
    ).length
  };

  const allPassed =
    executed
    && stats.failed === 0
    && stats.pending === 0
    && stats.passed > 0;

  return {
    trigger,
    executed,
    domains,
    signals,
    stats,
    allPassed,
    executionPassed: report?.execution?.passed ?? null,
    durationMs: report?.execution?.durationMs ?? null,
    evidenceStale: evidence?.evidenceFreshness?.evidenceStale === true,
    items
  };
}
