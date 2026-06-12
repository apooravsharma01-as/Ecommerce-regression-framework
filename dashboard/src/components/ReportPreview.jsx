function renderMarkdownLine(line, index) {
  if (line.startsWith('# ')) {
    return (
      <h1 key={index} className="mb-3 text-xl font-bold text-white">
        {line.slice(2)}
      </h1>
    );
  }

  if (line.startsWith('## ')) {
    return (
      <h2
        key={index}
        className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-indigo-300"
      >
        {line.slice(3)}
      </h2>
    );
  }

  if (line.startsWith('- **')) {
    const match = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/);
    if (match) {
      return (
        <p key={index} className="mb-1 text-sm text-slate-300">
          <span className="font-semibold text-white">{match[1]}:</span>{' '}
          {match[2]}
        </p>
      );
    }
  }

  if (line.startsWith('- `')) {
    return (
      <p
        key={index}
        className="mb-1 font-mono text-xs text-cyan-300/90"
      >
        {line.slice(2)}
      </p>
    );
  }

  if (line.trim() === '') {
    return <div key={index} className="h-2" />;
  }

  if (line.startsWith('**')) {
    return (
      <p key={index} className="mb-2 text-sm text-slate-200">
        {line.replace(/\*\*/g, '')}
      </p>
    );
  }

  return (
    <p key={index} className="mb-1 text-sm text-slate-400">
      {line}
    </p>
  );
}

export default function ReportPreview({ markdown }) {
  if (!markdown) {
    return (
      <section className="glass rounded-3xl p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-white">Report Preview</h2>
        <p className="mt-3 text-sm text-slate-500">
          Markdown summary will appear after a run completes.
        </p>
      </section>
    );
  }

  const lines = markdown.split('\n');

  return (
    <section className="glass glow-border rounded-3xl p-6 animate-slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Report Preview</h2>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          .cache/regression-report.md
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/5 bg-black/30 p-5">
        {lines.map((line, index) => renderMarkdownLine(line, index))}
      </div>
    </section>
  );
}
