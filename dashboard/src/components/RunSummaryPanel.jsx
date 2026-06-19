import { useEffect, useState } from 'react';
import { fetchEvidenceSummary } from '../api';
import { buildRunSummary } from '../utils/runSummary';

const STATUS_STYLES = {
  passed: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    icon: '✓'
  },
  failed: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    icon: '✗'
  },
  broken: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    icon: '✗'
  },
  pending: {
    border: 'border-amber-500/25 border-dashed',
    bg: 'bg-amber-500/5',
    text: 'text-amber-200',
    icon: '…'
  },
  not_run: {
    border: 'border-white/10',
    bg: 'bg-white/[0.02]',
    text: 'text-slate-400',
    icon: '○'
  },
  skipped: {
    border: 'border-white/10',
    bg: 'bg-white/[0.02]',
    text: 'text-slate-400',
    icon: '⊘'
  }
};

const LAYER_CHIP = {
  api: 'bg-cyan-500/15 text-cyan-300',
  db: 'bg-amber-500/15 text-amber-300',
  ui: 'bg-violet-500/15 text-violet-300'
};

function SummaryRow({ label, children }) {

  return (
    <div className="grid gap-1 sm:grid-cols-[72px_1fr]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-xs leading-relaxed text-slate-300">
        {children}
      </p>
    </div>
  );
}

function WalkthroughCard({ item, defaultOpen = false }) {

  const [open, setOpen] = useState(defaultOpen);
  const style =
    STATUS_STYLES[item.status]
    || STATUS_STYLES.not_run;

  return (
    <div
      className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${style.text}`}
        >
          {item.step}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-100">
              {item.title}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${LAYER_CHIP[item.layer] || 'bg-slate-500/15 text-slate-300'}`}
            >
              {item.layer}
            </span>
            <span className="text-[10px] uppercase text-slate-500">
              {item.type}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {item.domainLabel}
            {item.proofCount > 0
              ? ` · ${item.proofCount} proof item${item.proofCount === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <span
          className={`shrink-0 text-xs font-bold uppercase ${style.text}`}
        >
          {style.icon} {item.status.replace('_', ' ')}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/5 px-4 py-3">
          <SummaryRow label="Why">
            {item.why}
          </SummaryRow>
          <SummaryRow label="How">
            {item.how}
          </SummaryRow>
          <SummaryRow label="Expected">
            {item.expectedOutcome}
          </SummaryRow>
          <SummaryRow label="Result">
            <span className={style.text}>
              {item.result}
            </span>
          </SummaryRow>
        </div>
      )}
    </div>
  );
}

export default function RunSummaryPanel({
  report,
  jobStatus,
  running
}) {

  const [evidence, setEvidence] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const isLive =
    running
    || jobStatus === 'running'
    || jobStatus === 'queued';

  const load = async () => {
    try {
      const data = await fetchEvidenceSummary(true);
      setEvidence(data);
    } catch {
      setEvidence(null);
    }
  };

  useEffect(() => {
    load();
  }, [report?.timestamp, jobStatus]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [isLive, report?.timestamp]);

  const summary = buildRunSummary(report, evidence);

  if (!summary.items.length) {
    return null;
  }

  const verdict =
    !summary.executed
      ? 'pending'
      : summary.allPassed
        ? 'passed'
        : summary.stats.failed > 0
          ? 'failed'
          : 'partial';

  const verdictText = {
    passed:
      'All scenarios passed with matching API/DB proof.',
    failed:
      `${summary.stats.failed} scenario(s) failed — see details below.`,
    partial:
      'Run finished — some scenarios still pending or without proof.',
    pending:
      'Tests not executed yet. Run full regression to populate this walkthrough.'
  };

  return (
    <section className="glass rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Test Walkthrough
          </h2>
          <p className="text-sm text-slate-400">
            What was tested, why, how, and whether proof matched
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <>
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 ${
              verdict === 'passed'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : verdict === 'failed'
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-indigo-500/25 bg-indigo-500/10'
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Story
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {summary.trigger}
            </p>

            {summary.signals.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Signals: {summary.signals.join(', ')}
              </p>
            )}

            <p
              className={`mt-3 text-sm ${
                verdict === 'passed'
                  ? 'text-emerald-300'
                  : verdict === 'failed'
                    ? 'text-red-300'
                    : 'text-indigo-200'
              }`}
            >
              {verdictText[verdict]}
            </p>

            {summary.executed && (
              <p className="mt-1 text-xs text-slate-500">
                {summary.stats.passed}/{summary.stats.total} passed
                {summary.durationMs
                  ? ` · ${(summary.durationMs / 1000).toFixed(1)}s`
                  : ''}
              </p>
            )}

            {summary.evidenceStale && (
              <p className="mt-2 text-xs text-amber-300">
                Evidence may be from a previous run — re-run full regression.
              </p>
            )}

          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {summary.domains.map(domain => (
              <span
                key={domain}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300"
              >
                {domain.replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {summary.items.map((item, index) => (
              <WalkthroughCard
                key={item.id}
                item={item}
                defaultOpen={
                  index < 2
                  || item.status === 'failed'
                  || item.status === 'broken'
                }
              />
            ))}
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Click any step to expand Why · How · Expected · Result.
            Expand items in Live Evidence Feed above for raw req/res JSON.
          </p>
        </>
      )}
    </section>
  );
}
