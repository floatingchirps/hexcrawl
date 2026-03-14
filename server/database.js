const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// --- Schema setup ---
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS hexes (
      label TEXT,
      map_owner TEXT DEFAULT 'shared',
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
      npcs TEXT DEFAULT '[]',
      explored INTEGER DEFAULT 0,
      ring INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      updated_at TEXT DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      PRIMARY KEY (label, map_owner)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hex_history (
      id SERIAL PRIMARY KEY,
      hex_label TEXT,
      map_owner TEXT DEFAULT 'shared',
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

  // Migration: if table exists with old single-column PK, add map_owner
  try {
    const hasCol = await queryOne(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'hexes' AND column_name = 'map_owner'`
    );
    if (!hasCol) {
      await query(`ALTER TABLE hexes ADD COLUMN map_owner TEXT DEFAULT 'shared'`);
      await query(`ALTER TABLE hexes DROP CONSTRAINT hexes_pkey`);
      await query(`ALTER TABLE hexes ADD PRIMARY KEY (label, map_owner)`);
      await query(`ALTER TABLE hex_history ADD COLUMN map_owner TEXT DEFAULT 'shared'`);
    }
  } catch (_) { /* column already exists or table was created with it */ }

  // Migration: add npcs column if not exists
  try {
    await query(`ALTER TABLE hexes ADD COLUMN IF NOT EXISTS npcs TEXT DEFAULT '[]'`);
  } catch (_) { /* already exists */ }

  // Defaults for shared map
  await query(`INSERT INTO map_meta (key, value) VALUES ('current_ring_count', '0') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('onboarding_complete', '0') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('map_name', 'Untitled Campaign') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('last_updated', '') ON CONFLICT (key) DO NOTHING`);

  // Defaults for DM map
  await query(`INSERT INTO map_meta (key, value) VALUES ('dm_current_ring_count', '4') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('dm_onboarding_complete', '1') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('dm_map_name', 'DM Map') ON CONFLICT (key) DO NOTHING`);
  await query(`INSERT INTO map_meta (key, value) VALUES ('dm_last_updated', '') ON CONFLICT (key) DO NOTHING`);

  // Seed shared map if empty
  const sharedCount = await queryOne(`SELECT COUNT(*) as c FROM hexes WHERE map_owner = 'shared'`);
  if (parseInt(sharedCount.c) === 0) {
    await seedMap('shared', 4);
  }

  // Seed DM map if empty
  const dmCount = await queryOne(`SELECT COUNT(*) as c FROM hexes WHERE map_owner = 'dm'`);
  if (parseInt(dmCount.c) === 0) {
    await seedMap('dm', 4);
  }
}

async function seedMap(mapOwner, rings) {
  await query(
    `INSERT INTO hexes (label, map_owner, ring, explored, status) VALUES ($1, $2, 0, 0, 'unknown') ON CONFLICT (label, map_owner) DO NOTHING`,
    ['0', mapOwner]
  );
  for (let i = 1; i <= rings; i++) {
    await ensureHexesExistForRing(i, mapOwner);
  }
  const prefix = mapOwner === 'dm' ? 'dm_' : '';
  await query(
    `INSERT INTO map_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
    [`${prefix}current_ring_count`, String(rings)]
  );
}

// --- Hex coordinate generation ---
function getRingHexesWithLabels(ringNum) {
  if (ringNum === 0) return [{ q: 0, r: 0, label: '0' }];
  const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
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

async function ensureHexesExistForRing(ringNum, mapOwner = 'shared') {
  const hexes = getRingHexesWithLabels(ringNum);
  for (const h of hexes) {
    await query(
      `INSERT INTO hexes (label, map_owner, ring, explored, status) VALUES ($1, $2, $3, 0, 'unknown') ON CONFLICT (label, map_owner) DO NOTHING`,
      [h.label, mapOwner, ringNum]
    );
  }
}

// --- Meta helpers ---
function metaKey(key, mapOwner) {
  if (mapOwner === 'dm') return `dm_${key}`;
  return key;
}

async function getMeta(mapOwner = 'shared') {
  const rows = await query('SELECT * FROM map_meta');
  const meta = {};
  const prefix = mapOwner === 'dm' ? 'dm_' : '';
  rows.forEach(r => {
    if (mapOwner === 'dm') {
      if (r.key.startsWith('dm_')) {
        meta[r.key.slice(3)] = r.value;
      }
    } else {
      if (!r.key.startsWith('dm_')) {
        meta[r.key] = r.value;
      }
    }
  });
  return meta;
}

async function setMeta(updates, mapOwner = 'shared') {
  for (const [k, v] of Object.entries(updates)) {
    const key = metaKey(k, mapOwner);
    await query(
      `INSERT INTO map_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, String(v)]
    );
  }
}

// --- Hex CRUD ---

async function getAllHexes(isDM = false, mapOwner = 'shared') {
  const rows = await query('SELECT * FROM hexes WHERE map_owner = $1 ORDER BY ring, label', [mapOwner]);
  if (!isDM) return rows.map(r => { const c = { ...r }; delete c.secrets; return c; });
  return rows;
}

async function getHex(label, isDM = false, mapOwner = 'shared') {
  const row = await queryOne('SELECT * FROM hexes WHERE label = $1 AND map_owner = $2', [label, mapOwner]);
  if (!row) return null;
  if (!isDM) { const c = { ...row }; delete c.secrets; return c; }
  return row;
}

async function updateHex(label, updates, mapOwner = 'shared') {
  const existing = await queryOne('SELECT * FROM hexes WHERE label = $1 AND map_owner = $2', [label, mapOwner]);
  const now = new Date().toISOString();
  const merged = { explored: 1, ...updates };

  if (!existing) {
    const keys = Object.keys(merged);
    const vals = Object.values(merged);
    const cols = ['label', 'map_owner', ...keys, 'updated_at'].join(', ');
    const placeholders = ['$1', '$2', ...keys.map((_, i) => `$${i + 3}`), `$${keys.length + 3}`].join(', ');
    await query(
      `INSERT INTO hexes (${cols}) VALUES (${placeholders}) ON CONFLICT (label, map_owner) DO NOTHING`,
      [label, mapOwner, ...vals, now]
    );
  } else {
    for (const [field, newVal] of Object.entries(updates)) {
      const oldVal = existing[field];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        await query(
          `INSERT INTO hex_history (hex_label, map_owner, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`,
          [label, mapOwner, field, String(oldVal ?? ''), String(newVal ?? '')]
        );
      }
    }

    const setClauses = Object.keys(merged).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const vals = Object.values(merged);
    await query(
      `UPDATE hexes SET ${setClauses}, updated_at = $${vals.length + 1} WHERE label = $${vals.length + 2} AND map_owner = $${vals.length + 3}`,
      [...vals, now, label, mapOwner]
    );
  }

  // Touch last_updated so polling clients know to refresh
  await setMeta({ last_updated: now }, mapOwner);

  return getHex(label, true, mapOwner);
}

async function getHexHistory(label, mapOwner = 'shared') {
  return query('SELECT * FROM hex_history WHERE hex_label = $1 AND map_owner = $2 ORDER BY changed_at DESC', [label, mapOwner]);
}

// --- Ring management ---

async function addRing(mapOwner = 'shared') {
  const meta = await getMeta(mapOwner);
  const currentRing = parseInt(meta.current_ring_count || '0');
  const newRing = currentRing + 1;
  await ensureHexesExistForRing(newRing, mapOwner);
  await setMeta({ current_ring_count: String(newRing) }, mapOwner);
  return newRing;
}

async function removeOuterRing(confirm = false, mapOwner = 'shared') {
  const meta = await getMeta(mapOwner);
  const currentRing = parseInt(meta.current_ring_count || '0');
  if (currentRing <= 0) return { error: 'No rings to remove' };

  const populated = await queryOne(
    `SELECT COUNT(*) as count FROM hexes WHERE ring = $1 AND map_owner = $2 AND (terrain IS NOT NULL OR poi_type IS NOT NULL OR explored = 1)`,
    [currentRing, mapOwner]
  );

  if (!confirm) {
    return { populated_count: parseInt(populated.count), ring: currentRing, needs_confirm: parseInt(populated.count) > 0 };
  }

  await query('DELETE FROM hexes WHERE ring = $1 AND map_owner = $2', [currentRing, mapOwner]);
  await setMeta({ current_ring_count: String(currentRing - 1) }, mapOwner);
  return { ok: true, removed_ring: currentRing };
}

// --- Export / Import / Reset ---

async function exportJSON(mapOwner = 'shared') {
  return {
    hexes: await query('SELECT * FROM hexes WHERE map_owner = $1', [mapOwner]),
    history: await query('SELECT * FROM hex_history WHERE map_owner = $1', [mapOwner]),
    meta: await getMeta(mapOwner),
  };
}

async function exportCSV(mapOwner = 'shared') {
  const hexes = await query('SELECT * FROM hexes WHERE map_owner = $1', [mapOwner]);
  if (!hexes.length) return '';
  const headers = Object.keys(hexes[0]);
  const rows = hexes.map(h => headers.map(k => JSON.stringify(h[k] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

async function importJSON(data, mapOwner = 'shared') {
  await query('DELETE FROM hexes WHERE map_owner = $1', [mapOwner]);
  await query('DELETE FROM hex_history WHERE map_owner = $1', [mapOwner]);

  if (data.hexes) {
    for (const h of data.hexes) {
      h.map_owner = mapOwner;
      const keys = Object.keys(h);
      const vals = Object.values(h);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      await query(`INSERT INTO hexes (${cols}) VALUES (${placeholders}) ON CONFLICT (label, map_owner) DO NOTHING`, vals);
    }
  }
  if (data.meta) await setMeta(data.meta, mapOwner);
}

async function resetMap(mapOwner = 'shared') {
  await query('DELETE FROM hexes WHERE map_owner = $1', [mapOwner]);
  await query('DELETE FROM hex_history WHERE map_owner = $1', [mapOwner]);

  // Re-seed
  const defaults = mapOwner === 'dm'
    ? { current_ring_count: '4', onboarding_complete: '1', map_name: 'DM Map' }
    : { current_ring_count: '4', onboarding_complete: '0', map_name: 'Untitled Campaign' };
  await setMeta(defaults, mapOwner);

  await seedMap(mapOwner, 4);
}

module.exports = {
  initSchema,
  getAllHexes, getHex, updateHex, getHexHistory,
  getMeta, setMeta, addRing, removeOuterRing,
  exportJSON, exportCSV, importJSON, resetMap,
};
