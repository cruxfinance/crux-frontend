## Context

Crux Finance has zero observability: errors are logged to console only, with no error tracking, alerting, or production debugging capability. The ci-api service—the primary user-facing API—has particularly poor error handling:

- **No unified error type**: 53 handler functions return `(StatusCode, Json<T>)` tuples with ad-hoc error construction
- **13 `serde(untagged)` error variants** (e.g., `QuoteResult`, `SwapResult`) that conflate success/error at the type level
- **~100+ `.unwrap()` calls** in application code (controllers, DB layer, utilities) that panic on failure
- **~60+ DB functions** return bare values (not `Result`), silently discarding errors
- **`anyhow` is in Cargo.toml** but barely used; there is no `thiserror`

Backend services (ci-modules, crux-insight, crux-fulfiller) are long-running daemons using `tracing` with `FmtSubscriber`, also with no Sentry integration. The frontend has ~356 try/catch blocks all logging to `console.error` with no error boundaries or monitoring.

The Sentry Rust SDK (`sentry` crate) integrates cleanly with `tracing` and `tower` (Axum's middleware layer), which all backend services already use. The Sentry Next.js SDK (`@sentry/nextjs`) supports Pages Router, which the frontend uses.

## Goals / Non-Goals

**Goals:**
- Create a unified `ApiError` type for ci-api that implements `IntoResponse`, replacing all ad-hoc `(StatusCode, Json<T>)` error returns and `serde(untagged)` error enums
- Replace all `.unwrap()` calls in ci-api application code with proper `?` error propagation
- Convert all DB functions that return bare values to return `Result<T, E>`
- Initialize Sentry SDK across all services (ci-api, crux-frontend, ci-modules, crux-insight, crux-fulfiller)
- Auto-report `tracing::error!()` calls, panics, and unhandled errors to Sentry
- Maintain the existing external API contract (`{ "error": "..." }` JSON shape) so frontend clients continue working unchanged
- Make Sentry initialization graceful—services start and run without Sentry if `SENTRY_DSN` is not configured

**Non-Goals:**
- Performance monitoring / tracing in Sentry (can be added later as a separate change)
- Structured logging (JSON log output)—separate concern from error tracking
- Refactoring ci-modules, crux-insight, or crux-fulfiller error handling patterns (they already use `anyhow`; only Sentry plumbing is added)
- Adding authentication, rate limiting, or other middleware
- Changing the frontend error handling architecture beyond adding Sentry capture and error boundaries
- Modifying the auto-generated `ergo_node_client` code

## Decisions

### 1. Use `thiserror` for `ApiError` (not `anyhow`)

**Decision**: Define `ApiError` using `thiserror` derive macros, not `anyhow`.

**Rationale**: `anyhow` is for application-internal error propagation where you don't care about matching on variants. `ApiError` needs to be an enum because: (a) each variant maps to a specific HTTP status code, (b) the Axum `IntoResponse` implementation needs to match on variants to produce the right status code + body, (c) Sentry benefits from categorized errors rather than opaque strings.

`ApiError` variants:
- `ApiError::BadRequest(String)` → 400
- `ApiError::Unauthorized(String)` → 401
- `ApiError::NotFound(String)` → 404
- `ApiError::Internal(String)` → 500
- `ApiError::Database(sqlx::Error)` → 500
- `ApiError::External(String)` → 502 (upstream service failures)

The `IntoResponse` implementation will produce `{ "error": "<message>" }` JSON—matching the current contract exactly.

**Alternative considered**: Keep `anyhow` for everything and pattern-match on `anyhow::Error` in a single `IntoResponse` impl. Rejected because `anyhow` errors are opaque strings at match time; we lose the ability to map error categories to status codes.

### 2. Handler signatures change to `Result<Json<T>, ApiError>`

**Decision**: All ci-api handler functions change from `(StatusCode, Json<T>)` to `Result<Json<T>, ApiError>`. Success returns `Ok(Json(data))`, errors return `Err(ApiError::*)`.

**Rationale**: This is idiomatic Axum—`IntoResponse` is implemented for `Result<Json<T>, ApiError>` automatically. It eliminates manual `StatusCode` construction and makes error handling explicit via `?`. The `ApiError` `IntoResponse` impl produces the same JSON wire format.

**Migration pattern**: Each handler converts from:
```rust
// Before
async fn handler(state, params) -> (StatusCode, Json<QuoteResult>) {
    let data = db::get_data(&state.db).await.unwrap();
    (StatusCode::OK, Json(QuoteResult::Success(data)))
}

// After
async fn handler(state, params) -> Result<Json<QuoteResponse>, ApiError> {
    let data = db::get_data(&state.db).await?;  // sqlx::Error → ApiError::Database
    Ok(Json(data))
}
```

### 3. Eliminate `serde(untagged)` error enums

**Decision**: The 13 application-level `serde(untagged)` enums (e.g., `QuoteResult`, `SwapResult`) are split into: the success type stays as the handler's `Ok` return, and errors become `ApiError` variants. The `serde(untagged)` pattern is removed entirely from application code.

**Rationale**: `serde(untagged)` makes it impossible for Axum to know the HTTP status code from the type alone—it has to inspect the serialized JSON. By moving errors into `Result<Json<T>, ApiError>`, the status code is determined by whether the result is `Ok` or `Err`, which is type-safe and matches Axum conventions.

The 50+ auto-generated `serde(untagged)` enums in `ergo_node_client/` are left untouched.

### 4. DB functions return `Result<T, sqlx::Error>`

**Decision**: All ~60 DB functions that currently return bare values will return `Result<T, sqlx::Error>`. The `sqlx::Error` is auto-converted to `ApiError::Database` via `From` impl, so `?` propagation works seamlessly in handlers.

**Rationale**: Any DB failure currently causes a panic via `.unwrap()`. Returning `Result` lets errors propagate to the handler, which returns `Err(ApiError::Database(e))`, producing a 500 response and a Sentry event—exactly what we want.

### 5. Sentry init with `_guard` pattern in all Rust services

**Decision**: All Rust services use the standard Sentry init pattern:
```rust
let _guard = sentry::init((
    std::env::var("SENTRY_DSN").ok(),
    sentry::ClientOptions {
        release: sentry::release_name!(),
        traces_sample_rate: std::env::var("SENTRY_TRACES_SAMPLE_RATE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        environment: Some(
            std::env::var("SENTRY_ENVIRONMENT")
                .unwrap_or_else(|_| if cfg!(debug_assertions) { "development".into() } else { "production".into() })
                .into(),
        ),
        ..Default::default()
    },
));
```

The `_guard` keeps Sentry alive until program exit. If `SENTRY_DSN` is unset, `None` → Sentry is disabled (no-op transport). The `sentry-tracing` layer is added to the `tracing_subscriber` so all `error!()` / `warn!()` events auto-report. Performance monitoring is explicitly disabled (`traces_sample_rate: 0.0`) — see Non-Goals.

For ci-api, `sentry_tower::SentryLayer` is added to the Axum router for automatic request spans and HTTP context.

### 6. Frontend uses `@sentry/nextjs` with source maps

**Decision**: Use the official `@sentry/nextjs` SDK (version 8.x+). Configure via `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Wrap `next.config.js` with `withSentryConfig`. Use `Sentry.captureException` in the tRPC `onError` handler and in a new React `ErrorBoundary`.

**Environment variable strategy**: Follow Vercel conventions. `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time for the client bundle (required by Next.js convention for browser-accessible env vars). `SENTRY_DSN` is used server-side and in edge runtime (available at runtime, not exposed to client). Config files use a fallback pattern: `process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN` on the client.

**Alternative considered**: Manual `@sentry/browser` setup. Rejected because `@sentry/nextjs` handles SSR, edge runtime, source maps, and Next.js integration automatically.

**Next.js compatibility**: `@sentry/nextjs` peer dependency requires Next.js `^13.2.0 || ^14.0 || ^15.0.0-rc.0 || ^16.0.0-0`. The current crux-frontend Next.js version (13.4.4) satisfies `^13.2.0`. No version bump is required.

### 7. `.unwrap()` removal strategy: target controllers and DB first

**Decision**: Replace `.unwrap()` calls in `controllers/`, `db/`, and `utilities/` first. `.unwrap()` in tests is acceptable and left as-is. Auto-generated `ergo_node_client/` code is untouched.

**Rationale**: Controller and DB `.unwrap()` calls are the ones that crash the API in production. Test `.unwrap()` is idiomatic Rust. The ergo_node_client is generated code that shouldn't be manually modified.

### 8. Ergo-lib operations use a dedicated `ApiError` variant or `.map_err()`

**Decision**: Ergo-lib operations that can fail (address parsing, box construction, token creation, etc.) will use `.map_err(|e| ApiError::Internal(format!("...: {}", e)))` at call sites rather than creating a separate variant.

**Rationale**: Ergo-lib error types (`ergo_lib::chain::transaction::TransactionError`, etc.) are numerous and would pollute `ApiError`. Mapping to `ApiError::Internal` with a descriptive message keeps the API stable while still surfacing details to Sentry.

## Risks / Trade-offs

- **[Large refactoring surface]** → This changes ~53 handler signatures and ~60+ DB function signatures. Mitigate by doing it incrementally, one controller module at a time, with the app compiling and running between each step.
- **[Ergo-lib `.unwrap()` calls are hard to replace contextually]** → Some ergo-lib operations (like `BoxValue::try_from`, `Address::try_from`) are used with constants or validated inputs where failure indicates a programming error, not a runtime error. For these, use `.expect("reason")` instead of `.unwrap()` so the panic message is descriptive and Sentry captures the context. Reserve `ApiError::Internal` for cases where user input can cause the failure.
- **[Sentry rate limits on panics]** → If `.unwrap()` removal is incomplete, Sentry will still receive panic reports, which is better than the current state (no visibility). The refactoring can be done incrementally.
- **[Frontend source map upload requires Sentry CLI + CI integration]** → Source maps won't be uploaded automatically without CI configuration. This is a separate task (CI setup, not code). The SDK will still capture errors with stack traces, just without resolved source locations until source maps are uploaded.
- **[`serde(untagged)` removal changes the API response types for documentation]** → The OpenAPI schema (utoipa) will change for these endpoints. The wire format stays the same for error cases (`{ "error": "..." }`) but the schema will now correctly show error responses under the standard error response pattern rather than as a union type. This is a schema improvement, not a breaking change.
- **[Sentry adds latency to error paths]** → Sentry SDK sends events asynchronously. Normal requests have zero overhead. Error paths add ~50ms for event delivery. This is acceptable for error paths.
- **[Sentry crate reqwest version conflict]** → The `sentry 0.46` crate depends on `reqwest ^0.12`, while ci-api uses `reqwest 0.11`. Cargo allows both versions in the dependency tree (semver-incompatible versions coexist). Using `default-features = false` + `rustls` avoids `native-tls` linking conflicts. The two reqwest versions occupy separate slots in the lock file and do not conflict at runtime.
- **[`NEXT_PUBLIC_` env vars are build-time in Next.js]** → `NEXT_PUBLIC_SENTRY_DSN` is inlined into the client bundle at build time and cannot be changed at runtime. This means a new build is required to rotate the DSN. This is standard for Vercel deployments and is an accepted trade-off. Server-side `SENTRY_DSN` can be changed at runtime without rebuilding.

## Migration Plan

1. **Add Sentry init to all services first** — Add `sentry` + `sentry-tracing` dependencies and init code to all Rust services and crux-frontend. Even without error handling refactoring, this immediately captures panics and `tracing::error!()` calls. Deploy with `SENTRY_DSN` unset initially to verify no regressions.
2. **Add `ApiError` type and `IntoResponse` impl** — Create new module, wire into existing app. No handler changes yet. Include wire format verification tests that confirm `ApiError` responses match the previous `serde(untagged)` error enum format byte-for-byte.
3. **Convert handlers one controller module at a time** — Start with the simplest (`coingecko.rs`, `tradingView.rs`), then `crux.rs`, then the complex ones (`dex.rs`, `spectrum.rs`, `dexy.rs`). Each module compiles and runs independently.
4. **Convert DB functions alongside their controllers** — When a handler uses `?`, its DB functions must return `Result`. Do controller + its DB functions together.
5. **Remove `serde(untagged)` error enums** — As each controller is converted, remove the corresponding untagged enum.
6. **Add `sentry_tower::SentryLayer` to ci-api** — Once the error model is in place, add the Axum middleware layer for richer HTTP context on errors.
7. **Deploy with `SENTRY_DSN` unset** — Verify no regressions across all endpoints.
8. **Set `SENTRY_DSN` in production** — Enable error capture.
9. **Frontend and other backend services** — These are independent and can be done in parallel with steps 2-6.

**Rollback**: For Sentry, simply remove `SENTRY_DSN` env var and Sentry becomes a no-op. No code rollback needed. For the `ApiError` refactoring, git revert is straightforward since each module is converted in a separate commit.

## Open Questions

- ~~Should we use `thiserror` or a hand-written `ApiError` enum?~~ → **Resolved**: Use `thiserror` for derive macros, with hand-written `From` impls where needed.
- ~~Should `ApiError::Internal` messages be sanitized before sending to clients?~~ → **Resolved**: Yes. `ApiError::Internal` and `ApiError::Database` return `{"error":"Internal server error"}` to clients. The full error message is logged via `tracing::error!()` and reported to Sentry, but NOT included in the HTTP response body.
- ~~Minimum Rust version compatibility for `sentry` crate?~~ → **Resolved**: Use `sentry = "0.46"` series (MSRV 1.81, our toolchain is 1.92). The sentry crate depends on `reqwest ^0.12` which coexists with ci-api's `reqwest 0.11` in Cargo's dependency tree (two separate semver-incompatible versions). Use `default-features = false` with `rustls` feature to avoid `native-tls` conflicts between the two reqwest versions.

## Additional Design Decisions

### 9. Error sanitization for internal errors

**Decision**: `ApiError::Internal` and `ApiError::Database` variants return a generic `"Internal server error"` message in the HTTP response body. The full error detail is logged via `tracing::error!()` and captured by Sentry.

**Rationale**: Internal error messages can contain database query details, file paths, or other sensitive information. Exposing these to clients is a security risk. By logging the full detail and sending it to Sentry, we preserve debugging value without leaking information.

### 10. Sentry crate version and dependency strategy

**Decision**: Use `sentry = "0.46"` (pinned to 0.46.x series). Enable `default-features = false` and explicitly enable `rustls` feature.

```toml
sentry = { version = "0.46", default-features = false, features = ["backtrace", "contexts", "panic", "transport", "debug-images", "rustls", "tracing", "tower"] }
sentry-tracing = "0.46"
sentry-tower = "0.46"  # ci-api only
```

**Rationale**: 
- The `0.46` series has MSRV 1.81 (our toolchain is 1.92, compatible).
- The `0.47+` series bumped `reqwest` to `0.13+` and MSRV to 1.88. While 1.88 is compatible with our toolchain, pinning to `0.46` avoids the reqwest 0.13 dependency which could conflict with other crates in our workspace.
- `default-features = false` + `rustls` avoids pulling in `native-tls` which could conflict with ci-api's existing `reqwest 0.11` + `native-tls` dependency. Cargo allows multiple semver-incompatible versions of the same crate, but both versions binding to `native-tls` can cause linking issues on some platforms.
- The `ureq` transport (alternative to reqwest) is not used because `reqwest` is already a dependency of ci-api and provides async HTTP which aligns with our tokio runtime.

### 11. crux-frontend env var strategy for Vercel

**Decision**: Use the standard Vercel/Next.js environment variable conventions:
- `NEXT_PUBLIC_SENTRY_DSN` for client-side (browser) — inlined at build time by Next.js
- `SENTRY_DSN` for server-side (Node.js + Edge) — available at runtime

Both config files use a fallback pattern:
```typescript
// sentry.client.config.ts
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// sentry.server.config.ts & sentry.edge.config.ts
const dsn = process.env.SENTRY_DSN;
```

**Rationale**: Vercel's Sentry integration automatically provides `NEXT_PUBLIC_SENTRY_DSN`. The `NEXT_PUBLIC_` prefix is required by Next.js for env vars that must be inlined into the client bundle at build time. Server-side configs use `SENTRY_DSN` (no prefix) because it's available at runtime and should NOT be exposed to the client bundle. This is a deliberate security boundary.