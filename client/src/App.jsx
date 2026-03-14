import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginModal from './components/LoginModal';
import OnboardingModal from './components/OnboardingModal';
import HexMap from './components/HexMap';
import RadialMenu from './components/RadialMenu';
import HexEditPanel from './components/HexEditPanel';
import HexInfoPanel from './components/HexInfoPanel';
import HamburgerMenu from './components/HamburgerMenu';
import { getStoredRole, fetchHexes, fetchMeta } from './utils/api';

export default function App() {
  const [role, setRole] = useState(null);
  const [hexData, setHexData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  // Selection state — left-click selects a hex
  const [selectedHex, setSelectedHex] = useState(null);
  // Radial menu state — right-click opens it
  const [radialMenu, setRadialMenu] = useState(null); // { x, y, hexLabel }
  // Edit panel state — opened from radial menu or info panel
  const [editPanel, setEditPanel] = useState(null); // { hexLabel, panelType }

  // Role bar label
  const roleLabel = role === 'dm' ? '⚔ Dungeon Master' : role === 'player' ? '⚔ Player' : '';

  // Restore session
  useEffect(() => {
    const r = getStoredRole();
    if (r) setRole(r);
  }, []);

  // Load data when role is set
  useEffect(() => {
    if (!role) { setLoading(false); return; }
    loadAll();
  }, [role]);

  async function loadAll() {
    setLoading(true);
    try {
      const [hexes, m] = await Promise.all([fetchHexes(), fetchMeta()]);
      setHexData(hexes);
      setMeta(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(r) {
    setRole(r);
  }

  function handleOnboardingComplete() {
    loadAll();
  }

  // Left-click on a hex selects it and opens the info panel
  function handleHexSelect(label) {
    setSelectedHex(label);
    setRadialMenu(null);
  }

  // Left-click outside hexes deselects
  function handleHexDeselect() {
    setSelectedHex(null);
    setEditPanel(null);
    setRadialMenu(null);
  }

  // Right-click on a hex opens radial menu
  function handleHexContextMenu(label, pos) {
    setSelectedHex(label);
    const x = pos?.x ?? window.innerWidth / 2;
    const y = pos?.y ?? window.innerHeight / 2;
    setRadialMenu({ x, y, hexLabel: label });
  }

  // Select a section from radial menu → open edit panel
  function handleRadialSelect(panelType) {
    if (!radialMenu) return;
    setEditPanel({ hexLabel: radialMenu.hexLabel, panelType });
    setRadialMenu(null);
  }

  // Open edit panel from info panel's "add" dropdown
  function handleOpenRadialSection(panelType) {
    if (!selectedHex) return;
    setEditPanel({ hexLabel: selectedHex, panelType });
  }

  function handlePanelSave(updatedHex) {
    setHexData(prev => prev.map(h => h.label === updatedHex.label ? updatedHex : h));
  }

  function handlePanelClose() {
    setEditPanel(null);
  }

  function handleRingChange() {
    loadAll();
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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Map */}
      <HexMap
        hexData={hexData}
        ringCount={ringCount}
        role={role}
        selectedHex={selectedHex}
        onHexSelect={handleHexSelect}
        onHexDeselect={handleHexDeselect}
        onHexContextMenu={handleHexContextMenu}
      />

      {/* Info panel (left side) — shown when a hex is selected */}
      {selectedHex && (
        <div style={styles.infoPanelWrapper}>
          <HexInfoPanel
            hexLabel={selectedHex}
            hexData={selectedHexData}
            role={role}
            onClose={handleHexDeselect}
            onOpenRadialSection={handleOpenRadialSection}
          />
        </div>
      )}

      {/* Radial menu (right-click) */}
      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          onSelect={handleRadialSelect}
          onClose={() => setRadialMenu(null)}
          role={role}
        />
      )}

      {/* Edit panel (right side) — opened from radial menu or info panel dropdown */}
      {editPanel && (
        <div style={styles.editPanelWrapper}>
          <HexEditPanel
            hexLabel={editPanel.hexLabel}
            hexData={editHexData}
            panelType={editPanel.panelType}
            onClose={handlePanelClose}
            onSave={handlePanelSave}
            role={role}
          />
        </div>
      )}

      {/* Hamburger menu (top-right) */}
      <HamburgerMenu role={role} onRingChange={handleRingChange} onImport={loadAll} />

      {/* Role indicator */}
      <div style={styles.roleBar}>
        <span style={{ fontSize: 11, color: 'var(--ink-faded)', fontFamily: 'var(--font-heading)', letterSpacing: '0.15em' }}>
          {roleLabel}
        </span>
        {meta.map_name && (
          <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-heading)', letterSpacing: '0.08em', marginLeft: 12 }}>
            {meta.map_name}
          </span>
        )}
      </div>

      {/* Onboarding */}
      {onboardingNeeded && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

const styles = {
  infoPanelWrapper: {
    position: 'fixed',
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 400,
  },
  editPanelWrapper: {
    position: 'fixed',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 400,
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  roleBar: {
    position: 'fixed', bottom: 16, left: 16,
    display: 'flex', alignItems: 'center',
    gap: 4,
    background: 'rgba(242,232,213,0.85)',
    border: '1px solid var(--ink-faded)',
    borderRadius: 3, padding: '5px 12px',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
};
