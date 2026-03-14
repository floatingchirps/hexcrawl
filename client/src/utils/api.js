const BASE = '/api';

function getToken() {
  return sessionStorage.getItem('hc_token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

function mapParam(mapOwner) {
  return mapOwner && mapOwner !== 'shared' ? `?map=${mapOwner}` : '';
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

export async function fetchHexes(mapOwner) {
  return fetchJSON(`${BASE}/hexes${mapParam(mapOwner)}`, { headers: authHeaders() });
}

export async function fetchHex(label, mapOwner) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}${mapParam(mapOwner)}`, { headers: authHeaders() });
}

export async function updateHex(label, updates, mapOwner) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}${mapParam(mapOwner)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
}

export async function fetchHexHistory(label, mapOwner) {
  return fetchJSON(`${BASE}/hexes/${encodeURIComponent(label)}/history${mapParam(mapOwner)}`, { headers: authHeaders() });
}

export async function fetchMeta(mapOwner) {
  return fetchJSON(`${BASE}/meta${mapParam(mapOwner)}`, { headers: authHeaders() });
}

export async function updateMeta(updates, mapOwner) {
  return fetchJSON(`${BASE}/meta${mapParam(mapOwner)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
}

export async function addRing(mapOwner) {
  return fetchJSON(`${BASE}/rings/add${mapParam(mapOwner)}`, { method: 'POST', headers: authHeaders() });
}

export async function removeRing(confirm = false, mapOwner) {
  return fetchJSON(`${BASE}/rings/remove${mapParam(mapOwner)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ confirm })
  });
}

export async function exportJSON(mapOwner) {
  const res = await fetch(`${BASE}/export/json${mapParam(mapOwner)}`, { headers: authHeaders() });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hexcrawl-${mapOwner || 'shared'}.json`; a.click();
  URL.revokeObjectURL(url);
}

export async function resetMap(mapOwner) {
  return fetchJSON(`${BASE}/reset${mapParam(mapOwner)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
}
