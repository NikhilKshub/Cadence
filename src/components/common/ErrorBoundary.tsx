import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0c0c0c',
          color: 'white',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          gap: '16px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px' }}>🎵</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b6b6b', fontSize: '14px', maxWidth: '400px' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Restart Cadence
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
