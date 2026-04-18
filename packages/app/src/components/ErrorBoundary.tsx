import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
    console.error('[OpenCAD] Unhandled error:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">⚠</div>
          <div className="error-boundary-title">Something went wrong</div>
          <div className="error-boundary-message">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </div>
          <button
            className="error-boundary-retry"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Lightweight panel-level wrapper with a minimal inline fallback */
export function PanelErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="panel-error">
          <span>Panel failed to load.</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
