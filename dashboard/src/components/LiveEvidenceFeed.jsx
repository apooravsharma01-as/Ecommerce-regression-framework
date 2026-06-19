import { useEffect, useRef, useState } from 'react';
import { fetchEvidenceSummary } from '../api';

const TYPE_META = {
  ui: {
    icon: '📸',
    label: 'UI',
    chip: 'bg-violet-500/15 text-violet-300 border-violet-500/30'
  },
  video: {
    icon: '🎥',
    label: 'Video',
    chip: 'bg-pink-500/15 text-pink-300 border-pink-500/30'
  },
  api: {
    icon: '🔌',
    label: 'API',
    chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
  },
  db: {
    icon: '🗄️',
    label: 'DB',
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  other: {
    icon: '📎',
    label: 'Other',
    chip: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }
};

const FILTERS = ['all', 'ui', 'video', 'api', 'db'];

function formatTime(ts) {
  if (!ts) return '';

  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function FeedDetail({ item }) {
  if (item.type === 'video') {
    if (!item.mediaUrl) {
      return (
        <p className="mt-2 text-xs text-slate-400">
          Video will appear after the test step finishes writing the file.
        </p>
      );
    }

    return (
      <video
        src={`${item.mediaUrl}?t=${item.timestamp || Date.now()}`}
        controls
        className="mt-2 max-h-32 w-full rounded-lg border border-white/10 bg-black"
      />
    );
  }

  if (item.type === 'ui') {
    if (!item.mediaUrl) {
      return (
        <p className="mt-2 text-xs text-slate-400">
          Screenshot captured — waiting for file to become available...
        </p>
      );
    }

    return (
      <div className="mt-2">
        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-white/10"
        >
          <img
            src={`${item.mediaUrl}?t=${item.timestamp || Date.now()}`}
            alt={item.title}
            className="max-h-40 w-full object-cover object-top bg-slate-900"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </a>
        <p className="mt-1 text-[10px] text-slate-500">
          Open full size in new tab
        </p>
      </div>
    );
  }

  if (item.type === 'api') {
    return (
      <div className="mt-2 space-y-2">
        {item.url && (
          <p className="font-mono text-[10px] text-cyan-300">
            {item.method || 'POST'} {item.url}
          </p>
        )}
        {item.request && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">
              Request
            </p>
            <pre className="mt-1 max-h-32 overflow-auto rounded-lg border border-cyan-500/20 bg-black/40 p-2 font-mono text-[10px] text-slate-300">
              {JSON.stringify(item.request, null, 2).slice(0, 1500)}
            </pre>
          </div>
        )}
        {item.response && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">
              Response
            </p>
            <pre className="mt-1 max-h-32 overflow-auto rounded-lg border border-emerald-500/20 bg-black/40 p-2 font-mono text-[10px] text-slate-300">
              {JSON.stringify(item.response, null, 2).slice(0, 1500)}
            </pre>
          </div>
        )}
        {!item.request && !item.response && item.preview && (
          <pre className="max-h-32 overflow-auto rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[10px] text-slate-300">
            {item.preview.slice(0, 1500)}
          </pre>
        )}
      </div>
    );
  }

  if (item.type === 'db') {
    const payload = item.record || item.response || item.preview;

    if (!payload) {
      return null;
    }

    const record =
      typeof payload === 'object'
        ? payload
        : null;

    const text =
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload, null, 2);

    const rowsFound =
      item.rowsFound
      ?? record?.rowsFound
      ?? null;

    const verification =
      item.verification
      ?? record?.verification
      ?? null;

    const status =
      item.status
      ?? record?.status
      ?? null;

    const query =
      record?.query || null;

    return (
      <div className="mt-2">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase text-slate-500">
            DB Query Result
          </p>
          {query && (
            <span className="font-mono text-[10px] text-amber-200/80">
              {query}
            </span>
          )}
          {rowsFound != null && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                rowsFound > 0
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : verification === 'connectivity'
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                    : 'border-red-500/30 bg-red-500/15 text-red-300'
              }`}
            >
              {rowsFound} row{rowsFound === 1 ? '' : 's'}
            </span>
          )}
          {verification && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
              {verification}
            </span>
          )}
          {status && (
            <span
              className={`text-[10px] font-semibold uppercase ${
                status === 'passed'
                  ? 'text-emerald-400'
                  : status === 'skipped'
                    ? 'text-slate-400'
                    : 'text-red-400'
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <pre className="mt-1 max-h-36 overflow-auto rounded-lg border border-amber-500/20 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
          {text.slice(0, 1500)}
        </pre>
      </div>
    );
  }

  const payload =
    item.response
    || item.record
    || item.request
    || item.preview;

  if (!payload) {
    return null;
  }

  const text =
    typeof payload === 'string'
      ? payload
      : JSON.stringify(payload, null, 2);

  return (
    <pre className="mt-2 max-h-28 overflow-auto rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
      {text.slice(0, 1200)}
    </pre>
  );
}

export default function LiveEvidenceFeed({
  running,
  jobStatus,
  report
}) {
  const [feed, setFeed] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const scrollRef = useRef(null);
  const prevCount = useRef(0);

  const isLive =
    running
    || jobStatus === 'running'
    || jobStatus === 'queued';

  const loadFeed = async () => {
    try {
      const data =
        await fetchEvidenceSummary(true);

      setFeed(data.feed || []);
      setFreshness(data.evidenceFreshness || null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [jobStatus, report?.timestamp]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const interval =
      setInterval(loadFeed, 1500);

    return () => clearInterval(interval);
  }, [isLive, report?.timestamp]);

  useEffect(() => {
    if (
      feed.length > prevCount.current
      && scrollRef.current
    ) {
      scrollRef.current.scrollTop = 0;
    }

    prevCount.current = feed.length;
  }, [feed.length]);

  const filtered =
    filter === 'all'
      ? feed
      : feed.filter(item => item.type === filter);

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Live Evidence Feed
          </h2>
          <p className="text-sm text-slate-400">
            Screenshots, videos, API req/res, DB records
            {freshness?.lastEvidenceAt
              ? ` · updated ${new Date(freshness.lastEvidenceAt).toLocaleTimeString()}`
              : ''}
          </p>
          {freshness?.evidenceStale && (
            <p className="mt-1 text-xs text-amber-300">
              Stale — last full run required to match current report
            </p>
          )}
        </div>

        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            isLive
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-slate-500/15 text-slate-400'
          }`}
        >
          {isLive && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          )}
          {isLive ? 'Live' : `${feed.length} items`}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition ${
              filter === key
                ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/30 p-3"
      >
        {error && (
          <p className="text-xs text-red-300">{error}</p>
        )}

        {!error && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <p className="text-2xl">📡</p>
            <p className="mt-2 text-sm text-slate-400">
              {isLive
                ? 'Tests running — evidence will appear here shortly...'
                : 'Run regression to capture screenshots, API, and DB evidence'}
            </p>
          </div>
        )}

        {filtered.map((item) => {
          const meta =
            TYPE_META[item.type]
            || TYPE_META.other;

          const isOpen =
            expanded === item.id;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/5 bg-white/[0.02]"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded(isOpen ? null : item.id)
                }
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
              >
                <span className="text-lg leading-none">
                  {meta.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {item.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.chip}`}
                    >
                      {meta.label}
                    </span>
                    {item.type === 'api' && (
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          item.businessOutcome === 'passed'
                            || item.response?.successful === true
                            ? 'text-emerald-400'
                            : item.businessOutcome === 'failed'
                              || item.response?.successful === false
                              ? 'text-red-400'
                              : 'text-amber-300'
                        }`}
                      >
                        {item.response?.successful === true
                          ? 'successful'
                          : item.response?.successful === false
                            ? 'rejected'
                            : item.businessOutcome || 'api'}
                      </span>
                    )}
                    {item.httpStatus != null && (
                      <span className="text-[10px] text-slate-400">
                        HTTP {item.httpStatus}
                      </span>
                    )}
                    {item.type === 'db' && item.rowsFound != null && (
                      <span
                        className={`text-[10px] font-semibold ${
                          item.rowsFound > 0
                            ? 'text-emerald-400'
                            : item.verification === 'connectivity'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }`}
                      >
                        {item.rowsFound} rows
                      </span>
                    )}
                    {item.status && !item.httpStatus && (
                      <span
                        className={`text-[10px] uppercase ${
                          item.status === 'passed'
                            ? 'text-emerald-400'
                            : item.status === 'skipped'
                              ? 'text-slate-400'
                              : 'text-red-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.testName || item.url || '—'}
                    {item.method ? ` · ${item.method}` : ''}
                    {item.httpStatus != null ? ` · HTTP ${item.httpStatus}` : ''}
                    {item.timestamp
                      ? ` · ${formatTime(item.timestamp)}`
                      : ''}
                  </p>
                </div>

                <span className="text-xs text-slate-600">
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-3 pb-3">
                  <FeedDetail item={item} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Click item to expand req/res JSON or screenshot
        </span>
        <a
          href="/reports/allure/index.html"
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:text-cyan-300"
        >
          Full Allure ↗
        </a>
      </div>
    </section>
  );
}
