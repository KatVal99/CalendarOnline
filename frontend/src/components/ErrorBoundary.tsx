import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Spidey Budget:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#060713',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🕷️</div>
          <h1 style={{ color: '#e62429', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            SPIDEY BUDGET
          </h1>
          <p style={{ color: '#8888aa', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '320px' }}>
            Si è verificato un problema durante il caricamento dell&apos;applicazione.
          </p>
          <div style={{
            background: 'rgba(230, 36, 41, 0.1)',
            border: '1px solid #e62429',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            maxWidth: '360px',
            wordBreak: 'break-word',
            fontSize: '0.8rem',
            color: '#ff4444'
          }}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              background: '#e62429',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.85rem 1.8rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(230, 36, 41, 0.6)'
            }}
          >
            🔄 Ricarica App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
