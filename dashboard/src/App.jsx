import { useCallback, useEffect, useState } from 'react';
import {
  fetchHealth,
  fetchJob,
  fetchJobs,
  fetchLatestReport,
  runRegression
} from './api';
import Header from './components/Header';
import ImpactView from './components/ImpactView';
import LogTerminal from './components/LogTerminal';
import PipelineSteps from './components/PipelineSteps';
import ReportPreview from './components/ReportPreview';
import RunHistory from './components/RunHistory';
import TestResults from './components/TestResults';
import TriggerPanel from './components/TriggerPanel';
import EvidencePanel from './components/EvidencePanel';

const INITIAL_FORM = {
  story: '',
  jira: '',
  pr: '',
  simulate: '',
  llm: false,
  git: false
};

function deriveActiveStep(logs, status) {
  const text = (logs || '').toLowerCase();

  if (status === 'passed' || status === 'failed') return 4;
  if (text.includes('markdown report') || text.includes('allure report')) return 4;
  if (text.includes('test execution') || text.includes('running ')) return 3;
  if (text.includes('regression selection')) return 2;
  if (text.includes('test generation')) return 1;
  if (text.includes('impact analysis')) return 0;
  if (status === 'running') return 1;

  return 0;
}

function buildPayload(form, analyzeOnly = false) {
  const payload = { analyzeOnly };

  if (form.story.trim()) payload.story = form.story.trim();
  if (form.jira.trim()) payload.jira = form.jira.trim();
  if (form.pr.trim()) payload.pr = form.pr.trim();
  if (form.simulate.trim()) payload.simulate = form.simulate.trim();
  if (form.llm) payload.llm = true;
  if (form.git) payload.git = true;

  return payload;
}

export default function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [running, setRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [report, setReport] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);

  const loadInitial = useCallback(async () => {
    try {
      await fetchHealth();
      setApiOnline(true);

      const latest = await fetchLatestReport();
      if (latest?.report) {
        setReport(latest.report);
        setMarkdown(latest.markdown);
      }

      const history = await fetchJobs();
      setJobs(history.jobs || []);
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const pollJob = useCallback(async (jobId) => {
    const data = await fetchJob(jobId);
    setJob(data);

    if (data.report) {
      setReport(data.report);
    }

    if (data.status === 'running' || data.status === 'queued') {
      return false;
    }

    setRunning(false);

    const latest = await fetchLatestReport();
    if (latest?.report) {
      setReport(latest.report);
      setMarkdown(latest.markdown);
    }

    const history = await fetchJobs();
    setJobs(history.jobs || []);

    return true;
  }, []);

  useEffect(() => {
    if (!activeJobId || !running) return undefined;

    const interval = setInterval(async () => {
      try {
        const done = await pollJob(activeJobId);
        if (done) clearInterval(interval);
      } catch (err) {
        setError(err.message);
        setRunning(false);
        clearInterval(interval);
      }
    }, 1500);

    pollJob(activeJobId);

    return () => clearInterval(interval);
  }, [activeJobId, running, pollJob]);

  const startRun = async (analyzeOnly = false) => {
    setError(null);

    try {
      const result = await runRegression(
        buildPayload(form, analyzeOnly)
      );

      setRunning(true);
      setActiveJobId(result.id);
      setJob({ id: result.id, status: 'running', logs: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const selectJob = async (jobId) => {
    setError(null);
    setActiveJobId(jobId);

    try {
      const data = await fetchJob(jobId);
      setJob(data);
      if (data.report) setReport(data.report);

      const latest = await fetchLatestReport();
      if (latest?.markdown) setMarkdown(latest.markdown);
    } catch (err) {
      setError(err.message);
    }
  };

  const activeStep = deriveActiveStep(
    job?.logs,
    job?.status
  );

  return (
    <div className="bg-mesh min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Header apiOnline={apiOnline} />

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-slide-up">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <TriggerPanel
              form={form}
              setForm={setForm}
              running={running}
              onRun={() => startRun(false)}
              onAnalyze={() => startRun(true)}
            />
            <RunHistory
              jobs={jobs}
              activeJobId={activeJobId}
              onSelect={selectJob}
            />
            <EvidencePanel
              report={report}
              jobStatus={job?.status}
            />
          </div>

          <div className="space-y-6 lg:col-span-7">
            <PipelineSteps
              activeStep={activeStep}
              jobStatus={job?.status}
            />
            <LogTerminal
              logs={job?.logs}
              visible={running || Boolean(job?.logs)}
            />
            <ImpactView report={report} />
            <TestResults report={report} job={job} />
            <ReportPreview markdown={markdown} />
          </div>
        </div>

        <footer className="mt-10 pb-6 text-center text-xs text-slate-600">
          Regression Agent · Impact → Generate → Execute → Report
        </footer>
      </div>
    </div>
  );
}
