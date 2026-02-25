import React, { useState } from 'react';
import { login } from '../utils/api';

export default function LoginModal({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const role = await login(password);
      onLogin(role);
    } catch {
      setError('Invalid password. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.ornament}>⚜</div>
        <h1 style={styles.title}>HexCrawl</h1>
        <h2 style={styles.subtitle}>Map Tracker</h2>
        <p style={styles.desc}>Enter your password to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Enter password…"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
        <p style={styles.hint}>Player and DM passwords are set by your game master.</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(42,26,10,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--parchment)',
    border: '3px solid var(--gold-dark)',
    borderRadius: '4px',
    padding: '48px 56px',
    textAlign: 'center',
    maxWidth: 400, width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  ornament: {
    fontSize: 32, color: 'var(--gold)',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 36, fontWeight: 700,
    color: 'var(--ink)',
    letterSpacing: '0.1em',
    lineHeight: 1.1,
  },
  subtitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 14, fontWeight: 400,
    color: 'var(--ink-light)',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  desc: {
    fontFamily: 'var(--font-body)',
    fontSize: 15, color: 'var(--ink-light)',
    marginBottom: 24, fontStyle: 'italic',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '10px 16px',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3,
    background: 'var(--parchment-light)',
    fontSize: 16,
    color: 'var(--ink)',
    outline: 'none',
    textAlign: 'center',
    letterSpacing: '0.15em',
  },
  error: {
    color: 'var(--danger-red)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  btn: {
    padding: '11px 24px',
    background: 'var(--gold-dark)',
    color: 'var(--parchment-light)',
    fontFamily: 'var(--font-heading)',
    fontSize: 14, letterSpacing: '0.2em',
    textTransform: 'uppercase',
    border: '1.5px solid var(--ink-faded)',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  hint: {
    marginTop: 20,
    fontSize: 12, color: 'var(--ink-faded)',
    fontStyle: 'italic',
  },
};
