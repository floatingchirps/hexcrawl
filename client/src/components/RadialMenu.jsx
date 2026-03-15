import React, { useEffect, useRef, useState } from 'react';
import { TERRAIN_LIST, TERRAIN_COLORS, STATUS_COLORS, POI_TYPES } from '../utils/hexGeometry';
import POIIcon from './POIIcons';

const SEGMENTS = [
  { id: 'terrain', label: 'Terrain', icon: '⬡', color: '#7A9E5F' },
  { id: 'poi', label: 'POI', icon: '⚑', color: '#D4A017' },
  { id: 'status', label: 'Status', icon: '◉', color: '#4A90D9' },
  { id: 'dangers', label: 'Dangers', icon: '⚠', color: '#8B2020' },
];

const POI_CATEGORY_COLORS = {
  Settlements: '#8B6914',
  Structures: '#4A6B8B',
  Natural: '#4A8B5A',
  Underground: '#8B2020',
  Anomalies: '#6B4C8B',
};

const hoverOn = e => {
  e.currentTarget.style.transform = 'scale(1.15)';
  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.4)';
};
const hoverOff = e => {
  e.currentTarget.style.transform = 'scale(1)';
  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
};

// Returns positions for `count` items + 1 back button at top (index 0)
function radialPositions(count, radius, menuSize, btnSize) {
  const total = count + 1;
  return Array.from({ length: total }, (_, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    return {
      bx: menuSize / 2 + radius * Math.cos(angle) - btnSize / 2,
      by: menuSize / 2 + radius * Math.sin(angle) - btnSize / 2,
      isBack: i === 0,
    };
  });
}

function BackBtn({ bx, by, size, onClick }) {
  return (
    <button onClick={onClick} title="Back" style={{
      position: 'absolute', left: bx, top: by,
      width: size, height: size, borderRadius: '50%',
      background: 'var(--parchment)', border: '2px solid var(--gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: 'var(--ink)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      pointerEvents: 'all', cursor: 'pointer',
      fontFamily: 'var(--font-heading)', letterSpacing: '0.05em',
    }}>◀ Back</button>
  );
}

export default function RadialMenu({ x, y, onSelect, onTerrainApply, onPOIApply, onStatusApply, onClose, role, copyLabel, onCopyApply }) {
  const ref = useRef(null);
  // null | 'terrain' | 'poi_category' | { type: 'poi_types', category: string }
  const [submenu, setSubmenu] = useState(null);
  const baseSegments = role === 'dm' ? SEGMENTS : SEGMENTS.filter(s => s.id !== 'secrets');
  const segments = copyLabel
    ? [...baseSegments, { id: 'copy', label: copyLabel, icon: null, color: '#2A6B4A' }]
    : baseSegments;

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (submenu) setSubmenu(null);
        else onClose();
      }
    }
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('touchstart', handleClick);
    };
  }, [onClose, submenu]);

  function clamp(val, menuSize) {
    return {
      left: Math.max(10, Math.min(val.x - menuSize / 2, window.innerWidth - menuSize - 10)),
      top: Math.max(10, Math.min(val.y - menuSize / 2, window.innerHeight - menuSize - 10)),
    };
  }

  function handleSegmentClick(segId) {
    if (segId === 'terrain') setSubmenu('terrain');
    else if (segId === 'poi') setSubmenu('poi_category');
    else if (segId === 'status') setSubmenu('status');
    else if (segId === 'copy' && onCopyApply) onCopyApply();
    else onSelect(segId);
  }

  // ── Terrain submenu ──
  if (submenu === 'terrain') {
    const terrains = [...TERRAIN_LIST, '_unknown_'];
    const radius = 100, btnSize = 46;
    const menuSize = (radius + btnSize) * 2 + 20;
    const { left, top } = clamp({ x, y }, menuSize);
    const positions = radialPositions(terrains.length, radius, menuSize, btnSize);

    return (
      <div ref={ref} style={{ position: 'fixed', left, top, width: menuSize, height: menuSize, zIndex: 500, pointerEvents: 'none' }}>
        {positions.map((pos, i) =>
          pos.isBack
            ? <BackBtn key="back" bx={pos.bx} by={pos.by} size={btnSize} onClick={() => setSubmenu(null)} />
            : (() => {
                const t = terrains[i - 1];
                if (t === '_unknown_') {
                  return (
                    <button key="unknown" onClick={() => onTerrainApply(null)} title="Unknown (clear terrain)" style={{
                      position: 'absolute', left: pos.bx, top: pos.by,
                      width: btnSize, height: btnSize, borderRadius: '50%',
                      background: '#C8C0B0', border: '2px solid var(--ink-faded)', color: 'var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                      <span style={{ fontSize: 7, fontFamily: 'var(--font-heading)', textTransform: 'capitalize', lineHeight: 1.2, textAlign: 'center', padding: '0 2px' }}>Unknown</span>
                    </button>
                  );
                }
                const color = TERRAIN_COLORS[t] || '#E8D9BC';
                const label = t.charAt(0).toUpperCase() + t.slice(1);
                return (
                  <button key={t} onClick={() => onTerrainApply(t)} title={label} style={{
                    position: 'absolute', left: pos.bx, top: pos.by,
                    width: btnSize, height: btnSize, borderRadius: '50%',
                    background: color, border: '2px solid var(--ink-faded)', color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-heading)', textTransform: 'capitalize', lineHeight: 1.2, textAlign: 'center', padding: '0 2px', textShadow: '0 0 3px rgba(255,255,255,0.6)' }}>{label}</span>
                  </button>
                );
              })()
        )}
      </div>
    );
  }

  // ── POI Category submenu ──
  if (submenu === 'poi_category') {
    const categories = Object.keys(POI_TYPES);
    const radius = 80, btnSize = 50;
    const menuSize = (radius + btnSize) * 2 + 20;
    const { left, top } = clamp({ x, y }, menuSize);
    const positions = radialPositions(categories.length, radius, menuSize, btnSize);

    return (
      <div ref={ref} style={{ position: 'fixed', left, top, width: menuSize, height: menuSize, zIndex: 500, pointerEvents: 'none' }}>
        {positions.map((pos, i) =>
          pos.isBack
            ? <BackBtn key="back" bx={pos.bx} by={pos.by} size={btnSize} onClick={() => setSubmenu(null)} />
            : (() => {
                const cat = categories[i - 1];
                const color = POI_CATEGORY_COLORS[cat] || '#888';
                return (
                  <button key={cat} onClick={() => setSubmenu({ type: 'poi_types', category: cat })} title={cat} style={{
                    position: 'absolute', left: pos.bx, top: pos.by,
                    width: btnSize, height: btnSize, borderRadius: '50%',
                    background: 'var(--parchment)', border: `2px solid ${color}`, color,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
                    transition: 'transform 0.1s, box-shadow 0.1s', gap: 1,
                  }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, textAlign: 'center', padding: '0 2px' }}>{cat}</span>
                  </button>
                );
              })()
        )}
      </div>
    );
  }

  // ── POI Types submenu ──
  if (submenu?.type === 'poi_types') {
    const types = POI_TYPES[submenu.category] || [];
    const catColor = POI_CATEGORY_COLORS[submenu.category] || '#888';
    const radius = 90, btnSize = 52;
    const menuSize = (radius + btnSize) * 2 + 20;
    const { left, top } = clamp({ x, y }, menuSize);
    const positions = radialPositions(types.length, radius, menuSize, btnSize);

    return (
      <div ref={ref} style={{ position: 'fixed', left, top, width: menuSize, height: menuSize, zIndex: 500, pointerEvents: 'none' }}>
        {positions.map((pos, i) =>
          pos.isBack
            ? <BackBtn key="back" bx={pos.bx} by={pos.by} size={btnSize} onClick={() => setSubmenu('poi_category')} />
            : (() => {
                const t = types[i - 1];
                return (
                  <button key={t} onClick={() => onPOIApply(t)} title={t} style={{
                    position: 'absolute', left: pos.bx, top: pos.by,
                    width: btnSize, height: btnSize, borderRadius: '50%',
                    background: 'var(--parchment)', border: `2px solid ${catColor}`, color: catColor,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
                    transition: 'transform 0.1s, box-shadow 0.1s', gap: 2,
                  }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <POIIcon type={t} size={16} color={catColor} />
                    <span style={{ fontSize: 6.5, fontFamily: 'var(--font-heading)', textTransform: 'capitalize', lineHeight: 1.1, textAlign: 'center', padding: '0 2px' }}>{t}</span>
                  </button>
                );
              })()
        )}
      </div>
    );
  }

  // ── Status submenu ──
  if (submenu === 'status') {
    const statuses = Object.keys(STATUS_COLORS);
    const radius = 75, btnSize = 50;
    const menuSize = (radius + btnSize) * 2 + 20;
    const { left, top } = clamp({ x, y }, menuSize);
    const positions = radialPositions(statuses.length, radius, menuSize, btnSize);

    return (
      <div ref={ref} style={{ position: 'fixed', left, top, width: menuSize, height: menuSize, zIndex: 500, pointerEvents: 'none' }}>
        {positions.map((pos, i) =>
          pos.isBack
            ? <BackBtn key="back" bx={pos.bx} by={pos.by} size={btnSize} onClick={() => setSubmenu(null)} />
            : (() => {
                const s = statuses[i - 1];
                const color = STATUS_COLORS[s];
                const label = s.charAt(0).toUpperCase() + s.slice(1);
                return (
                  <button key={s} onClick={() => onStatusApply(s)} title={label} style={{
                    position: 'absolute', left: pos.bx, top: pos.by,
                    width: btnSize, height: btnSize, borderRadius: '50%',
                    background: 'var(--parchment)', border: `3px solid ${color}`, color: 'var(--ink)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
                    transition: 'transform 0.1s, box-shadow 0.1s', gap: 2,
                  }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>{label}</span>
                  </button>
                );
              })()
        )}
      </div>
    );
  }

  // ── Main radial menu ──
  const n = segments.length;
  const radius = 80, btnSize = 50;
  const menuSize = (radius + btnSize) * 2 + 20;
  const { left, top } = clamp({ x, y }, menuSize);

  return (
    <div ref={ref} style={{ position: 'fixed', left, top, width: menuSize, height: menuSize, zIndex: 500, pointerEvents: 'none' }}>
      {segments.map((seg, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        const bx = menuSize / 2 + radius * Math.cos(angle) - btnSize / 2;
        const by = menuSize / 2 + radius * Math.sin(angle) - btnSize / 2;
        return (
          <button key={seg.id} onClick={() => handleSegmentClick(seg.id)} title={seg.label} style={{
            position: 'absolute', left: bx, top: by,
            width: btnSize, height: btnSize, borderRadius: '50%',
            background: seg.id === 'secrets' ? '#2A1A0A' : 'var(--parchment)',
            border: `2px solid ${seg.color}`,
            color: seg.id === 'secrets' ? '#D4A017' : seg.color,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer', pointerEvents: 'all',
            transition: 'transform 0.1s, box-shadow 0.1s', gap: 1,
          }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            {seg.id === 'copy' ? (
              <span style={{ fontSize: 6.5, fontFamily: 'var(--font-heading)', letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.4, textAlign: 'center', padding: '0 4px', whiteSpace: 'pre-line' }}>{seg.label}</span>
            ) : (
              <>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{seg.icon}</span>
                <span style={{ fontSize: 7, fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, marginTop: 1 }}>{seg.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
