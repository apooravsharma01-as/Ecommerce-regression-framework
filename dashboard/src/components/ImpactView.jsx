import { DEFAULT_DOMAIN_STYLE, DOMAIN_COLORS } from '../constants';

function DomainChip({ domain }) {
  const style = DOMAIN_COLORS[domain] || DEFAULT_DOMAIN_STYLE;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {domain}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function AssetList({ title, items, color }) {
  if (!items?.length) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 8).map((item) => (
          <span
            key={item}
            className={`rounded-lg border border-white/5 bg-black/20 px-2.5 py-1 font-mono text-xs ${color}`}
          >
            {item.split('/').pop()}
          </span>
        ))}
        {items.length > 8 && (
          <span className="rounded-lg px-2 py-1 text-xs text-slate-500">
            +{items.length - 8} more
          </span>
        )}
      </div>
    </div>
  );
}

export default function ImpactView({ report }) {
  const impact = report?.impact;

  if (!impact) {
    return (
      <section className="glass rounded-3xl p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-white">Impact Analysis</h2>
        <p className="mt-3 text-sm text-slate-500">
          Run a regression to see impacted domains, APIs, and DB tables.
        </p>
      </section>
    );
  }

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Impact Analysis</h2>
          <p className="mt-1 text-sm text-slate-400">
            Trigger: <span className="text-indigo-300">{impact.trigger}</span>
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Domains"
          value={impact.domains?.length || 0}
          accent="text-violet-300"
        />
        <StatCard
          label="Changed Files"
          value={impact.changedFiles?.length || 0}
          accent="text-cyan-300"
        />
        <StatCard
          label="API Hits"
          value={impact.impactedAPI?.length || 0}
          accent="text-emerald-300"
        />
        <StatCard
          label="DB Tables"
          value={impact.tables?.length || 0}
          accent="text-amber-300"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(impact.domains || []).map((domain) => (
          <DomainChip key={domain} domain={domain} />
        ))}
      </div>

      <div className="space-y-4">
        <AssetList
          title="UI Layer"
          items={impact.impactedUI}
          color="text-pink-300"
        />
        <AssetList
          title="API Layer"
          items={impact.impactedAPI}
          color="text-cyan-300"
        />
        <AssetList
          title="DB Layer"
          items={impact.impactedDB}
          color="text-amber-300"
        />
      </div>
    </section>
  );
}
