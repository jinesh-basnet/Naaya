import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle, FaSync } from 'react-icons/fa';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: '#f5f5f5',
          }}
        >
          <div
            style={{
              padding: '32px',
              maxWidth: '500px',
              textAlign: 'center',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <FaExclamationTriangle style={{ fontSize: '64px', color: '#d32f2f', marginBottom: '16px' }} />
            <h5 style={{ margin: '16px 0 8px 0', color: '#d32f2f' }}>
              Something went wrong
            </h5>
            <p style={{ marginBottom: '24px', color: '#666' }}>
              An unexpected error occurred. This might be due to invalid data rendering.
              Please try refreshing the page or contact support if the problem persists.
            </p>
            {this.state.error && (
              <div
                style={{
                  marginBottom: '24px',
                  fontFamily: 'monospace',
                  backgroundColor: '#f5f5f5',
                  padding: '16px',
                  borderRadius: '4px',
                  textAlign: 'left',
                  maxHeight: '200px',
                  overflow: 'auto',
                  color: '#666',
                  fontSize: '14px',
                }}
              >
                {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                style={{
                  border: '1px solid #ccc',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={this.handleRefresh}
              >
                <FaSync />
                Refresh Page
              </button>
              <button
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={this.handleReset}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
