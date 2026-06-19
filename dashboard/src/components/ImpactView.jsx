import { useState } from 'react';
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

const FILE_LAYER_META = {
  api: { label: 'API', color: 'text-cyan-300' },
  db: { label: 'DB', color: 'text-amber-300' },
  page: { label: 'UI', color: 'text-pink-300' },
  scenarios: { label: 'Scenarios', color: 'text-violet-300' }
};

function ScaffoldFlowCard({ flow, isNew, expanded, onToggle }) {
  const endpoints = flow.endpoints || [];
  const visibleEndpoints = expanded
    ? endpoints
    : endpoints.slice(0, 4);

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-white">
              {flow.label || flow.id}
            </h4>
            {isNew && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                New flow
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {flow.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg border border-white/5 bg-black/20 px-2 py-1 text-cyan-300">
            {endpoints.length} endpoints
          </span>
          <span className="rounded-lg border border-white/5 bg-black/20 px-2 py-1 text-amber-300">
            {(flow.tables || []).length} tables
          </span>
        </div>
      </div>

      {flow.files && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(flow.files).map(([layer, filePath]) => {
            const meta = FILE_LAYER_META[layer] || {
              label: layer,
              color: 'text-slate-300'
            };

            return (
              <div
                key={layer}
                className="rounded-xl border border-white/5 bg-black/20 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {meta.label}
                </p>
                <p className={`mt-0.5 truncate font-mono text-xs ${meta.color}`}>
                  {filePath}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {endpoints.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Uniware endpoints
          </p>
          <div className="space-y-1">
            {visibleEndpoints.map((endpoint) => (
              <p
                key={endpoint}
                className="truncate font-mono text-xs text-slate-400"
              >
                {endpoint}
              </p>
            ))}
          </div>
          {endpoints.length > 4 && (
            <button
              type="button"
              onClick={onToggle}
              className="mt-2 text-xs text-orange-300 transition hover:text-orange-200"
            >
              {expanded
                ? 'Show fewer endpoints'
                : `+${endpoints.length - 4} more endpoints`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ScaffoldSection({ scaffold }) {
  const [expandedFlows, setExpandedFlows] = useState({});

  if (!scaffold) {
    return null;
  }

  if (!scaffold.scaffolded) {
    if (!scaffold.reason) {
      return null;
    }

    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Uniware scaffold
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Skipped — {scaffold.reason}
        </p>
      </div>
    );
  }

  const flows = scaffold.flows || [];
  const newDomains = new Set(scaffold.newDomains || []);
  const uniwarePath =
    scaffold.manifest?.uniwarePath || 'Uniware codebase';

  const toggleFlow = (flowId) => {
    setExpandedFlows((prev) => ({
      ...prev,
      [flowId]: !prev[flowId]
    }));
  };

  const totalEndpoints = flows.reduce(
    (sum, flow) => sum + (flow.endpoints?.length || 0),
    0
  );

  return (
    <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.07] to-amber-500/[0.03] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏗️</span>
            <h3 className="font-semibold text-white">
              Scaffolded from Uniware
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Missing flows auto-built from{' '}
            <span className="font-mono text-orange-300/90">
              {uniwarePath}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-medium text-orange-200">
            {flows.length} flow{flows.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-medium text-cyan-200">
            {totalEndpoints} endpoints
          </span>
          {newDomains.size > 0 && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200">
              {newDomains.size} new domain{newDomains.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {flows.map((flow) => (
          <ScaffoldFlowCard
            key={flow.id}
            flow={flow}
            isNew={newDomains.has(flow.id)}
            expanded={Boolean(expandedFlows[flow.id])}
            onToggle={() => toggleFlow(flow.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ImpactView({ report }) {
  const impact = report?.impact;
  const scaffold = report?.scaffold;

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
        {impact.scaffolded && (
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">
            Uniware scaffold active
          </span>
        )}
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
        <ScaffoldSection scaffold={scaffold} />

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
