import { useEffect, useState } from 'react';
import {
  fetchEvidenceSummary,
  generateAllureReport,
  openAllureReport
} from '../api';

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

export default function EvidencePanel({ report, jobStatus }) {
  const [evidence, setEvidence] = useState(null);
  const [activeLayer, setActiveLayer] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadEvidence = async () => {
    try {
      const data = await fetchEvidenceSummary();
      setEvidence(data);
      setActionMsg('');
    } catch (err) {
      setEvidence(null);
      setActionMsg(err.message);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [report, jobStatus]);

  useEffect(() => {
    if (jobStatus === 'passed' || jobStatus === 'failed') {
      loadEvidence();
    }
  }, [jobStatus]);

  const handleOpenAllure = async () => {
    setLoading(true);
    setActionMsg('');

    try {
      const result = await openAllureReport();
      window.open('/reports/allure/index.html', '_blank');
      setActionMsg('Allure report opened in new tab');
      await loadEvidence();
    } catch {
      window.open('/reports/allure/index.html', '_blank');
      setActionMsg('Opened Allure report URL');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setActionMsg('');

    try {
      await generateAllureReport();
      setActionMsg('Allure report generated');
      await loadEvidence();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const layers = evidence?.layers || {};
  const scenarios = evidence?.scenariosConsidered || [];
  const artifacts = evidence?.artifacts || { screenshots: [], videos: [] };

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
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          Live
        </span>
      </div>

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
          onClick={handleGenerate}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500/30 disabled:opacity-60"
        >
          ↻ Regenerate
        </button>
      </div>

      {actionMsg && (
        <p className="mb-4 text-xs text-emerald-300">{actionMsg}</p>
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
                {stats.passed}/{stats.total} passed
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Scenarios Considered
        </h3>
        {scenarios.length === 0 ? (
          <p className="text-sm text-slate-500">
            Run regression to see pos/neg/edge scenarios
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <span
                key={`${scenario.domain}-${scenario.id}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  TYPE_COLORS[scenario.type] || TYPE_COLORS.core
                }`}
              >
                {scenario.type} · {scenario.domain}
              </span>
            ))}
          </div>
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

      {(artifacts.screenshots?.length > 0
        || artifacts.videos?.length > 0) && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            UI Artifacts
          </h3>

          {artifacts.screenshots?.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {artifacts.screenshots.slice(-4).map((shot) => (
                <a
                  key={shot.url}
                  href={shot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-white/10 bg-black/30"
                >
                  <img
                    src={shot.url}
                    alt={shot.name}
                    className="h-20 w-full object-cover object-top transition group-hover:scale-105"
                  />
                  <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                    📸 {shot.folder}
                  </p>
                </a>
              ))}
            </div>
          )}

          {artifacts.videos?.length > 0 && (
            <div className="space-y-2">
              {artifacts.videos.slice(-2).map((video) => (
                <a
                  key={video.url}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cyan-300 transition hover:border-cyan-500/30"
                >
                  🎥 Watch UI failure video — {video.folder}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
