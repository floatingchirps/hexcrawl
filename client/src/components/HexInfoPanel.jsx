import React, { useState, useMemo } from 'react';
import { TERRAIN_COLORS, STATUS_COLORS, POI_TYPES } from '../utils/hexGeometry';
import POIIcon from './POIIcons';

// All the sections that can appear in the radial menu
const ALL_SECTIONS = [
  { id: 'terrain', label: 'Terrain', icon: '⬡' },
  { id: 'poi', label: 'Point of Interest', icon: '⚑' },
  { id: 'features', label: 'Features', icon: '~' },
  { id: 'status', label: 'Status', icon: '◉' },
  { id: 'dangers', label: 'Dangers', icon: '⚠' },
  { id: 'factions', label: 'Organizations', icon: '⚔' },
  { id: 'resources', label: 'Resources', icon: '◈' },
  { id: 'rumors', label: 'Rumors', icon: '✉' },
  { id: 'history', label: 'History & Lore', icon: '📜' },
  { id: 'npcs', label: 'NPCs', icon: '👤' },
  { id: 'notes', label: 'Notes', icon: '✎' },
  { id: 'secrets', label: 'Secrets', icon: '🔒' },
];

const FEATURE_TYPE_LABELS = { road: 'Road', river: 'River', trail: 'Trail', wall: 'Wall' };
const EDGE_LABELS = ['Right', 'Bottom-Right', 'Bottom-Left', 'Left', 'Top-Left', 'Top-Right'];

function parseJSON(val, fallback) {
  try { return JSON.parse(val || JSON.stringify(fallback)); } catch { return fallback; }
}

function hasData(data, sectionId) {
  if (!data) return false;
  switch (sectionId) {
    case 'terrain': return !!data.terrain;
    case 'poi': return !!data.poi_type;
    case 'features': {
      const f = parseJSON(data.features, []);
      return f.length > 0;
    }
    case 'status': return data.status && data.status !== 'unknown';
    case 'dangers': {
      const d = parseJSON(data.dangers, []);
      return d.length > 0;
    }
    case 'factions': {
      const f = parseJSON(data.factions, []);
      return f.length > 0;
    }
    case 'resources': {
      const r = parseJSON(data.resources, { types: [], notes: '' });
      return r.types.length > 0 || (r.notes && r.notes.trim());
    }
    case 'rumors': {
      const r = parseJSON(data.rumors, []);
      return r.length > 0;
    }
    case 'history': return !!(data.history_lore && data.history_lore.trim());
    case 'npcs': {
      const n = parseJSON(data.npcs, []);
      return n.length > 0;
    }
    case 'notes': return !!(data.notes && data.notes.trim());
    case 'secrets': return !!(data.secrets && data.secrets.trim());
    default: return false;
  }
}

function SectionContent({ sectionId, data }) {
  switch (sectionId) {
    case 'terrain': {
      const color = TERRAIN_COLORS[data.terrain] || '#E8D9BC';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: 3, background: color, border: '1px solid var(--ink-faded)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{data.terrain}</span>
        </div>
      );
    }
    case 'poi': {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <POIIcon type={data.poi_type} size={18} color="var(--ink)" />
          <div>
            <span style={{ fontSize: 14 }}>{data.poi_type}</span>
            {data.poi_name && <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-light)', marginLeft: 6 }}>— {data.poi_name}</span>}
          </div>
        </div>
      );
    }
    case 'features': {
      const features = parseJSON(data.features, []);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {features.map((f, i) => (
            <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{FEATURE_TYPE_LABELS[f.type] || f.type}</span>
              <span style={{ color: 'var(--ink-light)', fontSize: 12 }}>
                ({(f.edges || []).map(e => EDGE_LABELS[e]).join(', ')})
              </span>
            </div>
          ))}
        </div>
      );
    }
    case 'status': {
      const color = STATUS_COLORS[data.status] || '#888';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{data.status}</span>
        </div>
      );
    }
    case 'dangers': {
      const dangers = parseJSON(data.dangers, []);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dangers.map((d, i) => (
            <div key={d.id || i} style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--danger-red)' }}>{d.severity}</span>
              <span style={{ color: 'var(--ink-light)', marginLeft: 6 }}>{d.category}</span>
              {d.details && <p style={{ marginTop: 2, fontSize: 13 }}>{d.details}</p>}
            </div>
          ))}
        </div>
      );
    }
    case 'factions': {
      const factions = parseJSON(data.factions, []);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {factions.map((f, i) => (
            <div key={f.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
              {f.name}
            </div>
          ))}
        </div>
      );
    }
    case 'resources': {
      const res = parseJSON(data.resources, { types: [], notes: '' });
      return (
        <div>
          {res.types.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: res.notes ? 6 : 0 }}>
              {res.types.map(r => (
                <span key={r} style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 11,
                  background: 'var(--gold-dark)', color: 'white',
                  fontFamily: 'var(--font-body)',
                }}>{r}</span>
              ))}
            </div>
          )}
          {res.notes && <p style={{ fontSize: 13, color: 'var(--ink-light)', marginTop: 4 }}>{res.notes}</p>}
        </div>
      );
    }
    case 'rumors': {
      const rumors = parseJSON(data.rumors, []);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rumors.map((r, i) => (
            <p key={r.id || i} style={{ fontSize: 13, fontStyle: 'italic' }}>"{r.text}"</p>
          ))}
        </div>
      );
    }
    case 'npcs': {
      const npcs = parseJSON(data.npcs, []);
      const DISP_COLORS = { Friendly: '#2A6B2A', Neutral: '#8B6914', Hostile: '#8B2020' };
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {npcs.map((npc, i) => (
            <div key={npc.id || i} style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{npc.name || 'Unnamed'}</span>
              <span style={{ color: 'var(--ink-light)', marginLeft: 6 }}>{npc.species || npc.type}</span>
              <span style={{ marginLeft: 6, fontSize: 11, color: DISP_COLORS[npc.disposition] || 'var(--ink-light)' }}>
                {npc.disposition}
              </span>
              {npc.details && <p style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-light)' }}>{npc.details}</p>}
            </div>
          ))}
        </div>
      );
    }
    case 'history':
      return <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{data.history_lore}</p>;
    case 'notes':
      return <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{data.notes}</p>;
    case 'secrets':
      return (
        <div style={{ background: '#2A1A0A', borderRadius: 3, padding: '8px 10px' }}>
          <p style={{ fontSize: 12, color: '#C4B090', fontStyle: 'italic', marginBottom: 4 }}>DM only</p>
          <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#E8D9BC' }}>{data.secrets}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function HexInfoPanel({ hexLabel, hexData, role, onClose, onOpenRadialSection }) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const data = hexData || {};
  const isExplored = data.explored === 1 || data.explored === '1' || data.explored === true;

  // Determine which sections have data
  const filledSections = useMemo(() => {
    return ALL_SECTIONS.filter(s => {
      if (s.id === 'secrets' && role !== 'dm') return false;
      return hasData(data, s.id);
    });
  }, [data, role]);

  // Sections available to add (not yet filled)
  const emptySections = useMemo(() => {
    return ALL_SECTIONS.filter(s => {
      if (s.id === 'secrets' && role !== 'dm') return false;
      return !hasData(data, s.id);
    });
  }, [data, role]);

  const displayName = data.poi_name || hexLabel;

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.hexLabel}>Hex: {hexLabel}</div>
          {data.poi_name && <div style={styles.poiName}>{data.poi_name}</div>}
        </div>
        <button onClick={onClose} style={styles.closeBtn} title="Close panel">✕</button>
      </div>

      {/* Content */}
      <div style={styles.body}>
        {!isExplored && filledSections.length === 0 && (
          <p style={styles.emptyMsg}>This hex is unexplored. Right-click to add information.</p>
        )}

        {filledSections.map(section => (
          <div key={section.id} style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>{section.icon}</span>
              <span style={styles.sectionLabel}>{section.label}</span>
              <button
                onClick={() => onOpenRadialSection(section.id)}
                style={styles.editBtn}
                title={`Edit ${section.label}`}
              >✎</button>
            </div>
            <div style={styles.sectionContent}>
              <SectionContent sectionId={section.id} data={data} />
            </div>
          </div>
        ))}

        {/* Add section dropdown */}
        {emptySections.length > 0 && (
          <div style={styles.addWrapper}>
            <button
              onClick={() => setAddMenuOpen(o => !o)}
              style={styles.addBtn}
            >
              + Add information
              <span style={{ fontSize: 10, marginLeft: 4 }}>{addMenuOpen ? '▲' : '▼'}</span>
            </button>
            {addMenuOpen && (
              <div style={styles.addDropdown}>
                {emptySections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onOpenRadialSection(s.id); setAddMenuOpen(false); }}
                    style={styles.addOption}
                  >
                    <span style={{ marginRight: 8 }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    width: '100%',
    flex: 1,
    background: 'var(--parchment)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '12px 14px 10px',
    borderBottom: '1px solid var(--parchment-dark)',
    gap: 8,
  },
  hexLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--ink-faded)',
  },
  poiName: {
    fontFamily: 'var(--font-heading)',
    fontSize: 15,
    letterSpacing: '0.05em',
    color: 'var(--ink)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'monospace',
    color: 'var(--ink)',
    padding: '0 2px',
    flexShrink: 0,
  },
  body: {
    padding: '8px 14px 14px',
    overflowY: 'auto',
    flex: 1,
  },
  emptyMsg: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'var(--ink-light)',
    lineHeight: 1.5,
    padding: '8px 0',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionIcon: {
    fontSize: 13,
    width: 18,
    textAlign: 'center',
    flexShrink: 0,
  },
  sectionLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-light)',
  },
  editBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--ink-faded)',
    padding: '0 2px',
    flexShrink: 0,
    lineHeight: 1,
  },
  sectionContent: {
    paddingLeft: 24,
  },
  addWrapper: {
    marginTop: 8,
    position: 'relative',
  },
  addBtn: {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--parchment-light)',
    border: '1.5px dashed var(--ink-faded)',
    borderRadius: 3,
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: 'var(--ink-light)',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
  },
  addDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    background: 'var(--parchment)',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 4,
    boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
    marginBottom: 4,
    maxHeight: 200,
    overflowY: 'auto',
    zIndex: 10,
  },
  addOption: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '7px 12px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--parchment-dark)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
