import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Render error:', error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F2E8D5', fontFamily: 'Georgia, serif', padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 20, color: '#3D2B1F', marginBottom: 8 }}>⚠ Something went wrong rendering the map.</p>
          <p style={{ fontSize: 13, color: '#8B6914', marginBottom: 24 }}>{String(this.state.error)}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 28px', fontSize: 14, cursor: 'pointer', background: '#8B6914', color: '#F2E8D5', border: 'none', borderRadius: 4 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
