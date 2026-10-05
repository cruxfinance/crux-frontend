import * as Sentry from "@sentry/nextjs";
import type { NextPageContext } from "next";
import React from "react";

interface ErrorProps {
  statusCode: number;
}

class ErrorPage extends React.Component<ErrorProps> {
  static getInitialProps({ res, err }: NextPageContext): ErrorProps {
    const statusCode = res?.statusCode ?? err?.statusCode ?? 500;

    if (err) {
      Sentry.captureException(err);
    } else if (res && statusCode >= 500) {
      // Server-side error without an error object — capture a generic message
      Sentry.captureException(new Error(`Server error: ${statusCode}`));
    }

    return { statusCode };
  }

  render() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#1a1a2e",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "4rem", margin: 0 }}>{this.props.statusCode}</h1>
        <p style={{ fontSize: "1.2rem", color: "#aaa", marginTop: "0.5rem" }}>
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
}

export default ErrorPage;