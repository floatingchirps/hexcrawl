const { Pool } = require('pg');

// Railway provides DATABASE_URL automatically when you add a Postgres plugin
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Run a query and return rows
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Run a query and return the first row only
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// --- Schema setup ---
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS hexes (
      label TEXT PRIMARY KEY,
      terrain TEXT,
      poi_type TEXT,
      poi_name TEXT,
      features TEXT DEFAULT '[]',
      dangers TEXT DEFAULT '[]',
      factions TEXT DEFAULT '[]',
      resources TEXT DEFAULT '{"types":[],"notes":""}',
      rumors TEXT DEFAULT '[]',
      history_lore TEXT DEFAULT '',
      status TEXT DEFAULT 'unknown',
      notes TEXT DEFAULT '',
      secrets TEXT DEFAULT '',
      explored INTEGER DEFAULT 0,
      ring INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      updated_at TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hex_history (
      id SERIAL PRIMARY KEY,
      hex_label TEXT,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS map_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Insert defaults if not present
  await query(`INSERT INTO map_meta (key, value) VALUES ('current_ring_count', '0') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('onboarding_complete', '0') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('map_name', 'Untitled Campaign') ON CONFLICT (key) DO NOTHING`);

  // Seed initial hexes if empty
  const count = await queryOne('SELECT COUNT(*) as c FROM hexes');
  if (parseInt(count.c) === 0) {
    await query(`INSERT INTO hexes (label, ring, explored, status) VALUES ('0', 0, 0, 'unknown') ON CONFLICT DO NOTHING`);
    for (let i = 1; i <= 4; i++) {
      await ensureHexesExistForRing(i);
    }
    await query(`UPDATE map_meta SET value = '4' WHERE key = 'current_ring_count'`);
  }
}

// --- Hex coordinate generation (same logic as before) ---
function getRingHexesWithLabels(ringNum) {
  if (ringNum === 0) return [{ q: 0, r: 0, label: '0' }];
  const directions = [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]];
  const cornerLabels = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
  let q = 0, r = -ringNum;
  const hexes = [];
  const usedLabels = new Map();
  for (let side = 0; side < 6; side++) {
    const baseDir = cornerLabels[side];
    for (let step = 0; step < ringNum; step++) {
      let label;
      if (step === 0) {
        label = `${baseDir}${ringNum}`;
      } else {
        const key = `${baseDir}${ringNum}`;
        const c = (usedLabels.get(key) || 0) + 1;
        usedLabels.set(key, c);
        label = `${baseDir}${ringNum}-${c}`;
      }
      hexes.push({ q, r, label });
      q += directions[side][0];
      r += directions[side][1];
    }
  }
  return hexes;
}

async function ensureHexesExistForRing(ringNum) {
  const hexes = getRingHexesWithLabels(ringNum);
  for (const h of hexes) {
    await query(
      `INSERT INTO hexes (label, ring, explored, status) VALUES ($1, $2, 0, 'unknown') ON CONFLICT (label) DO NOTHING`,
      [h.label, ringNum]
    );
  }
}

// --- Public API ---

async function getAllHexes(isDM = false) {
  const rows = await query('SELECT * FROM hexes ORDER BY ring, label');
  if (!isDM) return rows.map(r => { const c = { ...r }; delete c.secrets; return c; });
  return rows;
}

async function getHex(label, isDM = false) {
  const row = await queryOne('SELECT * FROM hexes WHERE label = $1', [label]);
  if (!row) return null;
  if (!isDM) { const c = { ...row }; delete c.secrets; return c; }
  return row;
}

async function updateHex(label, updates) {
  const existing = await queryOne('SELECT * FROM hexes WHERE label = $1', [label]);

  const now = new Date().toISOString();

  if (!existing) {
    const keys = Object.keys(updates);
    const vals = Object.values(updates);
    const cols = ['label', ...keys, 'updated_at', 'explored'].join(', ');
    const placeholders = ['$1', ...keys.map((_, i) => `$${i + 2}`), `$${keys.length + 2}`, `$${keys.length + 3}`].join(', ');
    await query(
      `INSERT INTO hexes (${cols}) VALUES (${placeholders}) ON CONFLICT (label) DO NOTHING`,
      [label, ...vals, now, 1]
    );
  } else {
    // Log history for changed fields
    for (const [field, newVal] of Object.entries(updates)) {
      const oldVal = existing[field];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        await query(
          `INSERT INTO hex_history (hex_label, field_name, old_value, new_value) VALUES ($1, $2, $3, $4)`,
          [label, field, String(oldVal ?? ''), String(newVal ?? '')]
        );
      }
    }

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const vals = Object.values(updates);
    await query(
      `UPDATE hexes SET ${setClauses}, updated_at = $${vals.length + 1}, explored = 1 WHERE label = $${vals.length + 2}`,
      [...vals, now, label]
    );
  }

  return getHex(label, true);
}

async function getHexHistory(label) {
  return query('SELECT * FROM hex_history WHERE hex_label = $1 ORDER BY changed_at DESC', [label]);
}

async function getMeta() {
  const rows = await query('SELECT * FROM map_meta');
  const meta = {};
  rows.forEach(r => meta[r.key] = r.value);
  return meta;
}

async function setMeta(updates) {
  for (const [k, v] of Object.entries(updates)) {
    await query(
      `INSERT INTO map_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
      [k, String(v)]
    );
  }
}

async function addRing() {
  const meta = await getMeta();
  const currentRing = parseInt(meta.current_ring_count || '0');
  const newRing = currentRing + 1;
  await ensureHexesExistForRing(newRing);
  await setMeta({ current_ring_count: String(newRing) });
  return newRing;
}

async function removeOuterRing(confirm = false) {
  const meta = await getMeta();
  const currentRing = parseInt(meta.current_ring_count || '0');
  if (currentRing <= 0) return { error: 'No rings to remove' };

  const populated = await queryOne(
    `SELECT COUNT(*) as count FROM hexes WHERE ring = $1 AND (terrain IS NOT NULL OR poi_type IS NOT NULL OR explored = 1)`,
    [currentRing]
  );

  if (!confirm) {
    return { populated_count: parseInt(populated.count), ring: currentRing, needs_confirm: parseInt(populated.count) > 0 };
  }

  await query('DELETE FROM hexes WHERE ring = $1', [currentRing]);
  await setMeta({ current_ring_count: String(currentRing - 1) });
  return { ok: true, removed_ring: currentRing };
}

async function exportJSON() {
  return {
    hexes: await query('SELECT * FROM hexes'),
    history: await query('SELECT * FROM hex_history'),
    meta: await getMeta(),
  };
}

async function exportCSV() {
  const hexes = await query('SELECT * FROM hexes');
  if (!hexes.length) return '';
  const headers = Object.keys(hexes[0]);
  const rows = hexes.map(h => headers.map(k => JSON.stringify(h[k] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

async function importJSON(data) {
  await query('DELETE FROM hexes');
  await query('DELETE FROM hex_history');
  await query('DELETE FROM map_meta');

  if (data.hexes) {
    for (const h of data.hexes) {
      const keys = Object.keys(h);
      const vals = Object.values(h);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      await query(`INSERT INTO hexes (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
    }
  }
  if (data.meta) await setMeta(data.meta);
}

module.exports = {
  initSchema,
  getAllHexes, getHex, updateHex, getHexHistory,
  getMeta, setMeta, addRing, removeOuterRing,
  exportJSON, exportCSV, importJSON,
};
