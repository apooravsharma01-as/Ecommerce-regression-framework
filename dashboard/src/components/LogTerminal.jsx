import { useEffect, useRef } from 'react';

export default function LogTerminal({ logs, visible }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!visible) return null;

  return (
    <section className="glass-strong rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-500/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-sm font-medium text-slate-400">
          Live Pipeline Logs
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/5 bg-black/50 p-4">
        <pre className="log-terminal text-slate-300">
          {logs || 'Waiting for pipeline output...'}
        </pre>
        <div ref={endRef} />
      </div>
    </section>
  );
}
