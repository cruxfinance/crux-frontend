## ADDED Requirements

### Requirement: Unified API error type
The system SHALL define a unified `ApiError` enum that categorizes all API errors into typed variants with associated HTTP status codes: `BadRequest(String)` → 400, `Unauthorized(String)` → 401, `NotFound(String)` → 404, `Internal(String)` → 500, and `Database(sqlx::Error)` → 500, `External(String)` → 502.

#### Scenario: Handler returns an ApiError variant
- **WHEN** a handler returns `Err(ApiError::BadRequest("invalid address".into()))`
- **THEN** the HTTP response has status code 400 and body `{"error":"invalid address"}`

#### Scenario: Database error propagates via question mark operator
- **WHEN** a database query fails and the handler propagates it with `?`
- **THEN** the `sqlx::Error` is converted to `ApiError::Database(e)` via `From` impl, and the HTTP response has status code 500 and body `{"error":"Internal server error"}`

#### Scenario: Upstream service failure
- **WHEN** a call to an external service (Ergo node, CoinGecko) fails
- **THEN** the handler returns `Err(ApiError::External("..."))`, producing HTTP 502 and body `{"error":"..."}`

### Requirement: ApiError implements IntoResponse
`ApiError` SHALL implement Axum's `IntoResponse` trait, producing a JSON response with the shape `{"error": "<message>"}` and the appropriate HTTP status code. Internal error details (500, 502) SHALL be logged at error level and the client-facing message SHALL be a generic "Internal server error" to avoid leaking implementation details.

#### Scenario: Internal error message is not exposed to client
- **WHEN** a handler returns `Err(ApiError::Database(sqlx::Error::PoolTimedOut))`
- **THEN** the client receives `{"error":"Internal server error"}` with status 500
- **AND** the full error detail is logged via `tracing::error!`

#### Scenario: Client-facing errors preserve their message
- **WHEN** a handler returns `Err(ApiError::BadRequest("missing token_id parameter"))`
- **THEN** the client receives `{"error":"missing token_id parameter"}` with status 400

### Requirement: Handler signatures use Result
All API handler functions SHALL return `Result<Json<T>, ApiError>` instead of `(StatusCode, Json<T>)` tuples. The `Ok` variant wraps the success response type; the `Err` variant uses `ApiError`.

#### Scenario: Successful handler response
- **WHEN** a handler completes successfully with data `portfolio_tokens`
- **THEN** it returns `Ok(Json(portfolio_tokens))` and the client receives HTTP 200 with the JSON payload

#### Scenario: Handler error propagation via question mark
- **WHEN** a DB function called within a handler returns `Err(sqlx::Error::RowNotFound)`
- **THEN** the `?` operator converts it to `Err(ApiError::Database(_))` and Axum returns the appropriate HTTP 500 response

### Requirement: Serde untagged error enums are eliminated
The application-level `#[serde(untagged)]` error enums (`QuoteResult`, `SwapResult`, `CreateLimitOrderResult`, `CancelLimitOrderResult`, `ExpiryRefundResult`, `FeeEstimateResult`, `OrdersResult`, `BestSwapResult`, `BoxQueryResponse`, `MintStatusResponse`, `LpPositionsResult`, `AddLiquidityResult`, `RemoveLiquidityResult`) SHALL be removed. The success variant becomes the handler's `Ok` return type, and error cases are represented as `Err(ApiError::*)`.

#### Scenario: Quote endpoint currently using QuoteResult
- **WHEN** the `get_quote` handler was previously returning `(StatusCode, Json<QuoteResult>)` with `QuoteResult::Success(data)` or `QuoteResult::Error { error: msg }`
- **THEN** it now returns `Result<Json<QuoteResponse>, ApiError>` with `Ok(Json(data))` on success and `Err(ApiError::BadRequest(msg))` on failure

#### Scenario: Wire format is preserved
- **WHEN** a client sends a request that results in an error
- **THEN** the JSON response body is `{"error":"<message>"}`, which matches the current `QuoteResult::Error { error: String }` wire format exactly

### Requirement: DB functions return Result
All database functions that currently return bare values SHALL be changed to return `Result<T, sqlx::Error>`. The `sqlx::Error` type SHALL be convertible to `ApiError` via a `From<sqlx::Error>` impl on `ApiError`.

#### Scenario: DB query that previously panicked now returns error
- **WHEN** a DB function like `get_erg_history` encounters a database error
- **THEN** it returns `Err(sqlx::Error::...)` instead of panicking via `.unwrap()`
- **AND** the calling handler can propagate this error with `?` to produce an appropriate API error response

### Requirement: Unwrap calls are replaced with proper error handling
All `.unwrap()` calls in application code (controllers, db, utilities) SHALL be replaced with either `?` error propagation, `.map_err(|e| ApiError::Internal(...))?`, or `.expect("descriptive reason")` where failure indicates a programming error. Auto-generated `ergo_node_client/` code and test code are excluded from this requirement.

#### Scenario: Ergo-lib operations with user input
- **WHEN** an ergo-lib operation like `Address::try_from(user_input)` could fail based on user input
- **THEN** it uses `.map_err(|e| ApiError::BadRequest(format!("Invalid address: {}", e)))?` instead of `.unwrap()`

#### Scenario: Ergo-lib operations with validated constants
- **WHEN** an ergo-lib operation like `BoxValue::try_from(MIN_BOX_VALUE)` uses a known-good constant
- **THEN** it uses `.expect("MIN_BOX_VALUE must be valid")` instead of `.unwrap()` so the panic message is descriptive for Sentry