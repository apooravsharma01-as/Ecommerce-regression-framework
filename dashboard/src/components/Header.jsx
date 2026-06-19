export default function Header({ apiOnline, apiStale }) {
  return (
    <header className="animate-slide-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
              <svg
                viewBox="0 0 40 44"
                className="h-9 w-9"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 6V22C8 32.5 14.5 38 20 38C25.5 38 32 32.5 32 22V6"
                  stroke="white"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 animate-pulse-glow" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">
              Uniware Regression Agent
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Command Center
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Story → Impact → Generate → Execute → Report. One-click intelligent regression.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass rounded-full px-4 py-2 text-sm">
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                apiOnline ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            API {apiOnline ? 'Online' : 'Offline'}
          </div>
          <div className="glass rounded-full px-4 py-2 text-sm text-slate-300">
            Playwright + Allure
          </div>
          {apiStale && (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
              Restart dashboard (Ctrl+C → npm run dashboard)
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
