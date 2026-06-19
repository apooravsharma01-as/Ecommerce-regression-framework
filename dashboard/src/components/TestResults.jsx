import { useEffect, useState } from 'react';
import { fetchEvidenceSummary } from '../api';
import {
  resolveScenarioStats,
  resolveScenarios
} from '../utils/evidenceDisplay';

function StatusBadge({ status }) {
  const styles = {
    passed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/15 text-red-300 border-red-500/30',
    running: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    queued: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    skipped: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    pending: 'bg-amber-500/10 text-amber-200 border-amber-500/20 border-dashed'
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
        styles[status] || styles.queued
      }`}
    >
      {status}
    </span>
  );
}

const SCENARIO_STATUS_ICON = {
  passed: '✓',
  failed: '✗',
  broken: '✗',
  skipped: '⊘',
  pending: '…',
  not_run: '○'
};

export default function TestResults({ report, job, running }) {
  const [evidence, setEvidence] = useState(null);

  const tests = report?.tests || [];
  const execution = report?.execution;
  const generated = report?.generation?.files || [];
  const scenarios = resolveScenarios(evidence, report);
  const scenarioStats = resolveScenarioStats(
    evidence,
    scenarios,
    report
  );

  const isLive =
    running
    || job?.status === 'running'
    || job?.status === 'queued';

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchEvidenceSummary(true);
        setEvidence(data);
      } catch {
        setEvidence(null);
      }
    };

    load();
  }, [report?.timestamp, job?.status]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const data = await fetchEvidenceSummary(true);
        setEvidence(data);
      } catch {
        // keep last snapshot
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isLive, report?.timestamp]);

  const jobStatus =
    job?.status
    || (execution?.running ? 'running' : null);

  const passedCount =
    scenarioStats?.overall?.passed
    ?? execution?.testResults?.passed
    ?? 0;

  const totalCount =
    scenarioStats?.overall?.total
    ?? scenarios.length
    ?? tests.length;

  return (
    <section className="glass rounded-3xl p-6 animate-slide-up">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Test Results</h2>
          <p className="text-sm text-slate-400">
            {scenarios.length > 0
              ? `${passedCount}/${totalCount} scenarios passed`
              : `${tests.length} tests in regression suite`}
          </p>
        </div>
        {jobStatus && <StatusBadge status={jobStatus} />}
      </div>

      {execution?.executed && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Result
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                execution.passed ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {execution.passed ? 'PASSED' : 'FAILED'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Duration
            </p>
            <p className="mt-1 text-xl font-bold text-white">
              {((execution.durationMs || 0) / 1000).toFixed(1)}s
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Playwright
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-300">
              {execution.testResults
                ? `${execution.testResults.passed}/${execution.testResults.total}`
                : generated.length}
            </p>
          </div>
        </div>
      )}

      {execution?.running && (
        <p className="mb-4 text-xs text-indigo-300">
          Execution in progress — scenario status updates live below.
        </p>
      )}

      {execution?.executed === false && !execution?.running && (
        <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Last pipeline run was <strong>Analyze Only</strong> — no tests executed.
          Click <strong>Run Full Regression</strong> to get live API/DB evidence and scenario pass/fail.
        </p>
      )}

      <div className="space-y-2">
        {scenarios.length > 0 ? (
          scenarios.map((scenario, index) => {
            const status = scenario.status || 'not_run';
            const statusColor =
              status === 'passed'
                ? 'text-emerald-400'
                : status === 'skipped'
                  ? 'text-slate-400'
                  : status === 'pending' || status === 'not_run'
                    ? 'text-amber-300'
                    : 'text-red-400';

            return (
              <div
                key={`${scenario.domain}-${scenario.layer}-${scenario.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3 transition hover:border-indigo-500/20"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm text-slate-200">
                    {scenario.title || scenario.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {scenario.type} · {scenario.domain} · {scenario.layer}
                    {scenario.proofCount > 0
                      ? ` · ${scenario.proofCount} evidence`
                      : ''}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${statusColor}`}>
                  {SCENARIO_STATUS_ICON[status] || '○'} {status}
                </span>
              </div>
            );
          })
        ) : tests.length === 0 ? (
          <p className="text-sm text-slate-500">No tests selected yet.</p>
        ) : (
          tests.map((test, index) => {
            const isGenerated = test.includes('generated');
            const layer = test.includes('.api.')
              ? 'API'
              : test.includes('.db.')
                ? 'DB'
                : test.includes('.ui.') || test.includes('tests/ui')
                  ? 'UI'
                  : 'TEST';

            const icon =
              execution?.executed
                ? (execution.passed ? '✓' : '…')
                : execution?.running
                  ? '…'
                  : '○';

            const iconColor =
              execution?.executed && execution.passed
                ? 'text-emerald-400'
                : execution?.running
                  ? 'text-indigo-300'
                  : 'text-slate-500';

            return (
              <div
                key={test}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3 transition hover:border-indigo-500/20"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      layer === 'API'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : layer === 'DB'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-violet-500/20 text-violet-300'
                    }`}
                  >
                    {layer}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-slate-200">
                      {test}
                    </p>
                    {isGenerated && (
                      <p className="text-xs text-indigo-400">auto-generated</p>
                    )}
                  </div>
                </div>
                <span className={iconColor}>{icon}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
