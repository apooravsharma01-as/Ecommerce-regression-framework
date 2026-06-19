const API_BASE = '/api';

async function parseJsonResponse(res) {

    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch {
        const hint =
            text.includes('<!DOCTYPE')
                ? 'API server may be outdated — stop dashboard (Ctrl+C) and run: npm run dashboard'
                : 'Invalid response from API';

        throw new Error(
            `${hint} (HTTP ${res.status})`
        );
    }
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return parseJsonResponse(res);
}

export async function fetchDomains() {
  const res = await fetch(`${API_BASE}/domains`);
  if (!res.ok) throw new Error('Failed to load domains');
  return parseJsonResponse(res);
}

export async function fetchLatestReport() {
  const res = await fetch(`${API_BASE}/report/latest`);
  if (!res.ok) return null;
  return parseJsonResponse(res);
}

export async function fetchJobs() {
  const res = await fetch(`${API_BASE}/regression/jobs`);
  return parseJsonResponse(res);
}

export async function fetchJob(id) {
  const res = await fetch(`${API_BASE}/regression/jobs/${id}`);
  if (!res.ok) throw new Error('Job not found');
  return parseJsonResponse(res);
}

export async function fetchEvidenceSummary(live = false) {
  const query = live ? '?live=1' : '';
  const res = await fetch(`${API_BASE}/evidence/summary${query}`);
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Evidence API not found — restart dashboard (Ctrl+C then npm run dashboard)'
        : 'Failed to load evidence'
    );
  }
  return parseJsonResponse(res);
}

export async function generateAllureReport() {
  const res = await fetch(`${API_BASE}/allure/generate`, {
    method: 'POST'
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || 'Failed to generate Allure');
  return data;
}

export async function openAllureReport() {
  const res = await fetch(`${API_BASE}/allure/open`, {
    method: 'POST'
  });

  let data = {};

  try {
    data = await parseJsonResponse(res);
  } catch {
    return { browserUrl: '/reports/allure/index.html' };
  }

  if (!res.ok && !data.browserUrl) {
    return { browserUrl: '/reports/allure/index.html' };
  }

  return data;
}

export async function runRegression(payload) {
  const res = await fetch(`${API_BASE}/regression/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data.error || 'Failed to start regression');
  }

  return data;
}
