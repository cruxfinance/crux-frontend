## Why

Crux has zero observability. Errors across all services are logged to console only — there is no error tracking, no alerting, and no way to understand production failures without manually reading logs. The ci-api (the primary user-facing service) has particularly poor error handling: no custom error type, no Axum `IntoResponse` implementation, extensive `.unwrap()` usage, and ad-hoc `StatusCode + Json<T>` tuple returns. Adding Sentry gives us crash reporting, structured error capture, and performance monitoring, but its value depends on first refactoring ci-api's error handling into a coherent model so Sentry receives structured, actionable errors rather than generic panics.

## What Changes

- **New `ApiError` type for ci-api**: A unified error enum implementing `IntoResponse` that replaces all ad-hoc `StatusCode + Json<T>` tuple returns and `serde(untagged)` error variants (`QuoteResult::Error`, `SwapResult::Error`, etc.). Every API handler will return `Result<Json<T>, ApiError>` instead of `(StatusCode, Json<T>)`.
- **Sentry SDK integration across ci-api**: Add `sentry` + `sentry-tracing` + `sentry-tower` crates. Initialize Sentry in `main.rs`. Layer `SentryLayer` on the Axum router for automatic request spans and error capture. Add `sentry-tracing` subscriber layer so all `tracing::error!()` calls auto-report.
- **Sentry SDK integration across crux-frontend**: Add `@sentry/nextjs`. Configure client, server, and edge Sentry. Add `_error.tsx` and React error boundaries around key route components. Replace `console.error` in tRPC `onError` handler with `Sentry.captureException`.
- **Sentry SDK integration across backend services**: Add `sentry` + `sentry-tracing` to ci-modules, crux-insight, and crux-fulfiller. Initialize at startup, add tracing layer, register panic handler.
- **Replace `.unwrap()` calls in ci-api**: Propagate errors with `?` operator instead of panicking. This is the bulk of the refactoring and the biggest value driver — each replaced `.unwrap()` is one fewer silent crash in production.
- **Consistent DB error handling in ci-api**: DB functions that currently return bare values will return `Result<T, sqlx::Error>` so errors propagate through the `ApiError` chain.
- **Sentry DSN configuration via environment variables**: All services read Sentry DSN from environment variables, following per-platform conventions: `SENTRY_DSN` for Rust services, `NEXT_PUBLIC_SENTRY_DSN` (build-time, Vercel convention) for Next.js client, `SENTRY_DSN` for Next.js server/edge. If absent, Sentry is disabled (no-op transport). This allows local dev without Sentry.
- **Error sanitization**: `ApiError::Internal` and `ApiError::Database` variants return generic `"Internal server error"` to clients. Full error details are logged via `tracing::error!()` and sent to Sentry, not exposed in HTTP responses.

## Capabilities

### New Capabilities
- `api-error-model`: Unified error type and `IntoResponse` implementation for ci-api, replacing all ad-hoc error patterns
- `sentry-integration`: Sentry SDK initialization, tracing layer, tower layer, and DSN configuration across all services (ci-api, crux-frontend, ci-modules, crux-insight, crux-fulfiller)

### Modified Capabilities
- `architecture`: CI/CD and deployment must now include `SENTRY_DSN` environment variable; ci-api route handler signatures change from tuple returns to `Result<Json<T>, ApiError>`

## Impact

- **ci-api**: Major refactoring. Every route handler signature changes. All `.unwrap()` calls in `util.rs`, controller modules, and DB modules must be replaced. New `ApiError` module added. Sentry initialization + middleware layers added to `main.rs`. Cargo.toml gets `sentry` (0.46, with `default-features = false` and `rustls` feature), `sentry-tracing`, `sentry-tower`, and `thiserror` dependencies.
- **crux-frontend**: New Sentry package (`@sentry/nextjs` 8.x+). New config files (`sentry.client.config.ts` reading `NEXT_PUBLIC_SENTRY_DSN || SENTRY_DSN`, `sentry.server.config.ts` reading `SENTRY_DSN`, `sentry.edge.config.ts` reading `SENTRY_DSN`). `next.config.js` wrapped with `withSentryConfig`. New `_error.tsx` and `ErrorBoundary` component. tRPC `onError` handler updated. Environment variables follow Vercel conventions.
- **ci-modules**: Each of the 10 sub-crates gets Sentry init in `main.rs`. Cargo.toml workspace dependencies added (`sentry 0.46`, `sentry-tracing 0.46`).
- **crux-insight**: Sentry init in `chain-indexer/src/main.rs`. Cargo.toml dependencies added (`sentry 0.46`, `sentry-tracing 0.46`).
- **crux-fulfiller**: Sentry init in `src/main.rs`. Cargo.toml dependencies added (`sentry 0.46`, `sentry-tracing 0.46`).
- **Deployment**: All services need `SENTRY_DSN` environment variable added to their configuration. Optional `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE` (defaults to `0.0` — performance monitoring is deferred). For crux-frontend on Vercel: `NEXT_PUBLIC_SENTRY_DSN` (build-time, automatically provided by Vercel's Sentry integration) and `SENTRY_DSN` (runtime). Note: `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time and cannot be rotated without rebuilding the client bundle.
- **No breaking API changes**: The `ApiError` `IntoResponse` implementation will produce the same JSON error shape (`{ "error": "..." }`) that clients currently expect, so the external API contract remains stable.