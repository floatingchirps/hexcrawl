// Flat-top hexagon geometry
// size = radius (center to vertex)

export const HEX_SIZE = 50;

export function hexCorners(cx, cy, size = HEX_SIZE) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i; // flat-top: start at 0°
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push([
      cx + size * Math.cos(angleRad),
      cy + size * Math.sin(angleRad)
    ]);
  }
  return corners;
}

export function hexToPixel(col, row, size = HEX_SIZE) {
  // Flat-top offset coordinates (odd-column offset)
  const w = 2 * size;
  const h = Math.sqrt(3) * size;
  const colOffset = w * 0.75;
  const rowOffset = h;
  const x = col * colOffset;
  const y = row * rowOffset + (col % 2 !== 0 ? h / 2 : 0);
  return [x, y];
}

export function hexCornerPoints(cx, cy, size = HEX_SIZE) {
  return hexCorners(cx, cy, size)
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

// Convert axial (q,r) coordinates to offset (col, row) for flat-top
export function axialToOffset(q, r) {
  const col = q;
  const row = r + (q - (q & 1)) / 2;
  return [col, row];
}

// Given a hex label like "N2", "SE3-1", compute axial coords
// We store q,r with hexes from the server, so we need to recompute layout
// Instead, we use the ring generation to build a label→pixel map

// Generate all hex positions up to maxRing
// Returns array of { label, cx, cy, col, row, ring }
export function buildHexLayout(maxRing, size = HEX_SIZE) {
  const hexes = [];
  
  // Center
  const [cx0, cy0] = [0, 0];
  hexes.push({ label: '0', col: 0, row: 0, cx: 0, cy: 0, ring: 0 });
  
  for (let ring = 1; ring <= maxRing; ring++) {
    const ringHexes = getRingAxialCoords(ring);
    ringHexes.forEach(({ q, r, label }) => {
      const [col, row] = axialToOffset(q, r);
      const [px, py] = hexToPixel(col, row, size);
      hexes.push({ label, col, row, cx: px, cy: py, ring, q, r });
    });
  }
  
  // Normalize so center is at 0,0 in pixel space
  // Find center hex pixel coords
  const [centerPx, centerPy] = hexToPixel(0, 0, size);
  return hexes.map(h => ({ ...h, cx: h.cx - centerPx, cy: h.cy - centerPy }));
}

function getRingAxialCoords(ringNum) {
  const directions = [
    [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]
  ];
  
  // Corner labels in order (going around from N)
  const cornerLabels = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
  
  let q = 0, r = -ringNum; // Start at N
  const hexes = [];
  
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < ringNum; step++) {
      let label;
      if (step === 0) {
        label = `${cornerLabels[side]}${ringNum}`;
      } else {
        // Interpolate between corners for intermediate positions
        const nextCorner = cornerLabels[(side + 1) % 6];
        const prevCorner = cornerLabels[side];
        // Label intermediate hexes with parent direction
        label = `${prevCorner}${ringNum}`;
        // But we need unique labels — use a position suffix
        label = `${prevCorner}${ringNum}_${step}`;
      }
      hexes.push({ q, r, label });
      q += directions[side][0];
      r += directions[side][1];
    }
  }
  
  return hexes;
}

// Better: assign clean labels based on dominant direction
export function getRingHexesWithLabels(ringNum) {
  if (ringNum === 0) return [{ q: 0, r: 0, label: '0' }];
  
  const directions = [
    [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]
  ];
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
        // For intermediate hexes, use base direction + sequential number
        const key = `${baseDir}${ringNum}`;
        const count = (usedLabels.get(key) || 0) + 1;
        usedLabels.set(key, count);
        label = `${baseDir}${ringNum}-${count}`;
      }
      hexes.push({ q, r, label });
      q += directions[side][0];
      r += directions[side][1];
    }
  }
  
  return hexes;
}

// Rebuild layout with proper labels matching the server
export function buildFullLayout(maxRing, size = HEX_SIZE) {
  const hexes = [];
  
  for (let ring = 0; ring <= maxRing; ring++) {
    const ringHexes = getRingHexesWithLabels(ring);
    ringHexes.forEach(({ q, r, label }) => {
      const [col, row] = axialToOffset(q, r);
      const [px, py] = hexToPixel(col, row, size);
      hexes.push({ label, col, row, cx: px, cy: py, ring, q, r });
    });
  }
  
  // Normalize to center
  const centerHex = hexes.find(h => h.label === '0');
  const offsetX = centerHex ? centerHex.cx : 0;
  const offsetY = centerHex ? centerHex.cy : 0;
  
  return hexes.map(h => ({ ...h, cx: h.cx - offsetX, cy: h.cy - offsetY }));
}

// Get the SVG path for a hex given center coords
export function hexPath(cx, cy, size = HEX_SIZE) {
  const corners = hexCorners(cx, cy, size);
  return corners.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';
}

// Edge midpoints for feature drawing (0=right, 1=bottom-right, 2=bottom-left, 3=left, 4=top-left, 5=top-right)
export function hexEdgeMidpoints(cx, cy, size = HEX_SIZE) {
  const corners = hexCorners(cx, cy, size);
  return corners.map((c, i) => {
    const next = corners[(i + 1) % 6];
    return [(c[0] + next[0]) / 2, (c[1] + next[1]) / 2];
  });
}

export const TERRAIN_COLORS = {
  plains: '#D4E6A5',
  forest: '#7A9E5F',
  'dense forest': '#4A6B3A',
  hills: '#C4A876',
  mountains: '#9A9088',
  swamp: '#7A8A5A',
  desert: '#D4B878',
  'coast / beach': '#E8D5A0',
  'water / sea': '#7AACCF',
  tundra: '#D0D8DC',
  volcanic: '#7A4A3A',
  ruins: '#B0A090',
};

export const TERRAIN_LIST = Object.keys(TERRAIN_COLORS);

export const STATUS_COLORS = {
  unknown: '#888',
  explored: '#4A90D9',
  safe: '#2A6B2A',
  dangerous: '#8B2020',
  cleared: '#D4A017',
};

export const POI_TYPES = {
  Settlement: ['Town', 'Village', 'City', 'Hamlet', 'Outpost', 'Fort', 'Castle'],
  Religious: ['Shrine', 'Temple', 'Monastery', 'Standing Stones', 'Cemetery'],
  Structure: ['Tower', 'Windmill', 'Lighthouse', 'Bridge', 'Ruins', 'Mine'],
  Natural: ['Cave', 'Hot Spring', 'Waterfall', 'Ancient Tree', 'Cliff'],
  Dungeon: ['Dungeon Entrance', 'Lair', 'Tomb', 'Portal'],
  Other: ['Campsite', 'Battlefield', 'Shipwreck', 'Obelisk'],
};
