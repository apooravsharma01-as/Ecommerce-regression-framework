import { DEMO_PRESETS } from '../constants';

export default function TriggerPanel({
  form,
  setForm,
  onRun,
  onAnalyze,
  running
}) {
  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      story: preset.story,
      simulate: preset.simulate || ''
    }));
  };

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Launch Regression
          </h2>
          <p className="text-sm text-slate-400">
            Pick a demo preset or craft your own trigger
          </p>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300">
          Phase 4 Ready
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={running}
            onClick={() => applyPreset(preset)}
            className="group rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:opacity-50"
          >
            <span className="text-xl">{preset.icon}</span>
            <p className="mt-2 text-sm font-medium text-white group-hover:text-indigo-200">
              {preset.label}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Story / Change Description
          </label>
          <textarea
            value={form.story}
            onChange={(e) => update('story', e.target.value)}
            rows={3}
            placeholder="e.g. GST validation changed for product creation"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              JIRA Ticket
            </label>
            <input
              value={form.jira}
              onChange={(e) => update('jira', e.target.value)}
              placeholder="PROJ-123"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              GitHub PR
            </label>
            <input
              value={form.pr}
              onChange={(e) => update('pr', e.target.value)}
              placeholder="42"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Simulate Changed File (Uniware)
          </label>
          <input
            value={form.simulate}
            onChange={(e) => update('simulate', e.target.value)}
            placeholder="UniwareCore/src/main/java/.../ItemType.java"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.llm}
              onChange={(e) => update('llm', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-indigo-500"
            />
            LLM enrichment
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.git}
              onChange={(e) => update('git', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-indigo-500"
            />
            Git diff scan
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={running}
            onClick={onRun}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] hover:shadow-indigo-500/50 disabled:scale-100 disabled:opacity-60"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running Pipeline...
              </span>
            ) : (
              '🚀 Run Full Regression'
            )}
          </button>

          <button
            type="button"
            disabled={running}
            onClick={onAnalyze}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:opacity-60"
          >
            🔍 Analyze Only
          </button>
        </div>
      </div>
    </section>
  );
}
