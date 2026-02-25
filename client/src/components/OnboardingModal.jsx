import React, { useState } from 'react';
import { TERRAIN_LIST } from '../utils/hexGeometry';
import { updateHex, updateMeta } from '../utils/api';

const LOCATION_TYPES = ['Town', 'Village', 'City', 'Fort', 'Cave', 'Shrine', 'Castle', 'Outpost'];

export default function OnboardingModal({ onComplete }) {
  const [name, setName] = useState('');
  const [terrain, setTerrain] = useState('plains');
  const [locType, setLocType] = useState('Town');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateHex('0', {
        terrain,
        poi_type: locType,
        poi_name: name.trim(),
        status: 'explored',
        explored: 1,
      });
      await updateMeta({ onboarding_complete: '1', map_name: name.trim() });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.ornament}>⚔</span>
          <h2 style={styles.title}>Begin Your Campaign</h2>
          <p style={styles.subtitle}>Set up your starting location</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name of Starting Location
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Thornwall Keep"
              style={styles.input}
              autoFocus
              required
            />
          </label>
          <label style={styles.label}>
            Terrain Type
            <select value={terrain} onChange={e => setTerrain(e.target.value)} style={styles.select}>
              {TERRAIN_LIST.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Location Type
            <select value={locType} onChange={e => setLocType(e.target.value)} style={styles.select}>
              {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button type="submit" disabled={loading || !name.trim()} style={styles.btn}>
            {loading ? 'Creating…' : 'Begin Adventure ⚔'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(42,26,10,0.9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  modal: {
    background: 'var(--parchment)',
    border: '3px solid var(--gold)',
    borderRadius: 4, padding: '40px 48px',
    maxWidth: 460, width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  ornament: { fontSize: 28, color: 'var(--gold)' },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 26, fontWeight: 700,
    color: 'var(--ink)', marginTop: 8,
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 15, color: 'var(--ink-light)',
    fontStyle: 'italic', marginTop: 4,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  label: {
    fontFamily: 'var(--font-heading)',
    fontSize: 12, letterSpacing: '0.15em',
    textTransform: 'uppercase', color: 'var(--ink)',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  input: {
    padding: '9px 14px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3,
    background: 'var(--parchment-light)',
    fontSize: 15, color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  select: {
    padding: '9px 14px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3,
    background: 'var(--parchment-light)',
    fontSize: 15, color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  btn: {
    padding: '12px 24px',
    background: 'var(--gold-dark)',
    color: 'var(--parchment-light)',
    fontFamily: 'var(--font-heading)',
    fontSize: 14, letterSpacing: '0.15em',
    textTransform: 'uppercase',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3, cursor: 'pointer',
    marginTop: 8,
  },
};
