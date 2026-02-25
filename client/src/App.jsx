import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginModal from './components/LoginModal';
import OnboardingModal from './components/OnboardingModal';
import HexMap from './components/HexMap';
import RadialMenu from './components/RadialMenu';
import HexEditPanel from './components/HexEditPanel';
import HamburgerMenu from './components/HamburgerMenu';
import { getStoredRole, fetchHexes, fetchMeta } from './utils/api';

export default function App() {
  const [role, setRole] = useState(null);
  const [hexData, setHexData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  // Radial menu state
  const [radialMenu, setRadialMenu] = useState(null); // { x, y, hexLabel }
  // Edit panel state
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

  // When a hex is clicked, show radial menu at click position
  function handleHexClick(label) {
    // Close existing panels when clicking a different hex
    if (editPanel && editPanel.hexLabel !== label) {
      setEditPanel(null);
    }
    // Use center of screen if no event available
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    setRadialMenu({ x, y, hexLabel: label });
  }

  // Handle SVG click to get position
  const mapRef = useRef(null);
  function handleHexClickWithPos(label, e) {
    if (editPanel && editPanel.hexLabel !== label) setEditPanel(null);
    const x = e?.clientX || window.innerWidth / 2;
    const y = e?.clientY || window.innerHeight / 2;
    setRadialMenu({ x, y, hexLabel: label });
  }

  function handleRadialSelect(panelType) {
    if (!radialMenu) return;
    setEditPanel({ hexLabel: radialMenu.hexLabel, panelType });
    setRadialMenu(null);
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

  const currentHexData = editPanel
    ? hexData.find(h => h.label === editPanel.hexLabel)
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
      <HexMapWithClick
        hexData={hexData}
        ringCount={ringCount}
        role={role}
        onHexClickWithPos={handleHexClickWithPos}
      />

      {/* Radial menu */}
      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          onSelect={handleRadialSelect}
          onClose={() => setRadialMenu(null)}
          role={role}
        />
      )}

      {/* Edit panel */}
      {editPanel && (
        <div style={{
          position: 'fixed',
          right: 20, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 400,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}>
          <HexEditPanel
            hexLabel={editPanel.hexLabel}
            hexData={currentHexData}
            panelType={editPanel.panelType}
            onClose={handlePanelClose}
            onSave={handlePanelSave}
            role={role}
          />
        </div>
      )}

      {/* Hamburger menu */}
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

// Wrapper to capture mouse position on hex click
function HexMapWithClick({ hexData, ringCount, role, onHexClickWithPos }) {
  const svgWrapperRef = useRef(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      ref={svgWrapperRef}
      style={{ width: '100%', height: '100%' }}
      onMouseMove={handleMouseMove}
    >
      <HexMap
        hexData={hexData}
        ringCount={ringCount}
        role={role}
        onHexClick={(label) => onHexClickWithPos(label, lastMousePos)}
      />
    </div>
  );
}

const styles = {
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
