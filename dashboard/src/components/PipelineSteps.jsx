import { PIPELINE_STEPS } from '../constants';

function stepStatus(index, activeStep, jobStatus, executionPassed) {

  const pipelineFailed =
    jobStatus === 'failed'
    || executionPassed === false;

  if (jobStatus === 'passed' && executionPassed !== false) {
    return 'done';
  }

  if (pipelineFailed && index <= activeStep) {
    return index < activeStep ? 'done' : 'error';
  }

  if (index < activeStep) return 'done';
  if (index === activeStep) return 'active';
  return 'pending';
}

export default function PipelineSteps({ activeStep, jobStatus, executionPassed }) {
  return (
    <section className="glass rounded-3xl p-6 animate-slide-up">
      <h2 className="mb-5 text-lg font-semibold text-white">
        Pipeline Progress
      </h2>

      <div className="grid gap-3 md:grid-cols-5">
        {PIPELINE_STEPS.map((step, index) => {
          const status = stepStatus(
            index,
            activeStep,
            jobStatus,
            executionPassed
          );

          return (
            <div
              key={step.id}
              className={`relative rounded-2xl border p-4 transition-all duration-500 ${
                status === 'active'
                  ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                  : status === 'done'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : status === 'error'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              {status === 'active' && (
                <div className="absolute inset-0 rounded-2xl shimmer" />
              )}

              <div className="relative">
                <div className="mb-2 text-2xl">{step.icon}</div>
                <p className="text-sm font-medium text-white">{step.label}</p>
                <p
                  className={`mt-1 text-xs font-semibold uppercase tracking-wider ${
                    status === 'active'
                      ? 'text-indigo-300'
                      : status === 'done'
                        ? 'text-emerald-400'
                        : status === 'error'
                          ? 'text-red-400'
                          : 'text-slate-500'
                  }`}
                >
                  {status === 'active'
                    ? 'Running'
                    : status === 'done'
                      ? 'Complete'
                      : status === 'error'
                        ? 'Failed'
                        : 'Waiting'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
