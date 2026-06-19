import { useEffect, useState } from 'react';
import {
  fetchEvidenceSummary,
  generateAllureReport,
  openAllureReport
} from '../api';
import {
  formatTypeSubtext,
  hasTestResults,
  isRunComplete,
  resolveScenarioStats,
  resolveScenarios
} from '../utils/evidenceDisplay';

const LAYER_META = {
  ui: {
    label: 'UI',
    icon: '🖥️',
    color: 'text-violet-300',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30'
  },
  api: {
    label: 'API',
    icon: '🔌',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30'
  },
  db: {
    label: 'DB',
    icon: '🗄️',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30'
  }
};

const TYPE_COLORS = {
  positive: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  negative: 'text-red-300 bg-red-500/15 border-red-500/30',
  edge: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
  core: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
};

const STATUS_META = {
  passed: {
    label: 'Passed',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  failed: {
    label: 'Failed',
    color: 'text-red-300',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-400'
  },
  broken: {
    label: 'Broken',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400'
  },
  skipped: {
    label: 'Skipped',
    color: 'text-slate-300',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400'
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-200',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20 border-dashed',
    dot: 'bg-amber-300'
  },
  not_run: {
    label: 'Not Run',
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20 border-dashed',
    dot: 'bg-slate-400'
  }
};

function StatusBadge({ status }) {
  const meta =
    STATUS_META[status] || STATUS_META.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.bg} ${meta.border} ${meta.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ScenarioTypeSummary({ stats, scenarios = [], executionState }) {
  const types = [
    { key: 'positive', label: 'Positive' },
    { key: 'negative', label: 'Negative' },
    { key: 'edge', label: 'Edge' }
  ];

  const fallbackStats = types.reduce((acc, { key }) => {
    const items = scenarios.filter(s => s.type === key);
    acc[key] = {
      total: items.length,
      passed: items.filter(s => s.status === 'passed').length,
      failed: items.filter(s => s.status === 'failed' || s.status === 'broken').length,
      skipped: items.filter(s => s.status === 'skipped').length,
      pending: items.filter(s => s.status === 'pending').length,
      notRun: items.filter(s => s.status === 'not_run').length
    };
    return acc;
  }, {});

  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {types.map(({ key, label }) => {
        const typeStats =
          stats?.[key]?.total > 0
            ? stats[key]
            : fallbackStats[key];

        return (
          <div
            key={key}
            className={`rounded-xl border p-2.5 ${
              TYPE_COLORS[key] || TYPE_COLORS.core
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {label}
            </p>
            <p className="mt-1 text-sm font-bold">
              {typeStats.passed}/{typeStats.total}
              <span className="ml-1 text-[10px] font-normal opacity-70">
                passed
              </span>
            </p>
            <p className="mt-0.5 text-[10px] opacity-70">
              {formatTypeSubtext(typeStats)}
            </p>
          </div>
        );
      })}
      {executionState?.executed === false && (
        <p className="col-span-3 text-xs text-amber-300">
          Tests were not executed — click Run Full Regression (not Analyze Only).
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    passed: 'bg-emerald-400',
    failed: 'bg-red-400',
    broken: 'bg-amber-400',
    skipped: 'bg-slate-400'
  };

  return (
    <span
      className={`h-2 w-2 rounded-full ${colors[status] || colors.skipped}`}
    />
  );
}

export default function EvidencePanel({
  report,
  jobStatus,
  running
}) {
  const [evidence, setEvidence] = useState(null);
  const [activeLayer, setActiveLayer] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const isLive =
    running
    || jobStatus === 'running'
    || jobStatus === 'queued';

  const loadEvidence = async () => {
    try {
      const data = await fetchEvidenceSummary(true);
      setEvidence(data);
      setActionMsg('');
    } catch (err) {
      setEvidence(null);
      setActionMsg(err.message);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [report?.timestamp, jobStatus]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const interval = setInterval(loadEvidence, 2000);
    return () => clearInterval(interval);
  }, [isLive, report?.timestamp]);

  const handleOpenAllure = async () => {
    setLoading(true);
    setActionMsg('Preparing Allure report...');

    try {
      if (!hasTestResults(evidence, report)) {
        setActionMsg(
          'No test results yet — use Run Full Regression (not Analyze Only), then open Allure.'
        );
        return;
      }

      try {
        await generateAllureReport();
      } catch {
        // report may already exist on disk
      }

      const opened = await openAllureReport();
      window.open(
        opened.browserUrl || '/reports/allure/index.html',
        '_blank'
      );
      setActionMsg('Allure report opened in new tab');
    } catch (err) {
      window.open('/reports/allure/index.html', '_blank');
      setActionMsg(
        (err.message || 'Generate failed')
        + ' — opened report URL anyway'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setActionMsg('Regenerating Allure report...');

    try {
      await generateAllureReport();
      setActionMsg('Allure report generated — click Open to view');
      setTimeout(loadEvidence, 2000);
    } catch (err) {
      setActionMsg(
        err.message
        + ' — try opening existing report directly'
      );
    } finally {
      setLoading(false);
    }
  };

  const layers = evidence?.layers || {};
  const scenarios = resolveScenarios(evidence, report);
  const scenarioStats = resolveScenarioStats(
    evidence,
    scenarios,
    report
  );
  const dataAlerts = evidence?.dataIntegrityAlerts || [];
  const artifacts = evidence?.artifacts || { screenshots: [], videos: [] };
  const apiFeed = (evidence?.feed || []).filter(
    item => item.type === 'api'
  );
  const dbFeed = (evidence?.feed || []).filter(
    item => item.type === 'db'
  );
  const freshness = evidence?.evidenceFreshness;
  const evidenceStale = freshness?.evidenceStale === true;
  const feedMedia = (evidence?.feed || []).filter(
    item => item.type === 'ui' || item.type === 'video'
  );

  const uiScreenshots = [
    ...artifacts.screenshots,
    ...feedMedia
      .filter(item => item.type === 'ui' && item.mediaUrl)
      .map(item => ({
        url: item.mediaUrl,
        name: item.title,
        folder: item.testName || 'UI'
      }))
  ];

  const uiVideos = [
    ...artifacts.videos,
    ...feedMedia
      .filter(item => item.type === 'video' && item.mediaUrl)
      .map(item => ({
        url: item.mediaUrl,
        name: item.title,
        folder: item.testName || 'UI'
      }))
  ];

  const dedupeMedia = (items) => {
    const seen = new Set();
    return items.filter(item => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };

  const screenshots = dedupeMedia(uiScreenshots);
  const videos = dedupeMedia(uiVideos);

  const filteredTests =
    activeLayer === 'all'
      ? ['ui', 'api', 'db'].flatMap(
          layer => (layers[layer]?.tests || []).map(test => ({
            ...test,
            layer
          }))
        )
      : (layers[activeLayer]?.tests || []).map(test => ({
          ...test,
          layer: activeLayer
        }));

  const filteredScenarios =
    scenarioFilter === 'all'
      ? scenarios
      : scenarios.filter(
          scenario => scenario.type === scenarioFilter
        );

  const scenariosByDomain =
    filteredScenarios.reduce((groups, scenario) => {
      const key = scenario.domain || 'other';

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(scenario);
      return groups;
    }, {});

  const domainOrder =
    Object.keys(scenariosByDomain).sort();

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Test Evidence & Allure
          </h2>
          <p className="text-sm text-slate-400">
            UI videos, screenshots, API/DB breakdown
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isLive
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-slate-500/15 text-slate-400'
          }`}
        >
          {isLive
            ? 'Live'
            : evidence?.generatedAt
              ? `Updated ${new Date(evidence.generatedAt).toLocaleTimeString()}`
              : 'Waiting'}
        </span>
      </div>

      {evidence?.executionPassed === true
        && isRunComplete(scenarioStats)
        && (scenarioStats?.overall?.failed || 0) === 0
        && dataAlerts.length === 0 && (
        <p className="mb-3 text-xs text-emerald-300">
          Latest run passed — showing current run evidence only.
        </p>
      )}

      {report?.execution?.executed
        && !report?.execution?.running
        && (scenarioStats?.overall?.failed || 0) > 0 && (
        <p className="mb-3 text-xs text-red-300">
          Latest run finished with {scenarioStats.overall.failed} failed scenario
          {scenarioStats.overall.failed === 1 ? '' : 's'} — see evidence below.
        </p>
      )}

      {dataAlerts.length > 0 && (
        <p className="mb-3 text-xs text-amber-300">
          {dataAlerts.length} DB data integrity alert
          {dataAlerts.length === 1 ? '' : 's'} — 0 rows found where a record was expected.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleOpenAllure}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02] disabled:opacity-60"
        >
          📈 Open Allure Report
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleRegenerate}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500/30 disabled:opacity-60"
        >
          ↻ Regenerate
        </button>
        <a
          href="/reports/allure/index.html"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          Direct Link ↗
        </a>
      </div>

      {actionMsg && (
        <p className={`mb-4 text-xs ${actionMsg.includes('not') || actionMsg.includes('No test') ? 'text-amber-300' : 'text-emerald-300'}`}>
          {actionMsg}
        </p>
      )}

      {!hasTestResults(evidence, report) && !isLive && (
        <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          No Playwright results in this session. Use <strong>Run Full Regression</strong> to execute tests and populate live evidence + Allure.
        </p>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        {Object.entries(LAYER_META).map(([key, meta]) => {
          const stats = layers[key] || { total: 0, passed: 0, failed: 0 };

          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveLayer(activeLayer === key ? 'all' : key)
              }
              className={`rounded-2xl border p-3 text-left transition ${
                activeLayer === key
                  ? `${meta.border} ${meta.bg}`
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              <p className="text-lg">{meta.icon}</p>
              <p className={`text-sm font-semibold ${meta.color}`}>
                {meta.label}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {stats.passed}/{stats.total} layer tests
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Scenarios Considered
          </h3>
          {scenarioStats?.overall?.total > 0 && (
            <span className="text-[10px] text-slate-500">
              {scenarioStats.overall.passed}/{scenarioStats.overall.total} passed
            </span>
          )}
        </div>

        {scenarios.length === 0 ? (
          <p className="text-sm text-slate-500">
            Run regression to see pos/neg/edge test cases
          </p>
        ) : (
          <>
            <ScenarioTypeSummary
              stats={scenarioStats}
              scenarios={scenarios}
              executionState={evidence?.executionState}
            />

            <div className="mb-3 flex flex-wrap gap-1.5">
              {['all', 'positive', 'negative', 'edge'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setScenarioFilter(filter)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    scenarioFilter === filter
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-3">
              {domainOrder.map((domain) => (
                <div key={domain}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {domain.replace(/-/g, ' ')}
                  </p>
                  <div className="space-y-2">
                    {scenariosByDomain[domain].map((scenario) => {
                      const layerMeta =
                        LAYER_META[scenario.layer] || LAYER_META.api;

                      return (
                        <div
                          key={`${scenario.domain}-${scenario.layer}-${scenario.id}`}
                          className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-200">
                                {scenario.title || scenario.id}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                    TYPE_COLORS[scenario.type]
                                      || TYPE_COLORS.core
                                  }`}
                                >
                                  {scenario.type}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${layerMeta.bg} ${layerMeta.border} ${layerMeta.color}`}
                                >
                                  {layerMeta.icon} {layerMeta.label}
                                </span>
                                {scenario.tier && (
                                  <span className="text-[10px] text-slate-500">
                                    {scenario.tier}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={scenario.status} />
                          </div>
                          {scenario.expectedOutcome && (
                            <p className="mt-1.5 text-[10px] text-slate-500">
                              Expected: {scenario.expectedOutcome}
                            </p>
                          )}
                          {scenario.proofCount > 0 && (
                            <p className="mt-1 text-[10px] text-cyan-400/80">
                              {scenario.proofCount} evidence item
                              {scenario.proofCount === 1 ? '' : 's'} captured
                            </p>
                          )}
                          {scenario.error && (
                            <p className="mt-2 line-clamp-2 text-[10px] text-red-300/80">
                              {scenario.error}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {(evidence?.diffSignals || []).length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Diff signals: {evidence.diffSignals.join(', ')}
          </p>
        )}
      </div>

      <div className="mb-4 max-h-48 overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tests Executed ({filteredTests.length})
        </h3>
        {filteredTests.length === 0 ? (
          <p className="text-sm text-slate-500">No test results yet</p>
        ) : (
          <div className="space-y-2">
            {filteredTests.map((test) => (
              <div
                key={test.uuid || test.name}
                className="flex items-start gap-2 rounded-xl border border-white/5 px-3 py-2"
              >
                <StatusDot status={test.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">
                    {test.name}
                  </p>
                  <p className="text-xs uppercase text-slate-500">
                    {test.layer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(screenshots.length > 0
        || videos.length > 0) && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            UI Artifacts ({screenshots.length + videos.length})
          </h3>

          {screenshots.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {screenshots.slice(0, 4).map((shot) => (
                <a
                  key={shot.url}
                  href={shot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-white/10 bg-black/30"
                >
                  <img
                    src={`${shot.url}?t=${evidence?.generatedAt || Date.now()}`}
                    alt={shot.name}
                    className="h-24 w-full object-cover object-top bg-slate-900 transition group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                    {shot.folder}
                  </p>
                </a>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.slice(0, 2).map((video) => (
                <div
                  key={video.url}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                >
                  <video
                    src={video.url}
                    controls
                    className="max-h-32 w-full bg-black"
                  />
                  <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                    {video.folder}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {screenshots.length === 0 && videos.length === 0 && (
        <p className="text-xs text-slate-500">
          No UI screenshots or videos in the latest run yet.
        </p>
      )}

      {(apiFeed.length > 0 || dbFeed.length > 0) && (
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            API &amp; DB Evidence
            {freshness && (
              <span className="ml-2 font-normal normal-case text-slate-600">
                {freshness.apiFeedCount} API · {freshness.dbFeedCount} DB
                {freshness.lastEvidenceAt
                  ? ` · last ${new Date(freshness.lastEvidenceAt).toLocaleTimeString()}`
                  : ''}
              </span>
            )}
          </h3>

          {evidenceStale && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Report was regenerated without a test run — API/DB evidence is from the
              previous execution. Run full regression to refresh.
            </p>
          )}

          {apiFeed.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3"
            >
              <p className="text-sm font-medium text-cyan-200">
                {item.title}
              </p>
              {item.url && (
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {item.method || 'POST'} {item.url}
                  {item.httpStatus != null ? ` · ${item.httpStatus}` : ''}
                </p>
              )}
              {item.request && (
                <pre className="mt-2 max-h-24 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] text-slate-300">
                  {JSON.stringify(item.request, null, 2).slice(0, 600)}
                </pre>
              )}
            </div>
          ))}

          {dbFeed.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
            >
              <p className="text-sm font-medium text-amber-200">
                {item.title}
              </p>
              <pre className="mt-2 max-h-24 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] text-slate-300">
                {JSON.stringify(
                  item.record || item.response || item.preview,
                  null,
                  2
                ).slice(0, 600)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
