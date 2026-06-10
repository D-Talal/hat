import React from 'react';

// Catches render errors anywhere in the tree and shows a recoverable message
// instead of a blank white page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surfaced in the console for debugging; could be sent to a logging service.
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 520, margin: '80px auto', padding: '32px 36px',
          background: 'white', border: '1px solid #e8eaf0', borderRadius: 16,
          fontFamily: 'DM Sans, sans-serif', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(15,17,40,0.06)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 8 }}>
            Une erreur est survenue
          </h2>
          <p style={{ fontSize: 14, color: '#5a5f7a', lineHeight: 1.6, marginBottom: 20 }}>
            Quelque chose s'est mal passé lors de l'affichage de cette page.
            Vos données sont en sécurité — vous pouvez réessayer.
          </p>
          {this.state.error?.message && (
            <pre style={{
              fontSize: 12, color: '#9ea4be', background: '#f8f9fa',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              overflowX: 'auto', textAlign: 'left',
            }}>{String(this.state.error.message)}</pre>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={this.handleReset} style={{
              fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: '#1a1a2e', color: '#C9A84C', cursor: 'pointer',
            }}>Réessayer</button>
            <button onClick={() => window.location.assign('/')} style={{
              fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
              padding: '10px 22px', borderRadius: 10,
              border: '1.5px solid #e8eaf0', background: 'white', color: '#5a5f7a', cursor: 'pointer',
            }}>Accueil</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
