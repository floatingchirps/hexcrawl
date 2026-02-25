import React, { useState, useEffect } from 'react';
import { TERRAIN_COLORS, TERRAIN_LIST, STATUS_COLORS, POI_TYPES } from '../utils/hexGeometry';
import { updateHex, fetchHexHistory } from '../utils/api';
import POIIcon from './POIIcons';

const RESOURCE_TYPES = ['Herbs', 'Ore/Metal', 'Lumber', 'Fresh Water', 'Game/Hunting', 'Fish', 'Stone', 'Rare Materials'];
const DANGER_CATEGORIES = ['Environmental', 'Enemies', 'Trap', 'Curse', 'Other'];
const DANGER_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Deadly'];
const EDGE_LABELS = ['Right', 'Bottom-Right', 'Bottom-Left', 'Left', 'Top-Left', 'Top-Right'];

function Panel({ title, onClose, children, isDMPanel }) {
  return (
    <div style={{
      ...styles.panel,
      background: isDMPanel ? '#2A1A0A' : 'var(--parchment)',
      color: isDMPanel ? '#E8D9BC' : 'var(--ink)',
      border: isDMPanel ? '2px solid #D4A017' : '2px solid var(--ink-faded)',
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

export default function HexEditPanel({ hexLabel, hexData, panelType, onClose, onSave, role }) {
  const [data, setData] = useState(hexData || {});
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  useEffect(() => {
    setData(hexData || {});
  }, [hexData, hexLabel]);

  async function save(updates) {
    setSaving(true);
    try {
      const merged = { ...updates, explored: 1 };
      const result = await updateHex(hexLabel, merged);
      onSave(result);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    const h = await fetchHexHistory(hexLabel);
    setHistory(h);
    setActiveTab('history');
  }

  function parseJSON(val, fallback) {
    try { return JSON.parse(val || JSON.stringify(fallback)); } catch { return fallback; }
  }

  // ---- Terrain ----
  if (panelType === 'terrain') {
    return (
      <Panel title="Terrain" onClose={onClose}>
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
      <Panel title="Point of Interest" onClose={onClose}>
        <input
          placeholder="POI name (optional)"
          value={data.poi_name || ''}
          onChange={e => setData(d => ({ ...d, poi_name: e.target.value }))}
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
    const FEATURE_TYPES = ['road', 'river', 'trail', 'wall'];

    function toggleEdge(fType, edgeIdx) {
      const existing = features.find(f => f.type === fType);
      let newFeatures;
      if (existing) {
        const edges = existing.edges || [];
        const newEdges = edges.includes(edgeIdx)
          ? edges.filter(e => e !== edgeIdx)
          : [...edges, edgeIdx];
        if (newEdges.length === 0) {
          newFeatures = features.filter(f => f.type !== fType);
        } else {
          newFeatures = features.map(f => f.type === fType ? { ...f, edges: newEdges } : f);
        }
      } else {
        newFeatures = [...features, { type: fType, edges: [edgeIdx] }];
      }
      save({ features: JSON.stringify(newFeatures) });
    }

    return (
      <Panel title="Features" onClose={onClose}>
        {FEATURE_TYPES.map(fType => {
          const existing = features.find(f => f.type === fType);
          const activeEdges = existing?.edges || [];
          return (
            <div key={fType} style={{ marginBottom: 12 }}>
              <div style={styles.catLabel}>{fType.charAt(0).toUpperCase() + fType.slice(1)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {EDGE_LABELS.map((lbl, idx) => (
                  <button key={idx} onClick={() => toggleEdge(fType, idx)}
                    style={{
                      ...styles.edgeBtn,
                      background: activeEdges.includes(idx) ? 'var(--gold-dark)' : 'var(--parchment-light)',
                      color: activeEdges.includes(idx) ? 'white' : 'var(--ink)',
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Status ----
  if (panelType === 'status') {
    return (
      <Panel title="Hex Status" onClose={onClose}>
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
    const [newDanger, setNewDanger] = useState({ category: 'Environmental', severity: 'Minor', details: '' });

    function addDanger() {
      if (!newDanger.details.trim()) return;
      const updated = [...dangers, { ...newDanger, id: Date.now() }];
      save({ dangers: JSON.stringify(updated) });
      setNewDanger({ category: 'Environmental', severity: 'Minor', details: '' });
    }

    function removeDanger(id) {
      save({ dangers: JSON.stringify(dangers.filter(d => d.id !== id)) });
    }

    return (
      <Panel title="Dangers" onClose={onClose}>
        <div style={{ marginBottom: 12 }}>
          {dangers.map(d => (
            <div key={d.id} style={styles.listItem}>
              <div>
                <strong style={{ fontSize: 11, color: 'var(--danger-red)' }}>{d.severity}</strong>
                <span style={{ fontSize: 11, color: 'var(--ink-light)', marginLeft: 6 }}>{d.category}</span>
                <p style={{ fontSize: 13, marginTop: 2 }}>{d.details}</p>
              </div>
              <button onClick={() => removeDanger(d.id)} style={styles.deleteBtn}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={newDanger.category} onChange={e => setNewDanger(d => ({ ...d, category: e.target.value }))} style={styles.selectSm}>
              {DANGER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newDanger.severity} onChange={e => setNewDanger(d => ({ ...d, severity: e.target.value }))} style={styles.selectSm}>
              {DANGER_SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
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
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#8B6914');

    function addFaction() {
      if (!newName.trim()) return;
      const updated = [...factions, { name: newName.trim(), color: newColor, id: Date.now() }];
      save({ factions: JSON.stringify(updated) });
      setNewName('');
    }

    return (
      <Panel title="Factions" onClose={onClose}>
        {factions.map(f => (
          <div key={f.id} style={styles.listItem}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: f.color, marginRight: 6 }} />
            <span style={{ fontSize: 13 }}>{f.name}</span>
            <button onClick={() => save({ factions: JSON.stringify(factions.filter(x => x.id !== f.id)) })} style={styles.deleteBtn}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Faction name" style={{ ...styles.input, flex: 1 }} />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 36, padding: 2, border: '1px solid var(--ink-faded)', borderRadius: 3 }} />
        </div>
        <button onClick={addFaction} style={{ ...styles.addBtn, marginTop: 8 }}>+ Add Faction</button>
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
      <Panel title="Resources" onClose={onClose}>
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
    const [newRumor, setNewRumor] = useState('');

    function addRumor() {
      if (!newRumor.trim()) return;
      save({ rumors: JSON.stringify([...rumors, { text: newRumor.trim(), id: Date.now() }]) });
      setNewRumor('');
    }

    return (
      <Panel title="Rumors & Hooks" onClose={onClose}>
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

  // ---- History / Lore ----
  if (panelType === 'history') {
    const [lore, setLore] = useState(data.history_lore || '');
    const [tab, setTab] = useState('edit');
    return (
      <Panel title="History & Lore" onClose={onClose}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {['edit', 'changelog'].map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === 'changelog') loadHistory(); }}
              style={{ ...styles.tabBtn, fontWeight: tab === t ? 700 : 400, borderBottom: tab === t ? '2px solid var(--gold)' : 'none' }}>
              {t === 'edit' ? 'Edit Lore' : 'Change Log'}
            </button>
          ))}
        </div>
        {tab === 'edit' ? (
          <>
            <textarea value={lore} onChange={e => setLore(e.target.value)}
              placeholder="Historical notes, lore, legends…" style={{ ...styles.textarea, height: 140 }} />
            <button onClick={() => save({ history_lore: lore })} style={styles.addBtn}>Save</button>
          </>
        ) : (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {history.length === 0 ? <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-light)' }}>No changes yet.</p> : history.map(h => (
              <div key={h.id} style={{ borderBottom: '1px solid var(--parchment-dark)', padding: '6px 0' }}>
                <span style={{ fontSize: 10, color: 'var(--ink-faded)' }}>{h.changed_at}</span>
                <p style={{ fontSize: 12 }}><strong>{h.field_name}</strong>: {String(h.old_value).slice(0, 30)} → {String(h.new_value).slice(0, 30)}</p>
              </div>
            ))}
          </div>
        )}
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Notes ----
  if (panelType === 'notes') {
    const [notes, setNotes] = useState(data.notes || '');
    return (
      <Panel title="Notes" onClose={onClose}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="General notes…" style={{ ...styles.textarea, height: 160 }} />
        <button onClick={() => save({ notes })} style={styles.addBtn}>Save Notes</button>
        {saving && <p style={styles.saving}>Saving…</p>}
      </Panel>
    );
  }

  // ---- Secrets (DM only) ----
  if (panelType === 'secrets') {
    const [secrets, setSecrets] = useState(data.secrets || '');
    return (
      <Panel title="Secrets" onClose={onClose} isDMPanel>
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
