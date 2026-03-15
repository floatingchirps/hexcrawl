import React, { useState, useRef, useEffect } from 'react';
import { addRing, removeRing, exportJSON, resetMap, updateMeta, copyFromPlayer } from '../utils/api';

export default function HamburgerMenu({ role, viewMode = 'shared', onRingChange, onLogout, meta, onMetaChange }) {
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [resetStep, setResetStep] = useState(0); // 0=none, 1=first warning, 2=final warning
  const [editingMapName, setEditingMapName] = useState(false);
  const [mapNameInput, setMapNameInput] = useState('');
  const [copyingPlayer, setCopyingPlayer] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setResetStep(0);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleAddRing() {
    await addRing(viewMode);
    onRingChange();
    setOpen(false);
  }

  async function handleRemoveRing() {
    const result = await removeRing(false, viewMode);
    if (result.needs_confirm) {
      setConfirmRemove(result);
    } else if (result.ok || result.populated_count === 0) {
      await removeRing(true, viewMode);
      onRingChange();
      setOpen(false);
    }
  }

  async function confirmRemoveRing() {
    await removeRing(true, viewMode);
    setConfirmRemove(null);
    onRingChange();
    setOpen(false);
  }

  async function handleCopyFromPlayer() {
    setCopyingPlayer(true);
    try {
      const result = await copyFromPlayer();
      onRingChange();
      setOpen(false);
    } catch (err) {
      console.error('Copy from player failed:', err);
    } finally {
      setCopyingPlayer(false);
    }
  }

  async function saveMapName() {
    try {
      await updateMeta({ map_name: mapNameInput }, viewMode);
      onMetaChange?.();
      setEditingMapName(false);
    } catch (err) {
      console.error('Failed to save map name:', err);
    }
  }

  async function handleDownloadBackup() {
    await exportJSON(viewMode);
  }

  async function handleResetConfirmed() {
    await resetMap(viewMode);
    setResetStep(0);
    setOpen(false);
    onRingChange(); // reload all data
  }

  function handlePrint() {
    window.print();
    setOpen(false);
  }

  return (
    <div ref={ref} style={styles.wrapper}>
      <button onClick={() => { setOpen(o => !o); setResetStep(0); }} style={styles.hamburger} title="Menu">
        ☰
      </button>

      {open && (
        <div style={styles.drawer}>
          <div style={styles.drawerTitle}>Menu</div>

          <div style={styles.section}>Map Rings</div>
          <MenuItem icon="+" label="Add Ring" onClick={handleAddRing} />
          {role === 'dm' && <MenuItem icon="−" label="Remove Outer Ring" onClick={handleRemoveRing} />}

          {role === 'dm' && <>
            <div style={styles.section}>Map Settings</div>
            {viewMode === 'dm' && (
              <MenuItem icon="⇄" label={copyingPlayer ? 'Copying…' : 'Copy All from Player Map'} onClick={handleCopyFromPlayer} />
            )}
            {editingMapName ? (
              <div style={{ padding: '4px 12px 8px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={mapNameInput}
                    onChange={e => setMapNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMapName(); if (e.key === 'Escape') setEditingMapName(false); }}
                    autoFocus
                    placeholder="Map name…"
                    style={{ flex: 1, padding: '5px 8px', fontSize: 13, border: '1.5px solid var(--gold)', borderRadius: 3, fontFamily: 'var(--font-body)', background: 'var(--parchment-light)' }}
                  />
                  <button onClick={saveMapName} style={{ ...styles.cancelBtn, flex: 'none', borderColor: 'var(--gold)', color: 'var(--gold-dark)' }}>✓</button>
                </div>
              </div>
            ) : (
              <MenuItem icon="✎" label={meta?.map_name ? `Rename: ${meta.map_name}` : 'Set Map Name'} onClick={() => { setMapNameInput(meta?.map_name || ''); setEditingMapName(true); }} />
            )}
          </>}

          <div style={styles.section}>Export</div>
          <MenuItem icon="⎙" label="Export as PNG (Print)" onClick={handlePrint} />

          {role === 'dm' && <>
            <div style={styles.section}>Danger Zone</div>
            <MenuItem icon="⟳" label="Reset Map" onClick={() => setResetStep(1)} danger />
          </>}

          <div style={styles.divider} />
          <MenuItem icon="↩" label="Log Out" onClick={() => { setOpen(false); onLogout(); }} />
        </div>
      )}

      {/* Remove ring confirmation */}
      {confirmRemove && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 12 }}>
              Warning
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

      {/* Reset map — Step 1: first warning with backup download */}
      {resetStep === 1 && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 12, color: 'var(--danger-red)' }}>
              Reset Entire Map?
            </p>
            <p style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
              This will <strong>permanently delete all hex data</strong>, including terrain, POIs, notes, secrets, and history. The map will be reset to a blank 4-ring grid.
            </p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              <button onClick={handleDownloadBackup} style={{
                background: 'none', border: 'none', color: 'var(--gold-dark)',
                textDecoration: 'underline', cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--font-body)', padding: 0,
              }}>
                Download a backup (JSON)
              </button>{' '}
              before proceeding.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setResetStep(2)} style={styles.confirmBtn}>I understand, continue</button>
              <button onClick={() => setResetStep(0)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset map — Step 2: final confirmation */}
      {resetStep === 2 && (
        <div style={styles.confirmOverlay}>
          <div style={{ ...styles.confirmBox, border: '3px solid var(--danger-red)' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 12, color: 'var(--danger-red)' }}>
              ARE YOU SURE?
            </p>
            <p style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              This action <strong>cannot be undone</strong>. All map data will be permanently erased.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleResetConfirmed} style={styles.confirmBtn}>Yes, reset everything</button>
              <button onClick={() => setResetStep(0)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      ...styles.menuItem,
      color: danger ? 'var(--danger-red)' : 'var(--ink)',
    }}>
      <span style={styles.menuIcon}>{icon}</span>
      {label}
    </button>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    zIndex: 300,
  },
  hamburger: {
    width: 34, height: 34,
    background: 'none',
    border: '1.5px solid rgba(196,176,144,0.3)',
    borderRadius: 4, fontSize: 16,
    color: 'var(--parchment)',
    cursor: 'pointer', fontFamily: 'monospace',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  drawer: {
    position: 'absolute', top: 42, right: 0,
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
  divider: {
    height: 1,
    background: 'var(--parchment-dark)',
    margin: '6px 12px',
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
    maxWidth: 360,
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
