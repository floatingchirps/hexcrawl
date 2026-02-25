import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { buildFullLayout, hexPath, hexCornerPoints, hexEdgeMidpoints, TERRAIN_COLORS, STATUS_COLORS, HEX_SIZE } from '../utils/hexGeometry';
import POIIcon from './POIIcons';

const SIZE = HEX_SIZE;

function HexTile({ hex, data, isCenter, onClick, onHover, onHoverEnd, role }) {
  if (!hex) return null;
  const { cx, cy, label } = hex;

  const terrain = data?.terrain;
  const fillColor = terrain ? (TERRAIN_COLORS[terrain] || '#E8D9BC') : '#E8D9BC';
  const explored = data?.explored;
  const status = data?.status || 'unknown';
  const statusColor = STATUS_COLORS[status] || '#888';
  const isExplored = explored === 1 || explored === '1' || explored === true;

  const corners = hexCornerPoints(cx, cy);

  // Feature lines
  const features = useMemo(() => {
    try { return JSON.parse(data?.features || '[]'); } catch { return []; }
  }, [data?.features]);

  const edgeMidpoints = hexEdgeMidpoints(cx, cy, SIZE);

  function renderFeature(f, i) {
    const edges = f.edges || [];
    if (!edges.length) return null;

    const points = edges.map(e => edgeMidpoints[e]);
    if (points.length < 2) return null;

    const pathD = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    let stroke = '#8B6914', width = 2, dashArray = null, wavy = false;
    if (f.type === 'road') { stroke = '#A0897A'; width = 2.5; }
    else if (f.type === 'river') { stroke = '#7AACCF'; width = 2; wavy = true; }
    else if (f.type === 'trail') { stroke = '#8B6914'; dashArray = '3,3'; }
    else if (f.type === 'wall') { stroke = '#3D2B1F'; width = 3; }

    return (
      <path key={i} d={pathD} stroke={stroke} strokeWidth={width}
        strokeDasharray={dashArray} fill="none" strokeLinecap="round" />
    );
  }

  // Faction tint
  const factions = useMemo(() => {
    try { return JSON.parse(data?.factions || '[]'); } catch { return []; }
  }, [data?.factions]);
  const factionColor = factions[0]?.color;

  // Dangers indicator
  const dangers = useMemo(() => {
    try { return JSON.parse(data?.dangers || '[]'); } catch { return []; }
  }, [data?.dangers]);

  // Corner positions for badge
  const corners6 = useMemo(() => {
    const r = SIZE;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      pts.push([cx + r * Math.cos((Math.PI/180)*60*i), cy + r * Math.sin((Math.PI/180)*60*i)]);
    }
    return pts;
  }, [cx, cy]);

  // Top-right corner area for status badge
  const badgeX = corners6[5] ? corners6[5][0] - 2 : cx + SIZE * 0.7;
  const badgeY = corners6[5] ? corners6[5][1] + 5 : cy - SIZE * 0.7;

  return (
    <g
      onClick={() => onClick(label)}
      onMouseEnter={() => onHover(label, data)}
      onMouseLeave={onHoverEnd}
      style={{ cursor: 'pointer' }}
    >
      {/* Base fill */}
      <polygon
        points={corners}
        fill={isExplored ? fillColor : '#E8D9BC'}
        stroke={isCenter ? '#D4A017' : (isExplored ? '#8B6914' : '#C4B090')}
        strokeWidth={isCenter ? 3 : 1.2}
      />

      {/* Faction tint */}
      {factionColor && isExplored && (
        <polygon points={corners} fill={factionColor} opacity="0.25" />
      )}

      {/* Fog overlay */}
      {!isExplored && (
        <polygon points={corners} fill="rgba(150,130,100,0.55)" />
      )}

      {/* POI icon */}
      {data?.poi_type && isExplored && (
        <foreignObject x={cx - 12} y={cy - 16} width={24} height={24}
          style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <POIIcon type={data.poi_type} size={22} color="#3D2B1F" />
        </foreignObject>
      )}

      {/* Feature lines */}
      {isExplored && features.map(renderFeature)}

      {/* Status badge */}
      {isExplored && status !== 'unknown' && (
        <circle cx={badgeX} cy={badgeY} r={5} fill={statusColor}
          stroke="#F2E8D5" strokeWidth={1} />
      )}

      {/* Hex label */}
      <text
        x={cx}
        y={cy + SIZE * 0.72}
        textAnchor="middle"
        fontSize={isExplored ? 7 : 7}
        fill={isExplored ? '#8B6914' : '#C4B090'}
        fontFamily="var(--font-heading)"
        letterSpacing="0.05em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {label}
      </text>

      {/* POI name (tiny, if exists) */}
      {data?.poi_name && isExplored && (
        <text x={cx} y={cy + SIZE * 0.45} textAnchor="middle"
          fontSize={6.5} fill="#3D2B1F" fontFamily="var(--font-body)"
          fontStyle="italic" style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {data.poi_name.length > 10 ? data.poi_name.slice(0, 9) + '…' : data.poi_name}
        </text>
      )}
    </g>
  );
}

export default function HexMap({ hexData, ringCount, role, onHexClick }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });

  const hexLayout = useMemo(() => buildFullLayout(ringCount, SIZE), [ringCount]);
  const hexMap = useMemo(() => {
    const m = {};
    hexData.forEach(h => m[h.label] = h);
    return m;
  }, [hexData]);

  // Fit to canvas
  const fitToCanvas = useCallback(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (!hexLayout.length) return;

    const xs = hexLayout.map(h => h.cx);
    const ys = hexLayout.map(h => h.cy);
    const minX = Math.min(...xs) - SIZE;
    const maxX = Math.max(...xs) + SIZE;
    const minY = Math.min(...ys) - SIZE;
    const maxY = Math.max(...ys) + SIZE;

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const scaleX = rect.width / mapW * 0.9;
    const scaleY = rect.height / mapH * 0.9;
    const scale = Math.min(scaleX, scaleY, 2);

    setTransform({
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
      scale
    });
  }, [hexLayout]);

  useEffect(() => {
    const update = () => {
      if (svgRef.current) {
        const r = svgRef.current.getBoundingClientRect();
        setSvgSize({ w: r.width, h: r.height });
      }
    };
    update();
    fitToCanvas();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fitToCanvas]);

  // Re-fit when ring count changes
  useEffect(() => { fitToCanvas(); }, [ringCount, fitToCanvas]);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }

  function handleMouseMove(e) {
    if (!dragging || !dragStart) return;
    setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(t => {
      const newScale = Math.max(0.2, Math.min(4, t.scale * delta));
      const factor = newScale / t.scale;
      return {
        scale: newScale,
        x: mx + (t.x - mx) * factor,
        y: my + (t.y - my) * factor,
      };
    });
  }

  function handleHover(label, data) {
    const terrain = data?.terrain || 'Unexplored';
    const name = data?.poi_name ? ` — ${data.poi_name}` : '';
    setTooltip({ text: `${label}${name}: ${terrain}` });
  }

  function handleHoverEnd() {
    setTooltip(null);
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: dragging ? 'grabbing' : 'grab', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {hexLayout.map(hex => (
            <HexTile
              key={hex.label}
              hex={hex}
              data={hexMap[hex.label]}
              isCenter={hex.label === '0'}
              onClick={onHexClick}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
              role={role}
            />
          ))}
        </g>
      </svg>

      {/* Fit to canvas button */}
      <button onClick={fitToCanvas} style={styles.fitBtn} title="Fit map to window">
        ⊞
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div style={styles.tooltip}>{tooltip.text}</div>
      )}
    </div>
  );
}

const styles = {
  fitBtn: {
    position: 'absolute', bottom: 20, right: 20,
    width: 40, height: 40,
    background: 'var(--parchment)',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 4,
    fontSize: 18, color: 'var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    zIndex: 10,
    fontFamily: 'monospace',
  },
  tooltip: {
    position: 'absolute', bottom: 70, right: 20,
    background: 'var(--ink)',
    color: 'var(--parchment)',
    padding: '5px 10px',
    borderRadius: 3, fontSize: 12,
    fontFamily: 'var(--font-body)',
    pointerEvents: 'none',
    maxWidth: 220,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
};
