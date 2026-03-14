import React, { useState, useEffect, useMemo } from 'react';
import LoginModal from './components/LoginModal';
import OnboardingModal from './components/OnboardingModal';
import HexMap from './components/HexMap';
import RadialMenu from './components/RadialMenu';
import HexEditPanel from './components/HexEditPanel';
import HexInfoPanel from './components/HexInfoPanel';
import HamburgerMenu from './components/HamburgerMenu';
import { getStoredRole, logout, fetchHexes, fetchMeta, updateHex } from './utils/api';

const TITLEBAR_HEIGHT = 48;

export default function App() {
  const [role, setRole] = useState(null);
  const [hexData, setHexData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  // DM view mode: 'shared' = player map, 'dm' = DM-only map
  const [viewMode, setViewMode] = useState('shared');

  // Sidebar open/closed
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Selection state — left-click selects a hex
  const [selectedHex, setSelectedHex] = useState(null);
  // Radial menu state — right-click opens it
  const [radialMenu, setRadialMenu] = useState(null); // { x, y, hexLabel }
  // Edit panel state — opened from radial menu or info panel
  const [editPanel, setEditPanel] = useState(null); // { hexLabel, panelType }

  // Mobile detection
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 768;

  const isDMView = role === 'dm' && viewMode === 'dm';
  const roleLabel = isDMView ? 'DM Map' : role === 'dm' ? 'Player Map (DM)' : role === 'player' ? 'Player' : '';

  // Restore session
  useEffect(() => {
    const r = getStoredRole();
    if (r) setRole(r);
  }, []);

  // Load data when role or viewMode changes
  useEffect(() => {
    if (!role) { setLoading(false); return; }
    loadAll();
  }, [role, viewMode]);

  async function loadAll() {
    setLoading(true);
    try {
      const mapOwner = role === 'dm' ? viewMode : 'shared';
      const [hexes, m] = await Promise.all([fetchHexes(mapOwner), fetchMeta(mapOwner)]);
      setHexData(hexes);
      setMeta(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(r) { setRole(r); }
  function handleLogout() {
    logout();
    setRole(null);
    setHexData([]);
    setMeta({});
    setSelectedHex(null);
    setSidebarOpen(true);
    setRadialMenu(null);
    setEditPanel(null);
    setViewMode('shared');
  }
  function handleOnboardingComplete() { loadAll(); }

  // Current map owner for API calls
  const currentMap = role === 'dm' ? viewMode : 'shared';

  // Left-click on a hex selects it and opens sidebar
  function handleHexSelect(label) {
    setSelectedHex(label);
    setSidebarOpen(true);
    setRadialMenu(null);
  }

  // Left-click outside hexes deselects and closes sidebar
  function handleHexDeselect() {
    setSelectedHex(null);
    setSidebarOpen(false);
    setEditPanel(null);
    setRadialMenu(null);
  }

  // Right-click on a hex opens radial menu (does NOT select)
  function handleHexContextMenu(label, pos) {
    const x = pos?.x ?? window.innerWidth / 2;
    const y = pos?.y ?? window.innerHeight / 2;
    setRadialMenu({ x, y, hexLabel: label });
  }

  // Radial menu select — opens edit panel
  function handleRadialSelect(panelType) {
    if (!radialMenu) return;
    setEditPanel({ hexLabel: radialMenu.hexLabel, panelType });
    setRadialMenu(null);
  }

  // Direct apply handlers from radial submenus
  async function handleTerrainApply(terrain) {
    if (!radialMenu) return;
    const hexLabel = radialMenu.hexLabel;
    setRadialMenu(null);
    try {
      const result = await updateHex(hexLabel, { terrain, explored: 1 }, currentMap);
      setHexData(prev => prev.map(h => h.label === result.label ? result : h));
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePOIApply(poi_type) {
    if (!radialMenu) return;
    const hexLabel = radialMenu.hexLabel;
    setRadialMenu(null);
    try {
      const result = await updateHex(hexLabel, { poi_type, explored: 1 }, currentMap);
      setHexData(prev => prev.map(h => h.label === result.label ? result : h));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStatusApply(status) {
    if (!radialMenu) return;
    const hexLabel = radialMenu.hexLabel;
    setRadialMenu(null);
    try {
      const result = await updateHex(hexLabel, { status }, currentMap);
      setHexData(prev => prev.map(h => h.label === result.label ? result : h));
    } catch (err) {
      console.error(err);
    }
  }

  // Open edit panel from info panel's "add" dropdown
  function handleOpenRadialSection(panelType) {
    if (!selectedHex) return;
    setEditPanel({ hexLabel: selectedHex, panelType });
  }

  function handlePanelSave(updatedHex) {
    setHexData(prev => prev.map(h => h.label === updatedHex.label ? updatedHex : h));
  }

  function handlePanelClose() { setEditPanel(null); }
  function handleRingChange() { loadAll(); }

  // Toggle DM view
  function handleViewToggle() {
    const next = viewMode === 'shared' ? 'dm' : 'shared';
    setViewMode(next);
    setSelectedHex(null);
    setSidebarOpen(true);
    setRadialMenu(null);
    setEditPanel(null);
  }

  const selectedHexData = selectedHex
    ? hexData.find(h => h.label === selectedHex) || null
    : null;

  const editHexData = editPanel
    ? hexData.find(h => h.label === editPanel.hexLabel) || null
    : null;

  const ringCount = parseInt(meta.current_ring_count || '4');
  const onboardingNeeded = role && meta.onboarding_complete === '0' && !loading;

  if (!role) return <LoginModal onLogin={handleLogin} />;
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--parchment)', fontFamily: 'var(--font-heading)', color: 'var(--ink)', letterSpacing: '0.2em', fontSize: 14 }}>
      Loading the realm…
    </div>
  );

  const sidebarWidth = 300;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* ─── Titlebar ─── */}
      <div style={{
        ...styles.titlebar,
        background: isDMView ? '#1A0D05' : 'var(--ink)',
        borderBottom: isDMView ? '2px solid var(--gold)' : 'none',
      }}>
        <div style={styles.titlebarLeft}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={styles.titlebarBtn}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          {!isMobile && (
            <input
              type="text"
              placeholder="Search…"
              style={styles.searchInput}
              readOnly
              title="Search (coming soon)"
            />
          )}
        </div>

        <div style={styles.titlebarCenter}>
          <span style={{
            ...styles.titleRole,
            color: isDMView ? 'var(--gold)' : 'var(--ink-faded)',
          }}>{roleLabel}</span>
          {meta.map_name && (
            <>
              <span style={styles.titleSep}>—</span>
              <span style={styles.titleMap}>{meta.map_name}</span>
            </>
          )}
        </div>

        <div style={styles.titlebarRight}>
          {/* DM view toggle */}
          {role === 'dm' && (
            <button
              onClick={handleViewToggle}
              style={{
                ...styles.titlebarBtn,
                marginRight: 8,
                fontSize: 11,
                width: 'auto',
                padding: '0 10px',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.08em',
                color: isDMView ? 'var(--gold)' : 'var(--parchment)',
                borderColor: isDMView ? 'var(--gold)' : 'rgba(196,176,144,0.3)',
              }}
              title={isDMView ? 'Switch to Player Map' : 'Switch to DM Map'}
            >
              {isDMView ? '⚑ Player Map' : '🗝 DM Map'}
            </button>
          )}
          <HamburgerMenu role={role} viewMode={viewMode} onRingChange={handleRingChange} onLogout={handleLogout} />
        </div>
      </div>

      {/* ─── Sidebar / Bottom sheet ─── */}
      <div style={isMobile ? {
        ...styles.bottomSheet,
        transform: sidebarOpen ? 'translateY(0)' : 'translateY(100%)',
      } : {
        ...styles.sidebar,
        width: sidebarWidth,
        transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
      }}>
        {selectedHex ? (
          <HexInfoPanel
            hexLabel={selectedHex}
            hexData={selectedHexData}
            role={role}
            onClose={() => setSelectedHex(null)}
            onOpenRadialSection={handleOpenRadialSection}
          />
        ) : (
          <div style={styles.sidebarEmpty}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: 8 }}>
              No hex selected
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-light)', lineHeight: 1.5 }}>
              Click a hex on the map to view its details, or right-click to edit.
            </p>
          </div>
        )}
      </div>

      {/* ─── Map area ─── */}
      <div style={{
        position: 'absolute',
        top: TITLEBAR_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        <HexMap
          hexData={hexData}
          ringCount={ringCount}
          role={role}
          selectedHex={selectedHex}
          onHexSelect={handleHexSelect}
          onHexDeselect={handleHexDeselect}
          onHexContextMenu={handleHexContextMenu}
        />
      </div>

      {/* ─── Radial menu ─── */}
      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          onSelect={handleRadialSelect}
          onTerrainApply={handleTerrainApply}
          onPOIApply={handlePOIApply}
          onStatusApply={handleStatusApply}
          onClose={() => setRadialMenu(null)}
          role={role}
        />
      )}

      {/* ─── Edit panel (right side) ─── */}
      {editPanel && (
        <div style={styles.editPanelWrapper}>
          <HexEditPanel
            hexLabel={editPanel.hexLabel}
            hexData={editHexData}
            panelType={editPanel.panelType}
            onClose={handlePanelClose}
            onSave={handlePanelSave}
            role={role}
            mapOwner={currentMap}
          />
        </div>
      )}

      {/* ─── Onboarding ─── */}
      {onboardingNeeded && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

const styles = {
  // ── Titlebar ──
  titlebar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: TITLEBAR_HEIGHT,
    background: 'var(--ink)',
    color: 'var(--parchment)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    gap: 12,
  },
  titlebarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  titlebarBtn: {
    width: 34, height: 34,
    background: 'none',
    border: '1.5px solid rgba(196,176,144,0.3)',
    borderRadius: 4,
    color: 'var(--parchment)',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  searchInput: {
    width: 180,
    height: 32,
    background: 'rgba(242,232,213,0.1)',
    border: '1px solid rgba(196,176,144,0.25)',
    borderRadius: 4,
    padding: '0 10px',
    color: 'var(--parchment)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    cursor: 'default',
  },
  titlebarCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  titleRole: {
    fontFamily: 'var(--font-heading)',
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--ink-faded)',
    flexShrink: 0,
  },
  titleSep: {
    color: 'var(--ink-faded)',
    fontSize: 13,
  },
  titleMap: {
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    letterSpacing: '0.06em',
    color: 'var(--parchment)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titlebarRight: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  // ── Sidebar ──
  sidebar: {
    position: 'fixed',
    top: TITLEBAR_HEIGHT,
    left: 0,
    bottom: 0,
    background: 'var(--parchment)',
    borderRight: '1.5px solid var(--parchment-dark)',
    boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
    zIndex: 500,
    transition: 'transform 0.25s ease',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarEmpty: {
    padding: '24px 16px',
    textAlign: 'center',
  },

  // ── Bottom sheet (mobile) ──
  bottomSheet: {
    position: 'fixed',
    left: 0, right: 0,
    bottom: 0,
    height: '50vh',
    background: 'var(--parchment)',
    borderTop: '1.5px solid var(--parchment-dark)',
    boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
    zIndex: 500,
    transition: 'transform 0.25s ease',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px 12px 0 0',
  },

  // ── Edit panel ──
  editPanelWrapper: {
    position: 'fixed',
    right: 20,
    top: TITLEBAR_HEIGHT + 20,
    zIndex: 400,
    maxHeight: `calc(100vh - ${TITLEBAR_HEIGHT + 40}px)`,
    overflowY: 'auto',
  },
};
