export default function RunHistory({ jobs, activeJobId, onSelect }) {
  if (!jobs?.length) return null;

  return (
    <section className="glass rounded-3xl p-6 animate-slide-up">
      <h2 className="mb-4 text-lg font-semibold text-white">Recent Runs</h2>

      <div className="space-y-2">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              activeJobId === job.id
                ? 'border-indigo-500/40 bg-indigo-500/10'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {job.trigger}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(job.startedAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                job.status === 'passed'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : job.status === 'failed'
                    ? 'bg-red-500/15 text-red-300'
                    : job.status === 'running'
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'bg-slate-500/15 text-slate-400'
              }`}
            >
              {job.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
