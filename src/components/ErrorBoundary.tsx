import React from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Sentry.captureException(error, { extra: { errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
            padding: "2rem",
            color: "#aaa",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <p style={{ fontSize: "1.2rem", margin: 0 }}>
            Something went wrong.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#303040",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;