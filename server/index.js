try { require('dotenv').config(); } catch (_) { /* not needed on Vercel */ }
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const PLAYER_PASSWORD = process.env.PLAYER_PASSWORD || 'player123';
const DM_PASSWORD = process.env.DM_PASSWORD || 'dm456';

// Kick off schema init immediately; requests will await this before proceeding
const schemaReady = db.initSchema().catch(err => {
  console.error('Failed to initialise database:', err);
  if (require.main === module) process.exit(1);
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Ensure DB schema is ready before any request is handled
app.use(async (req, res, next) => {
  try { await schemaReady; next(); }
  catch (e) { res.status(500).json({ error: 'Database not ready' }); }
});

// Auth middleware
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token === DM_PASSWORD) { req.role = 'dm'; return next(); }
  if (token === PLAYER_PASSWORD) { req.role = 'player'; return next(); }
  return res.status(401).json({ error: 'Unauthorized' });
}

function requireDM(req, res, next) {
  requireAuth(req, res, () => {
    if (req.role !== 'dm') return res.status(403).json({ error: 'DM only' });
    next();
  });
}

function getRole(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token === DM_PASSWORD) return 'dm';
  if (token === PLAYER_PASSWORD) return 'player';
  return null;
}

// Helper: get map_owner from query param, enforce DM-only access for 'dm' map
function getMapOwner(req) {
  const map = req.query.map || 'shared';
  return map === 'dm' ? 'dm' : 'shared';
}

// POST /api/auth
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === DM_PASSWORD) return res.json({ role: 'dm' });
  if (password === PLAYER_PASSWORD) return res.json({ role: 'player' });
  return res.status(401).json({ error: 'Invalid password' });
});

// GET /api/hexes
app.get('/api/hexes', async (req, res) => {
  try {
    const isDM = getRole(req) === 'dm';
    const mapOwner = getMapOwner(req);
    // Only DM can access DM map
    if (mapOwner === 'dm' && !isDM) return res.status(403).json({ error: 'DM only' });
    res.json(await db.getAllHexes(isDM, mapOwner));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/hexes/:label
app.get('/api/hexes/:label', async (req, res) => {
  try {
    const isDM = getRole(req) === 'dm';
    const mapOwner = getMapOwner(req);
    if (mapOwner === 'dm' && !isDM) return res.status(403).json({ error: 'DM only' });
    const hex = await db.getHex(req.params.label, isDM, mapOwner);
    if (!hex) return res.status(404).json({ error: 'Not found' });
    res.json(hex);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/hexes/:label
app.put('/api/hexes/:label', requireAuth, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    if (mapOwner === 'dm' && req.role !== 'dm') return res.status(403).json({ error: 'DM only' });
    const updates = { ...req.body };
    if (req.role !== 'dm') delete updates.secrets;
    res.json(await db.updateHex(req.params.label, updates, mapOwner));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/hexes/:label/history
app.get('/api/hexes/:label/history', async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    res.json(await db.getHexHistory(req.params.label, mapOwner));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/meta
app.get('/api/meta', async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    res.json(await db.getMeta(mapOwner));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/meta
app.put('/api/meta', requireAuth, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    if (mapOwner === 'dm' && req.role !== 'dm') return res.status(403).json({ error: 'DM only' });
    await db.setMeta(req.body, mapOwner);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/rings/add
app.post('/api/rings/add', requireAuth, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    if (mapOwner === 'dm' && req.role !== 'dm') return res.status(403).json({ error: 'DM only' });
    res.json({ ring_count: await db.addRing(mapOwner) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/rings/remove
app.post('/api/rings/remove', requireDM, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    res.json(await db.removeOuterRing(req.body.confirm === true, mapOwner));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/json
app.get('/api/export/json', async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    const data = await db.exportJSON(mapOwner);
    res.setHeader('Content-Disposition', `attachment; filename=hexcrawl-${mapOwner}.json`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/csv
app.get('/api/export/csv', async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    const csv = await db.exportCSV(mapOwner);
    res.setHeader('Content-Disposition', `attachment; filename=hexcrawl-${mapOwner}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/import/json
app.post('/api/import/json', requireDM, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    await db.importJSON(req.body, mapOwner);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/reset (DM only)
app.post('/api/reset', requireDM, async (req, res) => {
  try {
    const mapOwner = getMapOwner(req);
    await db.resetMap(mapOwner);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fallback to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Local dev: listen on PORT. Vercel imports this as a module, so skip listen there.
if (require.main === module) {
  schemaReady.then(() => {
    app.listen(PORT, () => console.log(`HexCrawl running on port ${PORT}`));
  });
}

module.exports = app;
