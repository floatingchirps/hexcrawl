const BASE = '/api';

function getToken() {
  return sessionStorage.getItem('hc_token') || '';
}

function getRole() {
  return sessionStorage.getItem('hc_role') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function login(password) {
  const data = await fetchJSON(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  sessionStorage.setItem('hc_token', password);
  sessionStorage.setItem('hc_role', data.role);
  return data.role;
}

export function logout() {
  sessionStorage.removeItem('hc_token');
  sessionStorage.removeItem('hc_role');
}

export function getStoredRole() {
  return sessionStorage.getItem('hc_role');
}

export async function fetchHexes() {
  return fetchJSON(`${BASE}/hexes`, { headers: authHeaders() });
}

export async function fetchHex(label) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}`, { headers: authHeaders() });
}

export async function updateHex(label, updates) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
}

export async function fetchHexHistory(label) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}/history`, { headers: authHeaders() });
}

export async function fetchMeta() {
  return fetchJSON(`${BASE}/meta`, { headers: authHeaders() });
}

export async function updateMeta(updates) {
  return fetchJSON(`${BASE}/meta`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
}

export async function addRing() {
  return fetchJSON(`${BASE}/rings/add`, { method: 'POST', headers: authHeaders() });
}

export async function removeRing(confirm = false) {
  return fetchJSON(`${BASE}/rings/remove`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ confirm })
  });
}

export async function exportJSON() {
  const res = await fetch(`${BASE}/export/json`, { headers: authHeaders() });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'hexcrawl.json'; a.click();
  URL.revokeObjectURL(url);
}

export async function exportCSV() {
  const res = await fetch(`${BASE}/export/csv`, { headers: authHeaders() });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'hexcrawl.csv'; a.click();
  URL.revokeObjectURL(url);
}

export async function importJSONData(data) {
  return fetchJSON(`${BASE}/import/json`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
}
