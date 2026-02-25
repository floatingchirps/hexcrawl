const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const PLAYER_PASSWORD = process.env.PLAYER_PASSWORD || 'player123';
const DM_PASSWORD = process.env.DM_PASSWORD || 'dm456';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

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
    res.json(await db.getAllHexes(isDM));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/hexes/:label
app.get('/api/hexes/:label', async (req, res) => {
  try {
    const isDM = getRole(req) === 'dm';
    const hex = await db.getHex(req.params.label, isDM);
    if (!hex) return res.status(404).json({ error: 'Not found' });
    res.json(hex);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/hexes/:label
app.put('/api/hexes/:label', requireAuth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.role !== 'dm') delete updates.secrets;
    res.json(await db.updateHex(req.params.label, updates));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/hexes/:label/history
app.get('/api/hexes/:label/history', async (req, res) => {
  try {
    res.json(await db.getHexHistory(req.params.label));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/meta
app.get('/api/meta', async (req, res) => {
  try {
    res.json(await db.getMeta());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/meta
app.put('/api/meta', requireAuth, async (req, res) => {
  try {
    await db.setMeta(req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/rings/add
app.post('/api/rings/add', requireAuth, async (req, res) => {
  try {
    res.json({ ring_count: await db.addRing() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/rings/remove
app.post('/api/rings/remove', requireDM, async (req, res) => {
  try {
    res.json(await db.removeOuterRing(req.body.confirm === true));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/json
app.get('/api/export/json', async (req, res) => {
  try {
    const data = await db.exportJSON();
    res.setHeader('Content-Disposition', 'attachment; filename=hexcrawl.json');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/csv
app.get('/api/export/csv', async (req, res) => {
  try {
    const csv = await db.exportCSV();
    res.setHeader('Content-Disposition', 'attachment; filename=hexcrawl.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/import/json
app.post('/api/import/json', requireDM, async (req, res) => {
  try {
    await db.importJSON(req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fallback to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server — initialise DB schema first, then listen
db.initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`HexCrawl running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
