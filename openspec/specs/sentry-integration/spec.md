## ADDED Requirements

### Requirement: Sentry SDK initialization in Rust services
All Rust services (ci-api, ci-modules, crux-insight, crux-fulfiller) SHALL initialize the Sentry SDK at program startup using the `_guard` pattern. If the `SENTRY_DSN` environment variable is not set, Sentry SHALL operate in no-op mode with zero overhead. The `sentry` crate version SHALL be pinned to the `0.46` series (MSRV 1.81, compatible with our toolchain). Because sentry `0.46` depends on `reqwest ^0.12` while ci-api uses `reqwest 0.11`, the dependency SHALL use `default-features = false` with `rustls` feature to avoid `native-tls` conflicts, allowing both reqwest versions to coexist in the dependency tree.

#### Scenario: Sentry is enabled via DSN
- **WHEN** the `SENTRY_DSN` environment variable is set to a valid Sentry DSN
- **THEN** the Sentry SDK initializes and begins capturing panics, errors, and events

#### Scenario: Sentry DSN is not configured
- **WHEN** the `SENTRY_DSN` environment variable is not set or is empty
- **THEN** the Sentry SDK initializes with `None` as the DSN, resulting in a no-op transport with zero performance overhead, and no events are sent

### Requirement: Sentry tracing layer in all Rust services
All Rust services SHALL add the `sentry_tracing::layer()` to their `tracing_subscriber` so that all `tracing::error!()` calls are automatically reported to Sentry as events.

#### Scenario: An error is logged via tracing
- **WHEN** `tracing::error!("database query failed: {}", err)` is called in any service
- **THEN** a Sentry event is created with level `error`, the error message, and the tracing span context

#### Scenario: A warning is logged via tracing
- **WHEN** `tracing::warn!("retrying ZMQ connection")` is called
- **THEN** a Sentry event is created with level `warning` (only if Sentry is configured)

### Requirement: Sentry tower layer in ci-api
ci-api SHALL add `sentry_tower::SentryLayer` to its Axum router middleware stack. This layer creates a Sentry transaction for each HTTP request and attaches request context (method, URL, headers) to error events.

#### Scenario: HTTP request results in an error
- **WHEN** a client sends a request to `/api/dex/quote` and the handler returns `Err(ApiError::BadRequest("..."))`
- **THEN** Sentry receives an event with the HTTP method, URL, and status code attached, in addition to the error message

#### Scenario: HTTP request succeeds
- **WHEN** a client sends a request that completes successfully with status 200
- **THEN** a Sentry transaction is created but no error event is sent (performance data only, if performance monitoring is later enabled)

### Requirement: Sentry panic handler in all Rust services
All Rust services SHALL register `sentry::integrations::panic::register()` to capture panics as Sentry events before the process terminates.

#### Scenario: A panic occurs in a worker thread
- **WHEN** a `.expect("MIN_BOX_VALUE must be valid")` call fails due to a programming error
- **THEN** the panic message and stack trace are sent to Sentry before the process aborts

### Requirement: Sentry configuration via environment variables (Rust services)
All Rust services SHALL support the following environment variables for Sentry configuration: `SENTRY_DSN` (required, the Sentry project DSN), `SENTRY_ENVIRONMENT` (optional, defaults to `development` or `production` based on existing config), `SENTRY_RELEASE` (optional, uses `sentry::release_name!()` macro which reads from `Cargo.toml` version or `HEROKU_SLUG_COMMIT` env var), and `SENTRY_TRACES_SAMPLE_RATE` (optional, defaults to `0.0` — performance monitoring is explicitly deferred to a future change; this rate is set to zero so no transaction data is sent).

#### Scenario: Production deployment with Sentry
- **WHEN** a service is deployed with `SENTRY_DSN=https://xxx@sentry.io/123` and `SENTRY_ENVIRONMENT=production`
- **THEN** Sentry events are tagged with `environment=production` and `release=<crate_version>`, but no performance/transaction data is sent (traces sample rate = 0)

#### Scenario: Local development without Sentry
- **WHEN** a developer runs the service locally without setting `SENTRY_DSN`
- **THEN** no Sentry events are sent and no network calls to Sentry occur

### Requirement: Sentry configuration via environment variables (crux-frontend)
crux-frontend SHALL use the following environment variables for Sentry configuration, following Vercel deployment conventions:

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Client (browser) | Sentry DSN inlined into client bundle at build time. Vercel's Sentry integration automatically sets this. |
| `SENTRY_DSN` | Server (Node.js) | Sentry DSN for server-side rendering and API routes. Available at runtime, not inlined. |
| `SENTRY_DSN` | Edge (middleware) | Sentry DSN for edge runtime. Available at runtime. |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Client (browser) | Environment tag inlined at build time (optional). |
| `SENTRY_ENVIRONMENT` | Server + Edge | Environment tag available at runtime (optional). |

**Important**: `NEXT_PUBLIC_` prefixed variables are inlined at build time by Next.js and CANNOT be changed at runtime. For Vercel deployments, the Vercel Sentry integration automatically provides `NEXT_PUBLIC_SENTRY_DSN`. For server-side config files (`sentry.server.config.ts`, `sentry.edge.config.ts`), the DSN SHALL be read from `SENTRY_DSN` (non-public). Both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` SHALL be consumed with a fallback pattern: `process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN` on the client, `process.env.SENTRY_DSN` on server/edge.

#### Scenario: Vercel production deployment
- **WHEN** crux-frontend is deployed on Vercel with the Sentry integration enabled
- **THEN** Vercel automatically provides `NEXT_PUBLIC_SENTRY_DSN` (inlined at build time) and `SENTRY_DSN` (available at runtime), and both client and server errors are captured

#### Scenario: Local development without Sentry
- **WHEN** a developer runs `next dev` locally without setting any Sentry environment variables
- **THEN** the SDK initializes with no DSN and operates in no-op mode with no events sent

### Requirement: Sentry Next.js SDK in crux-frontend
crux-frontend SHALL install and configure `@sentry/nextjs` (version 8.x or later, which supports Next.js `^13.2.0 || ^14.0 || ^15.0.0-rc.0 || ^16.0.0-0`). The current Next.js version (13.4.4) is within the supported range. Configuration files `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` SHALL be created. The `next.config.js` SHALL be wrapped with `withSentryConfig`.

#### Scenario: Unhandled browser error
- **WHEN** an unhandled JavaScript error occurs in the browser
- **THEN** Sentry captures it as an event with the full stack trace and source map

#### Scenario: Next.js SSR error
- **WHEN** an error occurs during server-side rendering
- **THEN** Sentry captures it as a server-side event with the Node.js stack trace

### Requirement: React error boundary in crux-frontend
crux-frontend SHALL define a React `ErrorBoundary` component that calls `Sentry.captureException` and renders a user-friendly error fallback. This error boundary SHALL wrap key route components (trade, portfolio, liquidity, dexy, accounting pages).

#### Scenario: Component throws during render
- **WHEN** a React component within the error boundary throws during rendering
- **THEN** the error is captured by Sentry and the user sees a localized error fallback UI instead of a blank page

#### Scenario: Error boundary recovers
- **WHEN** the user clicks "Try again" on the error fallback
- **THEN** the error boundary resets its state and attempts to re-render the children

### Requirement: Custom error page in crux-frontend
crux-frontend SHALL add a `_error.tsx` page that captures unhandled Next.js errors via `Sentry.captureException` and renders a 500 error page.

#### Scenario: Next.js encounters a server-side rendering error
- **WHEN** Next.js encounters an error during SSR that is not caught by an error boundary
- **THEN** the `_error.tsx` page captures the error with Sentry and displays a 500 page to the user

### Requirement: tRPC error capture in crux-frontend
The tRPC API handler `onError` callback SHALL call `Sentry.captureException` instead of `console.error`. The tRPC client SHALL add a global `onError` callback that captures client-side tRPC errors.

#### Scenario: Server-side tRPC error
- **WHEN** a tRPC mutation fails on the server side
- **THEN** the error is captured by Sentry via the `onError` callback in `pages/api/trpc/[trpc].ts`

#### Scenario: Client-side tRPC error
- **WHEN** a tRPC query or mutation fails on the client side
- **THEN** the error is captured by Sentry via the client-side `onError` callback

### Requirement: Sentry DSN is not hard-coded
No Sentry DSN values SHALL be hard-coded in source code. All DSNs SHALL be read from environment variables, following per-service conventions:
- **Rust services**: `SENTRY_DSN`
- **Next.js client (browser)**: `NEXT_PUBLIC_SENTRY_DSN` (inlined at build time, Vercel convention)
- **Next.js server/edge**: `SENTRY_DSN`

#### Scenario: DSN is rotated
- **WHEN** the Sentry DSN needs to be rotated
- **THEN** only the environment variable needs to be updated; no code changes are required

### Requirement: Existing error response format is preserved
The `ApiError` `IntoResponse` implementation SHALL produce JSON responses in the format `{"error":"<message>"}` for client-facing errors and `{"error":"Internal server error"}` for 500/502 responses. This matches the current `serde(untagged)` error enum wire format so that existing frontend clients continue to work without modification. Internal error details (database errors, stack context) SHALL be logged via `tracing::error!()` and reported to Sentry, but SHALL NOT be exposed in the HTTP response body — only the generic "Internal server error" message is sent to clients. This sanitization prevents leaking database details or internal paths to clients while preserving full context in Sentry.

#### Scenario: Frontend client receives a BadRequest error
- **WHEN** the API returns `Err(ApiError::BadRequest("invalid address"))`
- **THEN** the response body is `{"error":"invalid address"}` with status 400, matching the previous `QuoteResult::Error { error: "invalid address" }` format

#### Scenario: Frontend client receives an Internal error
- **WHEN** a database query fails and the handler returns `Err(ApiError::Database(sqlx_error))`
- **THEN** the response body is `{"error":"Internal server error"}` with status 500 (no internal details leaked to client), the full error is logged via `tracing::error!()`, and a Sentry event is created with the full error context

#### Scenario: Wire format verification
- **WHEN** the ApiError implementation is complete
- **THEN** an integration test SHALL verify that the JSON response body and HTTP status code match exactly what the previous `serde(untagged)` error enums produced, for each error variant