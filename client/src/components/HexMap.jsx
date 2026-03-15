import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { buildFullLayout, hexPath, hexCornerPoints, hexEdgeMidpoints, TERRAIN_COLORS, STATUS_COLORS, HEX_SIZE } from '../utils/hexGeometry';
import POIIcon from './POIIcons';

const SIZE = HEX_SIZE;

// ─── Module-level feature rendering (z-ordered layer outside HexTile) ───────
const FEATURE_STYLES = {
  road:   { stroke: '#A0897A', width: 4 },
  river:  { stroke: '#7AACCF', width: 4 },
  trail:  { stroke: '#8B6914', width: 3, dash: '5,4' },
  border: { stroke: '#6B3A8B', width: 2.5, dash: '8,3' },
  wall:   { stroke: '#3D2B1F', width: 5 },
};
const FEATURE_Z_ORDER = ['river', 'wall', 'trail', 'border', 'road'];

function hexCorners6(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => [
    cx + SIZE * Math.cos((Math.PI / 180) * 60 * i),
    cy + SIZE * Math.sin((Math.PI / 180) * 60 * i),
  ]);
}

function wrapLabel(text) {
  if (!text) return [text];
  if (text.length <= 11) return [text];
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return [text.slice(0, 10) + '…'];
  const half = text.length / 2;
  let cut = 0, best = 1, bestDiff = Infinity;
  for (let i = 0; i < words.length - 1; i++) {
    cut += words[i].length + 1;
    const diff = Math.abs(cut - half);
    if (diff < bestDiff) { bestDiff = diff; best = i + 1; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function renderFeaturePath(f, key, corners6, cx, cy, edgeMids) {
  try {
    const style = FEATURE_STYLES[f.type] || { stroke: '#888', width: 2 };
    if (f.from != null && f.to != null) {
      const from = Math.round(Number(f.from)), to = Math.round(Number(f.to));
      if (from < 0 || from > 5 || to < 0 || to > 5 || !isFinite(from) || !isFinite(to)) return null;
      const [x1, y1] = corners6[from], [x2, y2] = corners6[to];
      const d = `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
      return <path key={key} d={d} stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} fill="none" strokeLinecap="round" />;
    }
    const edges = f.edges || [];
    if (edges.length < 2) return null;
    const pts = edges.map(e => edgeMids[e]);
    if (pts.some(p => !p)) return null;
    const d = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return <path key={key} d={d} stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} fill="none" strokeLinecap="round" />;
  } catch { return null; }
}

// ─── HexTile ─────────────────────────────────────────────────────────────────
function HexTile({ hex, data, isCenter, isSelected, fadeOpacity, onSelect, onContextMenu, onLongPress, onHover, onHoverEnd, role }) {
  const longPressTimerRef = useRef(null);
  const touchMovedRef = useRef(false);

  // Destructure with defaults so hooks below always run (Rules of Hooks)
  const { cx, cy, label } = hex || { cx: 0, cy: 0, label: '' };

  // Faction tint — hook must be before any conditional return
  const factions = useMemo(() => {
    try {
      const p = JSON.parse(data?.factions || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }, [data?.factions]);

  // Dangers — hook must be before any conditional return
  const dangers = useMemo(() => {
    try {
      const p = JSON.parse(data?.dangers || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }, [data?.dangers]);

  if (!hex) return null; // safe: all hooks already called above

  const terrain = data?.terrain;
  const fillColor = terrain ? (TERRAIN_COLORS[terrain] || '#E8D9BC') : '#E8D9BC';
  const explored = data?.explored;
  const isExplored = explored === 1 || explored === '1' || explored === true;

  // Hide completely transparent hexes (too far from any terrain)
  const opacity = isSelected ? 1 : (isExplored ? 1 : fadeOpacity);
  if (opacity <= 0 && !isSelected) return null;

  const corners = hexCornerPoints(cx, cy);
  const factionColor = factions[0]?.color;

  const SEVERITY_LEVELS = { Minor: 1, Moderate: 2, Severe: 3, Deadly: 4 };
  const maxSeverity = dangers.reduce((max, d) => Math.max(max, SEVERITY_LEVELS[d.severity] || 0), 0);
  const dangerGlowRadius = maxSeverity > 0 ? [0, 0.2, 0.4, 0.6, 0.85][maxSeverity] : 0;
  const dangerGlowId = dangerGlowRadius > 0 ? `danger-glow-${label.replace(/[^a-zA-Z0-9]/g, '_')}` : null;

  // Selection stroke
  const strokeColor = isSelected ? '#D4A017' : isCenter ? '#D4A017' : (isExplored ? 'rgba(139,105,20,0.25)' : 'rgba(196,176,144,0.35)');
  const strokeW = isSelected ? 3.5 : isCenter ? 2 : 0.5;

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect(label); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(label, cx, cy); }}
      onMouseEnter={() => onHover(label, data)}
      onMouseLeave={onHoverEnd}
      onTouchStart={(e) => {
        touchMovedRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
          if (!touchMovedRef.current) {
            e.preventDefault();
            onLongPress(label, cx, cy);
          }
        }, 500);
      }}
      onTouchMove={() => { touchMovedRef.current = true; clearTimeout(longPressTimerRef.current); }}
      onTouchEnd={() => { clearTimeout(longPressTimerRef.current); }}
      style={{ cursor: 'pointer' }}
      opacity={opacity}
    >
      {/* Selection glow */}
      {isSelected && (
        <polygon points={corners} fill="none"
          stroke="rgba(212,160,23,0.35)" strokeWidth={8} />
      )}

      {/* Base fill */}
      <polygon
        points={corners}
        fill={isExplored ? fillColor : '#E8D9BC'}
        stroke={strokeColor}
        strokeWidth={strokeW}
      />


      {/* Danger glow */}
      {dangerGlowId && isExplored && (
        <>
          <defs>
            <radialGradient id={dangerGlowId}>
              <stop offset="0%" stopColor="transparent" />
              <stop offset={`${(1 - dangerGlowRadius) * 100}%`} stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(180,30,30,0.35)" />
            </radialGradient>
          </defs>
          <polygon points={corners} fill={`url(#${dangerGlowId})`} />
        </>
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

      {/* Hex label */}
      <text
        x={cx}
        y={cy + SIZE * 0.72}
        textAnchor="middle"
        fontSize={7}
        fill={isExplored ? '#8B6914' : '#C4B090'}
        fontFamily="var(--font-heading)"
        letterSpacing="0.05em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {label}
      </text>

      {/* POI name — up to 2 lines, word-wrapped */}
      {data?.poi_name && isExplored && (() => {
        const lines = wrapLabel(data.poi_name);
        return (
          <text x={cx} textAnchor="middle" fontSize={6.5} fill="#3D2B1F"
            fontFamily="var(--font-body)" fontStyle="italic"
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {lines.length === 2 ? (
              <>
                <tspan x={cx} y={cy + SIZE * 0.28}>{lines[0]}</tspan>
                <tspan x={cx} dy="9">{lines[1]}</tspan>
              </>
            ) : (
              <tspan x={cx} y={cy + SIZE * 0.42}>{lines[0]}</tspan>
            )}
          </text>
        );
      })()}
    </g>
  );
}

export default function HexMap({ hexData, ringCount, role, selectedHex, isMobile, centerTrigger, onHexSelect, onHexDeselect, onHexContextMenu }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragButton, setDragButton] = useState(null);
  const [didDrag, setDidDrag] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });
  const longPressRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTouchDist = useRef(null);

  const hexLayout = useMemo(() => buildFullLayout(ringCount, SIZE), [ringCount]);
  const hexMap = useMemo(() => {
    const m = {};
    hexData.forEach(h => m[h.label] = h);
    return m;
  }, [hexData]);

  // Compute opacity for each hex based on distance to nearest hex with terrain
  const fadeMap = useMemo(() => {
    const NEIGHBOR_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    // Build coord→label lookup
    const coordToLabel = {};
    hexLayout.forEach(h => {
      if (h.q !== undefined && h.r !== undefined) {
        coordToLabel[`${h.q},${h.r}`] = h.label;
      }
    });
    const labelToCoord = {};
    hexLayout.forEach(h => {
      if (h.q !== undefined && h.r !== undefined) {
        labelToCoord[h.label] = [h.q, h.r];
      }
    });

    // BFS from all hexes that have terrain data
    const dist = {};
    const queue = [];
    hexLayout.forEach(h => {
      const d = hexMap[h.label];
      const hasTerrain = d?.terrain;
      if (hasTerrain) {
        dist[h.label] = 0;
        queue.push(h.label);
      }
    });

    let qi = 0;
    while (qi < queue.length) {
      const label = queue[qi++];
      const coord = labelToCoord[label];
      if (!coord) continue;
      const [q, r] = coord;
      for (const [dq, dr] of NEIGHBOR_DIRS) {
        const nKey = `${q + dq},${r + dr}`;
        const nLabel = coordToLabel[nKey];
        if (nLabel && dist[nLabel] === undefined) {
          dist[nLabel] = dist[label] + 1;
          queue.push(nLabel);
        }
      }
    }

    // If no hex has terrain yet, show everything at full opacity
    if (queue.length === 0) {
      const result = {};
      hexLayout.forEach(h => { result[h.label] = 1; });
      return result;
    }

    // Convert distance to opacity
    const result = {};
    hexLayout.forEach(h => {
      const d = dist[h.label];
      if (d === undefined || d >= 4) result[h.label] = 0;
      else if (d === 0) result[h.label] = 1;
      else result[h.label] = Math.pow(0.5, d); // 0.5, 0.25, 0.125
    });
    return result;
  }, [hexLayout, hexMap]);

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

  // Center on selected hex: always on mobile, or when centerTrigger fires (e.g. search)
  const prevCenterTrigger = useRef(centerTrigger);
  useEffect(() => {
    const isExplicit = centerTrigger !== prevCenterTrigger.current;
    prevCenterTrigger.current = centerTrigger;
    if (!selectedHex || !svgRef.current) return;
    if (!isMobile && !isExplicit) return; // desktop: only center on explicit trigger
    const hex = hexLayout.find(h => h.label === selectedHex);
    if (!hex) return;
    const rect = svgRef.current.getBoundingClientRect();
    const bottomPanelH = isMobile ? window.innerHeight * 0.4 : 0;
    const visibleH = window.innerHeight - rect.top - bottomPanelH;
    setTransform(t => ({
      ...t,
      x: rect.width / 2 - hex.cx * t.scale,
      y: visibleH / 2 - hex.cy * t.scale,
    }));
  }, [selectedHex, isMobile, centerTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan: right-click drag (button 2) or middle-click drag (button 1)
  function handleMouseDown(e) {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      setDragging(true);
      setDragButton(e.button);
      setDidDrag(false);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }

  function handleMouseMove(e) {
    if (!dragging || !dragStart) return;
    setDidDrag(true);
    setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }

  function handleMouseUp(e) {
    if (dragging) {
      setDragging(false);
      setDragStart(null);
      setDragButton(null);
    }
  }

  // Prevent native context menu on the SVG (we handle right-click ourselves)
  function handleContextMenu(e) {
    e.preventDefault();
  }

  function handleWheel(e) {
    e.preventDefault();
    if (!svgRef.current) return;
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

  // Touch: single finger pan, two finger pinch-zoom
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, tx: transform.x, ty: transform.y };
      setDidDrag(false);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }

  // Attached manually as non-passive so e.preventDefault() is allowed (prevents browser scroll/zoom)
  useEffect(() => {
    function handleTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && touchStartRef.current) {
        const t = e.touches[0];
        // Capture ref values immediately — the functional updater runs async so
        // touchStartRef.current could be null by then (touchend race condition)
        const { x: startX, y: startY, tx: startTX, ty: startTY } = touchStartRef.current;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setDidDrag(true);
        setTransform(tr => ({
          ...tr,
          x: startTX + dx,
          y: startTY + dy,
        }));
      } else if (e.touches.length === 2 && lastTouchDist.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = dist / lastTouchDist.current;
        lastTouchDist.current = dist;
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const px = mx - rect.left;
        const py = my - rect.top;
        setTransform(t => {
          const newScale = Math.max(0.2, Math.min(4, t.scale * delta));
          const factor = newScale / t.scale;
          return { scale: newScale, x: px + (t.x - px) * factor, y: py + (t.y - py) * factor };
        });
      }
    }
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => svg.removeEventListener('touchmove', handleTouchMove);
  }, []); // only refs + functional setState used inside — no stale closure risk

  function handleTouchEnd() {
    touchStartRef.current = null;
    lastTouchDist.current = null;
  }

  // Left-click on empty space deselects
  function handleSvgClick(e) {
    // Deselect if click lands on the SVG itself or the <g> transform group (empty map space)
    // Hex tiles call stopPropagation so their clicks don't reach here
    if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'g') {
      onHexDeselect();
    }
  }

  function handleHexContextMenuWithScreenPos(label, cx, cy) {
    const rect = svgRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const screenX = cx * transform.scale + transform.x + rect.left;
    const screenY = cy * transform.scale + transform.y + rect.top;
    onHexContextMenu(label, { x: screenX, y: screenY });
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
        style={{ cursor: dragging ? 'grabbing' : 'default', display: 'block', touchAction: 'none', userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onClick={handleSvgClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {hexLayout.map(hex => (
            <HexTile
              key={hex.label}
              hex={hex}
              data={hexMap[hex.label]}
              isCenter={hex.label === '0'}
              isSelected={selectedHex === hex.label}
              fadeOpacity={fadeMap[hex.label] ?? 0}
              onSelect={onHexSelect}
              onContextMenu={handleHexContextMenuWithScreenPos}
              onLongPress={handleHexContextMenuWithScreenPos}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
              role={role}
            />
          ))}

          {/* Feature layer — rendered after ALL tiles so features always appear on top.
              Ordered by type so roads > borders > trails > walls > rivers (z-order). */}
          {FEATURE_Z_ORDER.map(type =>
            hexLayout.flatMap(hex => {
              const data = hexMap[hex.label];
              if (!data?.explored) return [];
              let features;
              try { features = JSON.parse(data.features || '[]'); } catch { return []; }
              if (!Array.isArray(features)) return [];
              return features
                .filter(f => f.type === type)
                .map((f, i) => renderFeaturePath(
                  f,
                  `${hex.label}-${type}-${i}`,
                  hexCorners6(hex.cx, hex.cy),
                  hex.cx, hex.cy,
                  hexEdgeMidpoints(hex.cx, hex.cy, SIZE)
                ))
                .filter(Boolean);
            })
          )}
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
