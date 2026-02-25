import React, { useState, useRef, useEffect } from 'react';
import { addRing, removeRing, exportJSON, exportCSV, importJSONData } from '../utils/api';

export default function HamburgerMenu({ role, onRingChange, onImport }) {
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleAddRing() {
    await addRing();
    onRingChange();
    setOpen(false);
  }

  async function handleRemoveRing() {
    const result = await removeRing(false);
    if (result.needs_confirm) {
      setConfirmRemove(result);
    } else if (result.ok || result.populated_count === 0) {
      await removeRing(true);
      onRingChange();
      setOpen(false);
    }
  }

  async function confirmRemoveRing() {
    await removeRing(true);
    setConfirmRemove(null);
    onRingChange();
    setOpen(false);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (window.confirm('This will replace all map data. Continue?')) {
        await importJSONData(data);
        onImport();
      }
    };
    input.click();
    setOpen(false);
  }

  function handlePrint() {
    window.print();
    setOpen(false);
  }

  return (
    <div ref={ref} style={styles.wrapper}>
      <button onClick={() => setOpen(o => !o)} style={styles.hamburger} title="Menu">
        ☰
      </button>

      {open && (
        <div style={styles.drawer}>
          <div style={styles.drawerTitle}>Menu</div>

          <div style={styles.section}>Map Rings</div>
          <MenuItem icon="+" label="Add Ring" onClick={handleAddRing} />
          {role === 'dm' && <MenuItem icon="−" label="Remove Outer Ring" onClick={handleRemoveRing} />}

          <div style={styles.section}>Export</div>
          <MenuItem icon="↓" label="Export as PNG" onClick={() => { alert('Use Ctrl+P or browser print to save as PDF/image.'); setOpen(false); }} />
          <MenuItem icon="↓" label="Export as JSON" onClick={() => { exportJSON(); setOpen(false); }} />
          <MenuItem icon="↓" label="Export as CSV" onClick={() => { exportCSV(); setOpen(false); }} />

          {role === 'dm' && <>
            <div style={styles.section}>Import</div>
            <MenuItem icon="↑" label="Import JSON" onClick={handleImport} />
          </>}

          <div style={styles.section}>View</div>
          <MenuItem icon="⎙" label="Print View" onClick={handlePrint} />

          <div style={styles.section}>About</div>
          <MenuItem icon="ℹ" label="About HexCrawl" onClick={() => {
            alert('HexCrawl Map Tracker\nA collaborative TTRPG hex map tool.\n\nBuilt with React + Express + SQLite.');
            setOpen(false);
          }} />
        </div>
      )}

      {confirmRemove && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 12 }}>
              ⚠ Warning
            </p>
            <p style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              The outer ring contains {confirmRemove.populated_count} populated hex{confirmRemove.populated_count !== 1 ? 'es' : ''}.
              Removing it will permanently delete this data.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmRemoveRing} style={styles.confirmBtn}>Remove Anyway</button>
              <button onClick={() => setConfirmRemove(null)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={styles.menuItem}>
      <span style={styles.menuIcon}>{icon}</span>
      {label}
    </button>
  );
}

const styles = {
  wrapper: {
    position: 'fixed', top: 16, left: 16, zIndex: 300,
  },
  hamburger: {
    width: 40, height: 40,
    background: 'var(--parchment)',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 4, fontSize: 18,
    color: 'var(--ink)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer', fontFamily: 'monospace',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  drawer: {
    position: 'absolute', top: 48, left: 0,
    width: 220,
    background: 'var(--parchment)',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 4,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  drawerTitle: {
    padding: '10px 16px',
    fontFamily: 'var(--font-heading)',
    fontSize: 13, letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
    borderBottom: '1px solid var(--parchment-dark)',
  },
  section: {
    padding: '6px 16px 2px',
    fontSize: 10,
    fontFamily: 'var(--font-heading)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--ink-faded)',
    marginTop: 4,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '8px 16px',
    background: 'none', border: 'none',
    fontSize: 13, fontFamily: 'var(--font-body)',
    color: 'var(--ink)', cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  menuIcon: {
    width: 16, textAlign: 'center',
    fontFamily: 'monospace',
  },
  confirmOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(42,26,10,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  confirmBox: {
    background: 'var(--parchment)',
    border: '2px solid var(--danger-red)',
    borderRadius: 4, padding: 24,
    maxWidth: 320,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  confirmBtn: {
    flex: 1, padding: '8px',
    background: 'var(--danger-red)', color: 'white',
    border: 'none', borderRadius: 3,
    fontFamily: 'var(--font-heading)', fontSize: 12,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: '8px',
    background: 'var(--parchment-dark)',
    border: '1px solid var(--ink-faded)',
    borderRadius: 3,
    fontFamily: 'var(--font-heading)', fontSize: 12,
    color: 'var(--ink)', cursor: 'pointer',
  },
};
