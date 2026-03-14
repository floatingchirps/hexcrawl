import React, { useState, useEffect, useRef } from 'react';
import { TERRAIN_COLORS, TERRAIN_LIST, STATUS_COLORS, POI_TYPES } from '../utils/hexGeometry';
import { updateHex, fetchHexHistory } from '../utils/api';
import POIIcon from './POIIcons';

const RESOURCE_TYPES = ['Herbs', 'Ore/Metal', 'Lumber', 'Fresh Water', 'Game/Hunting', 'Fish', 'Stone', 'Rare Materials'];
const DANGER_CATEGORIES = ['Environment', 'Creatures', 'People', 'Magical'];
const DANGER_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Deadly'];
const SEVERITY_COLORS = { Minor: '#D4A017', Moderate: '#D48A17', Severe: '#C44A20', Deadly: '#8B2020' };
const EDGE_LABELS = ['Right', 'Bottom-Right', 'Bottom-Left', 'Left', 'Top-Left', 'Top-Right'];

function Panel({ title, onClose, children, isDMPanel, extraStyle }) {
  return (
    <div style={{
      ...styles.panel,
      background: isDMPanel ? '#2A1A0A' : 'var(--parchment)',
      color: isDMPanel ? '#E8D9BC' : 'var(--ink)',
      border: isDMPanel ? '2px solid #D4A017' : '2px solid var(--ink-faded)',
      ...extraStyle,
    }}>
      <div style={styles.panelHeader}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {isDMPanel && '🔒 '}{title}
        </span>
        <button onClick={onClose} style={{ ...styles.closeBtn, color: isDMPanel ? '#D4A017' : 'var(--ink)' }}>✕</button>
      </div>
      <div style={styles.panelBody}>{children}</div>
    </div>
  );
}

export default function HexEditPanel({ hexLabel, hexData, panelType, onClose, onSave, role, mapOwner, isMobile }) {
  const panelExtra = isMobile ? { minWidth: 'unset', maxWidth: 'unset', width: '100%', borderRadius: '12px 12px 0 0', boxShadow: 'none', border: 'none', borderTop: '2px solid var(--gold)' } : {};
  const [data, setData] = useState(hexData || {});
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  // All panel-specific state must be declared unconditionally (Rules of Hooks)
  const [newDanger, setNewDanger] = useState({ category: 'Environment', severity: 'Minor', details: '' });
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionColor, setNewFactionColor] = useState('#8B6914');
  const [newRumor, setNewRumor] = useState('');
  const [lore, setLore] = useState('');
  const [loreTab, setLoreTab] = useState('edit');
  const [notes, setNotes] = useState('');
  const [secrets, setSecrets] = useState('');
  const [newNPC, setNewNPC] = useState({ name: '', species: '', type: 'Humanoid', disposition: 'Neutral', details: '' });
  const [newEvent, setNewEvent] = useState({ session: '', text: '' });
  const [featureType, setFeatureType] = useState('road');
  const [pendingCorner, setPendingCorner] = useState(null);
  const poiSaveTimerRef = useRef(null);

  useEffect(() => {
    setData(hexData || {});
    // Reset panel-specific state when hex or panel changes
    setLore(hexData?.history_lore || '');
    setNotes(hexData?.notes || '');
    setSecrets(hexData?.secrets || '');
    setNewDanger({ category: 'Environment', severity: 'Minor', details: '' });
    setNewFactionName('');
    setNewRumor('');
    setNewNPC({ name: '', species: '', type: 'Humanoid', disposition: 'Neutral', details: '' });
    setNewEvent({ session: '', text: '' });
    setLoreTab('edit');
    setPendingCorner(null);
  }, [hexData, hexLabel, panelType]);

  async function save(updates) {
    setSaving(true);
    try {
      const merged = { ...updates, explored: 1 };
      const result = await updateHex(hexLabel, merged, mapOwner);
      onSave(result);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    const h = await fetchHexHistory(hexLabel, mapOwner);
    setHistory(h);
    setActiveTab('history');
  }

  function parseJSON(val, fallback) {
    try { return JSON.parse(val || JSON.stringify(fallback)); } catch { return fallback; }
  }

  // ---- Terrain ----
  if (panelType === 'terrain') {
    return (
      <Panel title="Terrain" onClose={onClose} extraStyle={panelExtra}>
        <div style={styles.terrainGrid}>
          {TERRAIN_LIST.map(t => (
            <button key={t} onClick={() => save({ terrain: t })}
              style={{
                ...styles.terrainBtn,
                background: TERRAIN_COLORS[t],
                border: data.terrain === t ? '3px solid var(--gold)' : '2px solid var(--ink-faded)',
                fontWeight: data.terrain === t ? 700 : 400,
              }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- POI ----
  if (panelType === 'poi') {
    return (
      <Panel title="Point of Interest" onClose={onClose} extraStyle={panelExtra}>
        <input
          placeholder="POI name (optional)"
          value={data.poi_name || ''}
          onChange={e => {
            const name = e.target.value;
            setData(d => ({ ...d, poi_name: name }));
            clearTimeout(poiSaveTimerRef.current);
            poiSaveTimerRef.current = setTimeout(() => {
              save({ poi_name: name });
            }, 600);
          }}
          style={styles.input}
        />
        <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
          {Object.entries(POI_TYPES).map(([cat, types]) => (
            <div key={cat}>
              <div style={styles.catLabel}>{cat}</div>
              <div style={styles.poiGrid}>
                {types.map(t => (
                  <button key={t}
                    onClick={() => save({ poi_type: t, poi_name: data.poi_name || '' })}
                    style={{
                      ...styles.poiBtn,
                      border: data.poi_type === t ? '2px solid var(--gold)' : '1.5px solid var(--ink-faded)',
                    }}>
                    <POIIcon type={t} size={18} />
                    <span style={{ fontSize: 10 }}>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => save({ poi_type: null, poi_name: null })} style={styles.clearBtn}>
          Clear POI
        </button>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Features ----
  if (panelType === 'features') {
    const features = parseJSON(data.features, []);
    const FEATURE_COLORS = { road: '#A0897A', river: '#7AACCF', trail: '#8B6914', wall: '#3D2B1F' };
    const FEATURE_DASHES = { trail: '4,3' };
    const FEATURE_WIDTHS = { road: 2.5, river: 2.5, trail: 1.5, wall: 3 };
    const CORNER_LABELS = ['R', 'BR', 'BL', 'L', 'TL', 'TR'];
    const CORNER_NAMES = ['Right', 'Bot-Right', 'Bot-Left', 'Left', 'Top-Left', 'Top-Right'];
    // Label offsets relative to each corner: [dx, dy, textAnchor]
    const LABEL_OFF = [
      [13, 4, 'start'], [10, 14, 'start'], [-10, 14, 'end'],
      [-13, 4, 'end'], [-10, -10, 'end'], [10, -10, 'start'],
    ];

    // Mini hex geometry — flat-top, corner 0 at right (0°)
    const HCX = 75, HCY = 65, HR = 46;
    const mc = Array.from({ length: 6 }, (_, i) => [
      HCX + HR * Math.cos((Math.PI / 180) * 60 * i),
      HCY + HR * Math.sin((Math.PI / 180) * 60 * i),
    ]);
    const miniHexPts = mc.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    function tapCorner(idx) {
      if (pendingCorner === null) { setPendingCorner(idx); return; }
      if (pendingCorner === idx) { setPendingCorner(null); return; }
      const newF = { type: featureType, from: pendingCorner, to: idx, id: Date.now() };
      save({ features: JSON.stringify([...features, newF]) });
      setPendingCorner(null);
    }

    function miniPath(f) {
      if (f.from === undefined || f.to === undefined) return null;
      const [x1, y1] = mc[f.from], [x2, y2] = mc[f.to];
      return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${HCX},${HCY} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    }

    const activeColor = FEATURE_COLORS[featureType] || '#8B6914';

    return (
      <Panel title="Features" onClose={onClose} extraStyle={panelExtra}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {Object.keys(FEATURE_COLORS).map(t => (
            <button key={t} onClick={() => { setFeatureType(t); setPendingCorner(null); }} style={{
              flex: 1, padding: '5px 2px', borderRadius: 3, fontSize: 9,
              fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', cursor: 'pointer',
              textTransform: 'capitalize', textAlign: 'center',
              background: featureType === t ? FEATURE_COLORS[t] : 'var(--parchment-light)',
              color: featureType === t ? 'white' : 'var(--ink)',
              border: `1.5px solid ${featureType === t ? FEATURE_COLORS[t] : 'var(--ink-faded)'}`,
            }}>{t}</button>
          ))}
        </div>

        {/* Visual hex corner picker */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <svg width="150" height="130" viewBox="0 0 150 130" style={{ overflow: 'visible' }}>
            <polygon points={miniHexPts} fill="var(--parchment-light)" stroke="var(--ink-faded)" strokeWidth="1.5" />
            {/* Existing features */}
            {features.map((f, i) => {
              const p = miniPath(f);
              if (!p) return null;
              return <path key={f.id || i} d={p}
                stroke={FEATURE_COLORS[f.type] || '#888'}
                strokeWidth={FEATURE_WIDTHS[f.type] || 2}
                strokeDasharray={FEATURE_DASHES[f.type]}
                fill="none" strokeLinecap="round" />;
            })}
            {/* Pending line preview */}
            {pendingCorner !== null && (
              <circle cx={mc[pendingCorner][0]} cy={mc[pendingCorner][1]} r={8}
                fill={activeColor} opacity={0.25} />
            )}
            {/* Corner dots */}
            {mc.map(([x, y], i) => (
              <g key={i} onClick={() => tapCorner(i)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={11} fill="transparent" />
                <circle cx={x} cy={y} r={5}
                  fill={pendingCorner === i ? activeColor : 'var(--parchment)'}
                  stroke={pendingCorner === i ? activeColor : 'var(--ink-faded)'}
                  strokeWidth="1.5" />
                <text x={x + LABEL_OFF[i][0]} y={y + LABEL_OFF[i][1]}
                  textAnchor={LABEL_OFF[i][2]} fontSize="7"
                  fill="var(--ink-light)" fontFamily="var(--font-heading)"
                  style={{ pointerEvents: 'none' }}>{CORNER_LABELS[i]}</text>
              </g>
            ))}
          </svg>
        </div>

        <p style={{ fontSize: 10, textAlign: 'center', fontStyle: 'italic', marginBottom: 10,
          color: pendingCorner !== null ? activeColor : 'var(--ink-light)' }}>
          {pendingCorner !== null
            ? `${CORNER_NAMES[pendingCorner]} — tap another corner to place`
            : `Tap two corners to add a ${featureType}`}
        </p>

        {/* Feature list */}
        {features.map((f, i) => (
          <div key={f.id || i} style={styles.listItem}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: FEATURE_COLORS[f.type] || '#888', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, textTransform: 'capitalize', marginLeft: 6 }}>{f.type}</span>
            {f.from !== undefined && f.to !== undefined && (
              <span style={{ fontSize: 10, color: 'var(--ink-light)', marginLeft: 4 }}>
                {CORNER_NAMES[f.from]} → {CORNER_NAMES[f.to]}
              </span>
            )}
            <button onClick={() => save({ features: JSON.stringify(features.filter((_, j) => j !== i)) })} style={styles.deleteBtn}>✕</button>
          </div>
        ))}
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Status ----
  if (panelType === 'status') {
    return (
      <Panel title="Hex Status" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <button key={s} onClick={() => save({ status: s })}
              style={{
                ...styles.statusBtn,
                border: data.status === s ? `3px solid ${c}` : '1.5px solid var(--ink-faded)',
              }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', marginRight: 8 }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Dangers ----
  if (panelType === 'dangers') {
    const dangers = parseJSON(data.dangers, []);

    function addDanger() {
      if (!newDanger.details.trim()) return;
      const updated = [...dangers, { ...newDanger, id: Date.now() }];
      save({ dangers: JSON.stringify(updated) });
      setNewDanger({ category: 'Environment', severity: 'Minor', details: '' });
    }

    function removeDanger(id) {
      save({ dangers: JSON.stringify(dangers.filter(d => d.id !== id)) });
    }

    return (
      <Panel title="Dangers" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ marginBottom: 12 }}>
          {dangers.map(d => (
            <div key={d.id} style={styles.listItem}>
              <div>
                <strong style={{ fontSize: 11, color: SEVERITY_COLORS[d.severity] || 'var(--danger-red)' }}>{d.severity}</strong>
                <span style={{ fontSize: 11, color: 'var(--ink-light)', marginLeft: 6 }}>{d.category}</span>
                <p style={{ fontSize: 13, marginTop: 2 }}>{d.details}</p>
              </div>
              <button onClick={() => removeDanger(d.id)} style={styles.deleteBtn}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={styles.catLabel}>Severity</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {DANGER_SEVERITIES.map(s => (
              <button key={s} onClick={() => setNewDanger(d => ({ ...d, severity: s }))}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 3, fontSize: 10,
                  fontFamily: 'var(--font-heading)', letterSpacing: '0.05em',
                  cursor: 'pointer', textAlign: 'center',
                  background: newDanger.severity === s ? (SEVERITY_COLORS[s] || '#8B2020') : 'var(--parchment-light)',
                  color: newDanger.severity === s ? 'white' : 'var(--ink)',
                  border: `1.5px solid ${newDanger.severity === s ? (SEVERITY_COLORS[s] || '#8B2020') : 'var(--ink-faded)'}`,
                }}>{s}</button>
            ))}
          </div>
          <div style={styles.catLabel}>Type</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {DANGER_CATEGORIES.map(c => (
              <button key={c} onClick={() => setNewDanger(d => ({ ...d, category: c }))}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 3, fontSize: 10,
                  fontFamily: 'var(--font-heading)', letterSpacing: '0.05em',
                  cursor: 'pointer', textAlign: 'center',
                  background: newDanger.category === c ? 'var(--gold-dark)' : 'var(--parchment-light)',
                  color: newDanger.category === c ? 'white' : 'var(--ink)',
                  border: `1.5px solid ${newDanger.category === c ? 'var(--gold-dark)' : 'var(--ink-faded)'}`,
                }}>{c}</button>
            ))}
          </div>
          <textarea value={newDanger.details} onChange={e => setNewDanger(d => ({ ...d, details: e.target.value }))}
            placeholder="Describe the danger…" style={{ ...styles.textarea, height: 60 }} />
          <button onClick={addDanger} style={styles.addBtn}>+ Add Danger</button>
        </div>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Factions ----
  if (panelType === 'factions') {
    const factions = parseJSON(data.factions, []);

    function addFaction() {
      if (!newFactionName.trim()) return;
      const updated = [...factions, { name: newFactionName.trim(), color: newFactionColor, id: Date.now() }];
      save({ factions: JSON.stringify(updated) });
      setNewFactionName('');
    }

    return (
      <Panel title="Organizations" onClose={onClose} extraStyle={panelExtra}>
        {factions.map(f => (
          <div key={f.id} style={styles.listItem}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: f.color, marginRight: 6 }} />
            <span style={{ fontSize: 13 }}>{f.name}</span>
            <button onClick={() => save({ factions: JSON.stringify(factions.filter(x => x.id !== f.id)) })} style={styles.deleteBtn}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={newFactionName} onChange={e => setNewFactionName(e.target.value)} placeholder="Organization name" style={{ ...styles.input, flex: 1 }} />
          <input type="color" value={newFactionColor} onChange={e => setNewFactionColor(e.target.value)} style={{ width: 36, padding: 2, border: '1px solid var(--ink-faded)', borderRadius: 3 }} />
        </div>
        <button onClick={addFaction} style={{ ...styles.addBtn, marginTop: 8 }}>+ Add Organization</button>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Resources ----
  if (panelType === 'resources') {
    const res = parseJSON(data.resources, { types: [], notes: '' });

    function toggleResource(r) {
      const types = res.types.includes(r) ? res.types.filter(x => x !== r) : [...res.types, r];
      save({ resources: JSON.stringify({ ...res, types }) });
    }

    return (
      <Panel title="Resources" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {RESOURCE_TYPES.map(r => (
            <button key={r} onClick={() => toggleResource(r)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1.5px solid var(--ink-faded)',
                background: res.types.includes(r) ? 'var(--gold-dark)' : 'var(--parchment-light)',
                color: res.types.includes(r) ? 'white' : 'var(--ink)',
                fontSize: 12, fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}>{r}</button>
          ))}
        </div>
        <textarea value={res.notes} onChange={e => save({ resources: JSON.stringify({ ...res, notes: e.target.value }) })}
          placeholder="Additional notes…" style={{ ...styles.textarea, height: 70 }} />
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Rumors ----
  if (panelType === 'rumors') {
    const rumors = parseJSON(data.rumors, []);

    function addRumor() {
      if (!newRumor.trim()) return;
      save({ rumors: JSON.stringify([...rumors, { text: newRumor.trim(), id: Date.now() }]) });
      setNewRumor('');
    }

    return (
      <Panel title="Rumors & Hooks" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ marginBottom: 10 }}>
          {rumors.map(r => (
            <div key={r.id} style={styles.listItem}>
              <span style={{ fontSize: 13, fontStyle: 'italic' }}>"{r.text}"</span>
              <button onClick={() => save({ rumors: JSON.stringify(rumors.filter(x => x.id !== r.id)) })} style={styles.deleteBtn}>✕</button>
            </div>
          ))}
        </div>
        <textarea value={newRumor} onChange={e => setNewRumor(e.target.value)}
          placeholder="What have the players heard?" style={{ ...styles.textarea, height: 60 }} />
        <button onClick={addRumor} style={styles.addBtn}>+ Add Rumor</button>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Events ----
  if (panelType === 'history') {
    let events = [];
    try { events = JSON.parse(data.history_lore || '[]'); } catch { events = []; }
    if (!Array.isArray(events)) events = [];
    // Sort by session descending
    const sorted = [...events].sort((a, b) => (b.session || 0) - (a.session || 0));

    function addEvent() {
      if (!newEvent.text.trim()) return;
      const sessionNum = parseInt(newEvent.session) || 0;
      const updated = [...events, { session: sessionNum, text: newEvent.text.trim(), id: Date.now() }];
      save({ history_lore: JSON.stringify(updated) });
      setNewEvent({ session: '', text: '' });
    }

    function removeEvent(id) {
      save({ history_lore: JSON.stringify(events.filter(e => e.id !== id)) });
    }

    return (
      <Panel title="Events" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
          {sorted.map(ev => (
            <div key={ev.id} style={styles.listItem}>
              <div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-dark)' }}>
                  Session {ev.session || '?'}
                </span>
                <p style={{ fontSize: 13, marginTop: 2 }}>{ev.text}</p>
              </div>
              <button onClick={() => removeEvent(ev.id)} style={styles.deleteBtn}>✕</button>
            </div>
          ))}
          {sorted.length === 0 && <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-light)' }}>No events yet.</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={newEvent.session} onChange={e => setNewEvent(d => ({ ...d, session: e.target.value }))}
            placeholder="Session # (e.g. 12)" type="number" style={{ ...styles.input, width: 120 }} />
          <textarea value={newEvent.text} onChange={e => setNewEvent(d => ({ ...d, text: e.target.value }))}
            placeholder="What happened?" style={{ ...styles.textarea, height: 80 }} />
          <button onClick={addEvent} style={styles.addBtn}>+ Add Event</button>
        </div>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- NPCs ----
  if (panelType === 'npcs') {
    const npcs = parseJSON(data.npcs, []);
    const NPC_TYPES = ['Humanoid', 'Animal', 'Other'];
    const DISPOSITIONS = ['Friendly', 'Neutral', 'Hostile'];
    const DISP_COLORS = { Friendly: '#2A6B2A', Neutral: '#8B6914', Hostile: '#8B2020' };

    function addNPC() {
      if (!newNPC.name.trim()) return;
      const updated = [...npcs, { ...newNPC, id: Date.now() }];
      save({ npcs: JSON.stringify(updated) });
      setNewNPC({ name: '', species: '', type: 'Humanoid', disposition: 'Neutral', details: '' });
    }

    function removeNPC(id) {
      save({ npcs: JSON.stringify(npcs.filter(n => n.id !== id)) });
    }

    return (
      <Panel title="NPCs" onClose={onClose} extraStyle={panelExtra}>
        <div style={{ marginBottom: 12 }}>
          {npcs.map(n => (
            <div key={n.id} style={styles.listItem}>
              <div>
                <strong style={{ fontSize: 13 }}>{n.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--ink-light)', marginLeft: 6 }}>{n.species || n.type}</span>
                <span style={{ fontSize: 11, marginLeft: 6, color: DISP_COLORS[n.disposition] }}>{n.disposition}</span>
                {n.details && <p style={{ fontSize: 12, marginTop: 2, color: 'var(--ink-light)' }}>{n.details}</p>}
              </div>
              <button onClick={() => removeNPC(n.id)} style={styles.deleteBtn}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={newNPC.name} onChange={e => setNewNPC(d => ({ ...d, name: e.target.value }))}
            placeholder="Name" style={styles.input} />
          <input value={newNPC.species} onChange={e => setNewNPC(d => ({ ...d, species: e.target.value }))}
            placeholder="Species (e.g. Human, Elf, Wolf)" style={styles.input} />
          <div style={styles.catLabel}>Type</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {NPC_TYPES.map(t => (
              <button key={t} onClick={() => setNewNPC(d => ({ ...d, type: t }))}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 3, fontSize: 10,
                  fontFamily: 'var(--font-heading)', cursor: 'pointer', textAlign: 'center',
                  background: newNPC.type === t ? 'var(--gold-dark)' : 'var(--parchment-light)',
                  color: newNPC.type === t ? 'white' : 'var(--ink)',
                  border: `1.5px solid ${newNPC.type === t ? 'var(--gold-dark)' : 'var(--ink-faded)'}`,
                }}>{t}</button>
            ))}
          </div>
          <div style={styles.catLabel}>Disposition</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {DISPOSITIONS.map(d => (
              <button key={d} onClick={() => setNewNPC(n => ({ ...n, disposition: d }))}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 3, fontSize: 10,
                  fontFamily: 'var(--font-heading)', cursor: 'pointer', textAlign: 'center',
                  background: newNPC.disposition === d ? (DISP_COLORS[d]) : 'var(--parchment-light)',
                  color: newNPC.disposition === d ? 'white' : 'var(--ink)',
                  border: `1.5px solid ${newNPC.disposition === d ? DISP_COLORS[d] : 'var(--ink-faded)'}`,
                }}>{d}</button>
            ))}
          </div>
          <textarea value={newNPC.details} onChange={e => setNewNPC(d => ({ ...d, details: e.target.value }))}
            placeholder="Additional details…" style={{ ...styles.textarea, height: 60 }} />
          <button onClick={addNPC} style={styles.addBtn}>+ Add NPC</button>
        </div>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Notes ----
  if (panelType === 'notes') {
    return (
      <Panel title="Notes" onClose={onClose} extraStyle={panelExtra}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="General notes…" style={{ ...styles.textarea, height: 160 }} />
        <button onClick={() => save({ notes })} style={styles.addBtn}>Save Notes</button>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Secrets (DM only) ----
  if (panelType === 'secrets') {
    return (
      <Panel title="Secrets" onClose={onClose} isDMPanel extraStyle={panelExtra}>
        <p style={{ fontSize: 12, marginBottom: 8, color: '#C4B090', fontStyle: 'italic' }}>
          🔒 Visible to DM only. Hidden from players.
        </p>
        <textarea value={secrets} onChange={e => setSecrets(e.target.value)}
          placeholder="DM secrets, hidden info, traps, encounters…"
          style={{ ...styles.textarea, height: 160, background: '#1A0D05', color: '#E8D9BC', borderColor: '#D4A01740' }} />
        <button onClick={() => save({ secrets })}
          style={{ ...styles.addBtn, background: '#D4A017', color: '#2A1A0A', marginTop: 8 }}>
          Save Secrets
        </button>
        {saving && <p style={{ ...styles.saving, color: '#D4A017' }}>Saving…</p>}
      </Panel>
    );
  }

  return null;
}

const styles = {
  panel: {
    position: 'relative',
    minWidth: 260, maxWidth: 300,
    borderRadius: 4,
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(139,105,20,0.3)',
  },
  panelBody: { padding: '12px 14px' },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 14, cursor: 'pointer',
    fontFamily: 'monospace',
  },
  terrainGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
  },
  terrainBtn: {
    padding: '7px 8px', borderRadius: 3,
    fontSize: 11, fontFamily: 'var(--font-body)',
    cursor: 'pointer', textAlign: 'left',
    color: 'var(--ink)',
  },
  poiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8,
  },
  poiBtn: {
    padding: '6px 4px', borderRadius: 3,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3,
    background: 'var(--parchment-light)',
    cursor: 'pointer', fontSize: 10,
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
  },
  catLabel: {
    fontSize: 10, fontFamily: 'var(--font-heading)',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--ink-light)', marginBottom: 4, marginTop: 6,
  },
  input: {
    width: '100%', padding: '7px 10px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3, background: 'var(--parchment-light)',
    color: 'var(--ink)', fontSize: 13,
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  textarea: {
    width: '100%', padding: '8px 10px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3, background: 'var(--parchment-light)',
    color: 'var(--ink)', fontSize: 13,
    fontFamily: 'var(--font-body)',
    resize: 'vertical', outline: 'none',
    lineHeight: 1.5,
  },
  listItem: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--parchment-dark)',
    gap: 8,
  },
  deleteBtn: {
    background: 'none', border: 'none',
    color: 'var(--danger-red)', fontSize: 12,
    cursor: 'pointer', padding: '0 2px',
    flexShrink: 0,
  },
  addBtn: {
    width: '100%', padding: '8px',
    background: 'var(--gold-dark)', color: 'white',
    border: 'none', borderRadius: 3,
    fontFamily: 'var(--font-heading)', fontSize: 12,
    letterSpacing: '0.1em', cursor: 'pointer',
    marginTop: 4,
  },
  clearBtn: {
    width: '100%', padding: '6px',
    background: 'transparent',
    border: '1px solid var(--ink-faded)',
    borderRadius: 3, color: 'var(--ink-light)',
    fontFamily: 'var(--font-body)', fontSize: 12,
    cursor: 'pointer', marginTop: 8,
  },
  statusBtn: {
    width: '100%', padding: '8px 12px',
    borderRadius: 3, background: 'var(--parchment-light)',
    cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-body)', fontSize: 13,
    color: 'var(--ink)',
  },
  selectSm: {
    padding: '5px 8px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3, background: 'var(--parchment-light)',
    fontFamily: 'var(--font-body)', fontSize: 12,
    color: 'var(--ink)', flex: 1,
  },
  edgeBtn: {
    padding: '3px 8px', borderRadius: 12,
    border: '1px solid var(--ink-faded)',
    fontSize: 10, fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  tabBtn: {
    background: 'none', border: 'none',
    fontFamily: 'var(--font-heading)', fontSize: 11,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    cursor: 'pointer', color: 'var(--ink)',
    padding: '4px 8px',
  },
  saving: {
    fontSize: 11, color: 'var(--ink-faded)',
    fontStyle: 'italic', marginTop: 4, textAlign: 'center',
  },
};
