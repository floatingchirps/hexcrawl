import React, { useEffect, useRef } from 'react';

const SEGMENTS = [
  { id: 'terrain', label: 'Terrain', icon: '⬡', color: '#7A9E5F' },
  { id: 'poi', label: 'POI', icon: '⚑', color: '#D4A017' },
  { id: 'features', label: 'Features', icon: '~', color: '#7AACCF' },
  { id: 'dangers', label: 'Dangers', icon: '⚠', color: '#8B2020' },
  { id: 'factions', label: 'Factions', icon: '⚔', color: '#8B6914' },
  { id: 'resources', label: 'Resources', icon: '◈', color: '#4A6B3A' },
  { id: 'rumors', label: 'Rumors', icon: '✉', color: '#6B4C35' },
  { id: 'history', label: 'History', icon: '📜', color: '#8B6914' },
  { id: 'status', label: 'Status', icon: '◉', color: '#4A90D9' },
  { id: 'notes', label: 'Notes', icon: '✎', color: '#6B4C35' },
  { id: 'secrets', label: 'Secrets', icon: '🔒', color: '#2A1A0A' },
];

export default function RadialMenu({ x, y, onSelect, onClose, role }) {
  const ref = useRef(null);
  const segments = role === 'dm' ? SEGMENTS : SEGMENTS.filter(s => s.id !== 'secrets');

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const n = segments.length;
  const radius = 80;
  const btnSize = 50;

  // Position menu to stay in viewport
  const menuSize = (radius + btnSize) * 2 + 20;
  let left = x - menuSize / 2;
  let top = y - menuSize / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - menuSize - 10));
  top = Math.max(10, Math.min(top, window.innerHeight - menuSize - 10));

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left, top,
        width: menuSize, height: menuSize,
        zIndex: 500,
        pointerEvents: 'none',
      }}
    >
      {/* Center label */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: 44, height: 44,
        borderRadius: '50%',
        background: 'var(--parchment)',
        border: '2px solid var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'var(--gold)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 2,
      }}>⚜</div>

      {segments.map((seg, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        const bx = menuSize / 2 + radius * Math.cos(angle) - btnSize / 2;
        const by = menuSize / 2 + radius * Math.sin(angle) - btnSize / 2;

        return (
          <button
            key={seg.id}
            onClick={() => onSelect(seg.id)}
            title={seg.label}
            style={{
              position: 'absolute',
              left: bx, top: by,
              width: btnSize, height: btnSize,
              borderRadius: '50%',
              background: seg.id === 'secrets' ? '#2A1A0A' : 'var(--parchment)',
              border: `2px solid ${seg.color}`,
              color: seg.id === 'secrets' ? '#D4A017' : seg.color,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              pointerEvents: 'all',
              transition: 'transform 0.1s, box-shadow 0.1s',
              gap: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{seg.icon}</span>
            <span style={{
              fontSize: 7, fontFamily: 'var(--font-heading)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              lineHeight: 1, marginTop: 1,
            }}>{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
