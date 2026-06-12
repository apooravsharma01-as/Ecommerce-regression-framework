function StatusBadge({ status }) {
  const styles = {
    passed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    failed: 'bg-red-500/15 text-red-300 border-red-500/30',
    running: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    queued: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
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

export default function TestResults({ report, job }) {
  const tests = report?.tests || [];
  const execution = report?.execution;
  const generated = report?.generation?.files || [];

  return (
    <section className="glass rounded-3xl p-6 animate-slide-up">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Test Results</h2>
          <p className="text-sm text-slate-400">
            {tests.length} tests in regression suite
          </p>
        </div>
        {job?.status && <StatusBadge status={job.status} />}
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
              Generated
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-300">
              {generated.length}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tests.length === 0 ? (
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

            return (
              <div
                key={test}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3 transition hover:border-indigo-500/20"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
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
                <span className="text-emerald-400">
                  {execution?.passed ? '✓' : execution?.executed === false ? '○' : '…'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
