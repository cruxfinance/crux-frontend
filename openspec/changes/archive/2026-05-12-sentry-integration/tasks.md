## 1. ci-api: Sentry Initialization (Phase 0 — do first to capture panics immediately)

- [x] 1.1 Add `sentry` (v0.46, `default-features = false`, `features = ["backtrace", "contexts", "panic", "transport", "debug-images", "rustls", "tracing", "tower"]`), `sentry-tracing` (v0.46), `sentry-tower` (v0.46), and `thiserror` dependencies to `ci-api/Cargo.toml`
- [x] 1.2 Add Sentry initialization to `src/main.rs` — `sentry::init` with `_guard` pattern, reading `SENTRY_DSN` from env, `SENTRY_ENVIRONMENT` with dev/prod default, `SENTRY_RELEASE` via `sentry::release_name!()`, and `SENTRY_TRACES_SAMPLE_RATE` defaulting to `0.0`
- [x] 1.3 Add `sentry_tracing::layer()` to the `tracing_subscriber` registry so `tracing::error!` events auto-report to Sentry
- [x] 1.4 Register `sentry::integrations::panic::register()` for panic capture
- [ ] 1.5 Verify ci-api starts correctly with and without `SENTRY_DSN` set

## 2. Backend Services: Sentry Integration (Phase 0 — can be done in parallel with task 1)

- [x] 2.1 Add `sentry` (v0.46, `default-features = false`, `features = ["backtrace", "contexts", "panic", "transport", "debug-images", "rustls", "tracing"]`) and `sentry-tracing` (v0.46) dependencies to `ci-modules/Cargo.toml` (workspace-level)
- [x] 2.2 Add Sentry init + `_guard` + `sentry_tracing::layer()` + panic handler to each ci-modules binary's `main.rs` (ci-spectrum, ci-coingecko, ci-ergopad, ci-duckpools, ci-crux, ci-tradehouse, ci-dex, ci-dexy, ci-limit-orders), with full config (SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE, SENTRY_TRACES_SAMPLE_RATE)
- [x] 2.3 Add `SENTRY_DSN` configuration to each ci-module's config file structure
- [x] 2.4 Add `sentry` (v0.46, same features) and `sentry-tracing` (v0.46) dependencies to `crux-insight/Cargo.toml`
- [x] 2.5 Add Sentry init + `_guard` + `sentry_tracing::layer()` + panic handler + full config to `crux-insight/chain-indexer/src/main.rs`
- [x] 2.6 Add `sentry` (v0.46, same features) and `sentry-tracing` (v0.46) dependencies to `crux-fulfiller/Cargo.toml`
- [x] 2.7 Add Sentry init + `_guard` + `sentry_tracing::layer()` + panic handler + full config to `crux-fulfiller/src/main.rs`
- [ ] 2.8 Verify all backend services start correctly with and without `SENTRY_DSN` set

## 3. crux-frontend: Sentry SDK Setup (Phase 0 — can be done in parallel with tasks 1-2)

- [x] 3.1 Install `@sentry/nextjs` package (8.x or later, compatible with Next.js ^13.2.0)
- [x] 3.2 Create `sentry.client.config.ts` with DSN from `process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN`
- [x] 3.3 Create `sentry.server.config.ts` with DSN from `process.env.SENTRY_DSN`
- [x] 3.4 Create `sentry.edge.config.ts` with DSN from `process.env.SENTRY_DSN`
- [x] 3.5 Wrap `next.config.js` with `withSentryConfig`, configuring source map upload
- [x] 3.6 Add `_error.tsx` page that captures errors via `Sentry.captureException`
- [x] 3.7 Create `ErrorBoundary` component wrapping key route components (trade, portfolio, liquidity, dexy, accounting)

## 4. crux-frontend: tRPC Error Capture (Phase 0 continuation)

- [x] 4.1 Replace `console.error` in `src/pages/api/trpc/[trpc].ts` `onError` handler with `Sentry.captureException`
- [x] 4.2 Add global `onError` callback to tRPC client in `src/lib/trpc.ts`
- [x] 4.3 Add `Sentry.captureException` calls in key catch blocks in trade, portfolio, and dexy pages (replacing `console.error`)

## 5. ci-api: ApiError Foundation (Phase 1)

- [x] 5.1 Create `src/error.rs` module with `ApiError` enum (BadRequest, Unauthorized, NotFound, Internal, Database, External, ServiceUnavailable variants) using `thiserror` derive macros
- [x] 5.2 Implement `IntoResponse` for `ApiError` — produce `{"error":"<message>"}` JSON for client-facing variants (BadRequest, Unauthorized, NotFound, ServiceUnavailable), generic `"Internal server error"` for Internal/Database/External variants; log internal errors via `tracing::error!()` with full detail (the detail goes to Sentry via `sentry_tracing`, NOT to the client)
- [x] 5.3 Implement `From<sqlx::Error>` for `ApiError` mapping to `ApiError::Database`
- [x] 5.4 Add `mod error;` to `src/main.rs` and verify the module compiles

## 6. ci-api: Convert DB Functions to Return Result (Phase 1)

- [x] 6.1 Convert `src/db/coingecko.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.2 Convert `src/db/ergopad.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.3 Convert `src/db/crux.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.4 Convert `src/db/dex.rs` (all except `query_boxes` which already returns Result) — return `Result<T, sqlx::Error>`
- [x] 6.5 Convert `src/db/dexy.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.6 Convert `src/db/spectrum.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.7 Convert `src/db/limit_orders.rs` — all functions return `Result<T, sqlx::Error>`, replace `.unwrap()` with `?`
- [x] 6.8 Verify all DB modules compile and existing tests still pass

## 7. ci-api: Convert Simple Controllers (coingecko, trading_view) (Phase 1)

- [x] 7.1 Convert `src/controllers/coingecko.rs` — change handler signatures to `Result<Json<T>, ApiError>`, propagate DB errors with `?`
- [x] 7.2 Convert `src/controllers/trading_view.rs` — change handler signatures to `Result<Json<T>, ApiError>`, propagate DB errors with `?`
- [x] 7.3 Verify these controllers compile and respond correctly
- [x] 8.1 Convert `src/controllers/boxes.rs` — change handler signature to `Result<Json<Vec<BoxResult>>, ApiError>`, remove `BoxQueryResponse` untagged enum, propagate DB errors
- [x] 8.2 Verify boxes endpoint compiles and returns correct error format
- [x] 9.1 Convert `src/controllers/crux.rs` — change all handler signatures to `Result<Json<T>, ApiError>`, propagate DB errors with `?`, replace `.unwrap()` calls with `.map_err(ApiError::Internal)` or `.expect("reason")` for ergo-lib operations
- [x] 9.2 Convert `src/utilities/common.rs` — update helper functions to return `Result<T, ApiError>` or `Result<T, String>` and replace `.unwrap()` calls
- [x] 9.3 Verify crux controller compiles and endpoints respond correctly

## 10. ci-api: Convert Dex Controller (Phase 1)

- [x] 10.1 Remove `QuoteResult` enum, convert `get_quote` to return `Result<Json<QuoteResponse>, ApiError>`
- [x] 10.2 Remove `OrdersResult` enum, convert `get_orders` to return `Result<Json<Vec<LimitOrder>>, ApiError>`
- [x] 10.3 Remove `FeeEstimateResult` enum, convert `get_fee_estimate` to return `Result<Json<FeeEstimateResponse>, ApiError>`
- [x] 10.4 Remove `SwapResult` enum, convert `build_swap` to return `Result<Json<SwapResponse>, ApiError>`
- [x] 10.5 Remove `CreateLimitOrderResult` and `CancelLimitOrderResult` enums, convert handlers to `Result<Json<T>, ApiError>`
- [x] 10.6 Remove `ExpiryRefundResult` enum, convert `expiry_refund_limit_order` to return `Result<Json<ExpiryRefundResponse>, ApiError>`
- [x] 10.7 Remove `LpPositionsResult`, `AddLiquidityResult`, `RemoveLiquidityResult` enums from `src/entities/liquidity.rs`, convert handlers to `Result<Json<T>, ApiError>`
- [x] 10.8 Convert remaining dex handlers (`get_order_history`, `get_orderbook`, `get_order_details`, `get_pools`, `get_pools_with_apr`) to `Result<Json<T>, ApiError>`
- [x] 10.9 Convert `src/utilities/limit_order.rs` — update transaction-building functions to return `Result<T, ApiError>`, replace `.unwrap()` calls
- [x] 10.10 Verify dex controller compiles and all endpoints respond correctly

## 11. ci-api: Convert Spectrum Controller (Phase 1)

- [x] 11.1 Remove `BestSwapResult` enum, convert `get_best_swap` to return `Result<Json<BestSwapResponse>, ApiError>`
- [x] 11.2 Convert `get_spectrum_action`, `get_token_list`, `get_price_stats`, `get_price` to return `Result<Json<T>, ApiError>`
- [x] 11.3 Convert `build_swap_tx` from `(StatusCode, Json<Option<T>>)` to `Result<Json<T>, ApiError>`
- [x] 11.4 Convert `src/utilities/spectrum.rs` — update transaction-building functions to return `Result<T, ApiError>`, replace `.unwrap()` calls
- [x] 11.5 Verify spectrum controller compiles and endpoints respond correctly

## 12. ci-api: Convert Dexy Controller (Phase 1)

- [x] 12.1 Remove `MintStatusResponse` enum, convert `get_mint_status` to return `Result<Json<MintStatus>, ApiError>` with `MintConstraint` mapped to `ApiError::BadRequest`
- [x] 12.2 Convert `get_instances`, `get_analytics`, `get_analytics_history`, `get_bank_states`, `get_oracle_prices` to `Result<Json<T>, ApiError>`
- [x] 12.3 Convert `build_mint_tx` to return `Result<Json<Value>, ApiError>` and replace `.unwrap()` calls, convert `src/utilities/dexy.rs`
- [x] 12.4 Verify dexy controller compiles and endpoints respond correctly

## 13. ci-api: Sentry Tower Layer (Phase 2 — after ApiError refactoring is complete)

- [x] 13.1 Add `sentry_tower::NewSentryLayer` to the Axum router middleware stack (after `TraceLayer` and `CorsLayer`). Note: `SentryHttpLayer` requires `http` 1.0 (sentry-tower 0.46) but axum 0.6 depends on `http` 0.2 — add `SentryHttpLayer` when upgrading to axum 0.7+
- [ ] 13.2 Verify ci-api starts correctly with `SENTRY_DSN` set, and that HTTP request context is attached to Sentry events on error paths

## 14. Verification

- [ ] 14.1 Run `cargo build` and `cargo test` for ci-api — all tests pass, no warnings about unused imports
- [ ] 14.2 Run `cargo build` for ci-modules, crux-insight, crux-fulfiller — all compile successfully
- [ ] 14.3 Run `npm run build` for crux-frontend — builds successfully with Sentry config
- [ ] 14.4 Start ci-api locally without `SENTRY_DSN` — verify all endpoints return correct status codes and JSON error format
- [ ] 14.5 Start ci-api locally with a fake `SENTRY_DSN` — verify Sentry init succeeds (no crash) and error endpoints log correctly
- [ ] 14.6 Verify `{"error":"<message>"}` response format matches previous `QuoteResult::Error` etc. wire format (byte-for-byte comparison for client-facing errors, `"Internal server error"` for 500/502 errors)
- [ ] 14.7 Verify error sanitization: 500/502 responses do NOT contain internal error details, only `"Internal server error"`; verify the full error detail appears in `tracing::error!()` logs and Sentry events
- [ ] 14.8 Verify panic handler: trigger a panic in a test endpoint and confirm it is captured by Sentry (when `SENTRY_DSN` is set)
- [ ] 14.9 Verify no-op mode: run all services without `SENTRY_DSN` and confirm no network calls to Sentry occur and no performance overhead is measurable