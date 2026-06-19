import { useEffect, useState } from 'react';
import { fetchEvidenceSummary } from '../api';

const LAYER_STYLE = {
  ui: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  api: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  db: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

const TYPE_STYLE = {
  timeout: 'text-orange-300',
  assertion: 'text-red-300',
  authentication: 'text-pink-300',
  database: 'text-amber-300',
  'ui-locator': 'text-violet-300',
  unknown: 'text-slate-400'
};

export default function FailureAnalysisPanel({
  report,
  jobStatus,
  running
}) {
  const [failures, setFailures] = useState([]);
  const [dataAlerts, setDataAlerts] = useState([]);
  const [executionPassed, setExecutionPassed] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const loadFailures = async (live = false) => {
    try {
      const data = await fetchEvidenceSummary(live);
      setFailures(data.failures || []);
      setDataAlerts(data.dataIntegrityAlerts || []);
      setExecutionPassed(data.executionPassed);
    } catch {
      setFailures([]);
      setDataAlerts([]);
    }
  };

  const isLive =
    running
    || jobStatus === 'running'
    || jobStatus === 'queued';

  useEffect(() => {
    loadFailures(true);
  }, [report?.timestamp, jobStatus]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadFailures(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, report?.timestamp]);

  const allPassed =
    (executionPassed === true || jobStatus === 'passed')
    && dataAlerts.length === 0;

  const visibleFailures =
    allPassed ? [] : failures;

  const hasIssues =
    visibleFailures.length > 0
    || dataAlerts.length > 0;

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Failure Analysis
          </h2>
          <p className="text-sm text-slate-400">
            What failed and why
          </p>
        </div>
        {hasIssues ? (
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
            {visibleFailures.length + dataAlerts.length} issue
            {visibleFailures.length + dataAlerts.length === 1 ? '' : 's'}
          </span>
        ) : allPassed ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            All passed
          </span>
        ) : (
          <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-400">
            No data
          </span>
        )}
      </div>

      {dataAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Data Integrity Alerts
          </p>
          {dataAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3"
            >
              <p className="text-sm font-medium text-amber-200">
                {alert.title}
              </p>
              <p className="mt-1 text-xs text-amber-100/80">
                {alert.message}
                {alert.orderCode ? ` (order: ${alert.orderCode})` : ''}
              </p>
              <p className="mt-1 text-[10px] text-amber-300/70">
                rowsFound: {alert.rowsFound ?? 0} · {alert.verification}
              </p>
            </div>
          ))}
        </div>
      )}

      {allPassed && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          All tests passed and DB verification is consistent in the latest run.
        </div>
      )}

      {visibleFailures.length === 0 && !allPassed && dataAlerts.length === 0 && (
        <p className="text-sm text-slate-500">
          Run regression to see failure details here.
        </p>
      )}

      <div className="space-y-3">
        {visibleFailures.map((item) => {
          const isOpen = expanded === item.uuid;

          return (
            <div
              key={item.uuid}
              className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded(isOpen ? null : item.uuid)
                }
                className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-red-500/10"
              >
                <span className="mt-1 text-red-400">✕</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        LAYER_STYLE[item.layer]
                          || LAYER_STYLE.other
                      }`}
                    >
                      {item.layer}
                    </span>
                    <span
                      className={`text-xs font-semibold uppercase ${
                        TYPE_STYLE[item.failureType]
                          || TYPE_STYLE.unknown
                      }`}
                    >
                      {item.failureType}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {item.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-red-200/80">
                    {item.error}
                  </p>
                </div>
                <span className="text-slate-500">
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-red-500/10 bg-black/20 px-4 pb-4 pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Root Cause
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {item.rootCause}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Suggested Fix
                    </p>
                    <p className="mt-1 text-sm text-emerald-300/90">
                      {item.suggestedFix}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    Confidence: {item.confidence}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {item.screenshot && (
                      <a
                        href={item.screenshot}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-violet-300 hover:border-violet-500/30"
                      >
                        📸 Screenshot
                      </a>
                    )}
                    {item.video && (
                      <a
                        href={item.video}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-500/30"
                      >
                        🎥 Video
                      </a>
                    )}
                    <a
                      href="/reports/allure/index.html"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-emerald-300 hover:border-emerald-500/30"
                    >
                      📈 Full Allure
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
