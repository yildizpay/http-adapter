# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.0] - 2026-03-26

### Added

- **`TokenProvider` Type**: A shared contract (`string | (() => string | Promise<string>)`) used across auth interceptors. Supports static tokens, synchronous factories, and async factories (e.g. secret stores, token caches).
- **`BearerAuthInterceptor`**: Attaches a `Bearer` token to the `Authorization` header on every request. Instantiated via `BearerAuthInterceptor.of(provider)`.
- **`BasicAuthInterceptor`**: Encodes `username:password` as Base64 and attaches it to the `Authorization` header per RFC 7617. Instantiated via `BasicAuthInterceptor.of(username, password)`.
- **`ApiKeyInterceptor`**: Attaches an API key either as a request header or as a query parameter, controlled by the `placement` option. Instantiated via `ApiKeyInterceptor.of(provider, { header: '...' })` or `ApiKeyInterceptor.of(provider, { queryParam: '...' })`.

## [3.4.1] - 2026-03-26

### Fixed

- **`ExponentialBackoffPolicy.retryOn()`**: Replaced manual status code and error code inspection with a delegation to `BaseAdapterException.isRetryable()`. The retry decision is now fully consistent with the retryability contract defined on each exception class. As a side effect, HTTP 500 (`InternalServerErrorException`) is no longer treated as retryable — 500 does not override `isRetryable()` because it is not reliably transient.

## [3.4.0] - 2026-03-26

### Added

- **Correlation ID Propagation**: The adapter now supports forwarding the internally-tracked `systemCorrelationId` as an outgoing request header to downstream services. Propagation is **opt-in** — disabled by default unless explicitly configured.
- **`CorrelationIdConfig` Interface**: A unified configuration type used at both the adapter and request level. Fields: `enabled: boolean` and an optional `header` (falls back through the resolution chain to `'x-correlation-id'`).
- **`HttpAdapterBuilder.withCorrelationId(header?)`**: Enables propagation globally for all requests on this adapter. Accepts an optional header name; defaults to `'x-correlation-id'`.
- **`RequestBuilder.withCorrelationId(header?)`**: Overrides the adapter-level config for a specific request — enables propagation, optionally with a custom header name.
- **`RequestBuilder.withoutCorrelationId()`**: Explicitly disables propagation for a specific request, regardless of the adapter-level configuration.
- **Header Resolution Order**: Per-request header → adapter-level header → `'x-correlation-id'`. If the per-request config disables propagation, no header is added even when the adapter has propagation enabled.

## [3.3.0] - 2026-03-25

### Added

- **`HttpAdapterBuilder`**: A fluent, chainable builder class for constructing fully configured `HttpAdapter` instances. Provides a readable alternative to `HttpAdapter.create()`, especially useful in dependency-injection containers or when assembling adapters with multiple options.
- **`HttpAdapter.builder()` Static Factory**: A convenience entry point that returns a new `HttpAdapterBuilder`, enabling one-liner setups like `HttpAdapter.builder().withRetryPolicy(...).withCircuitBreaker(...).build()`.
- **`withInterceptor(...interceptors)`**: Registers one or more interceptors via rest parameters. Can be called multiple times — all interceptors accumulate in registration order.
- **`withRetryPolicy(policy)`**: Sets the retry policy on the builder.
- **`withCircuitBreaker(breakerOrOptions)`**: Accepts either a pre-configured `CircuitBreaker` instance or a plain `CircuitBreakerOptions` object; in the latter case the instance is created automatically.
- **`withHttpClient(client)`**: Overrides the default HTTP client transport — useful for testing or custom fetch integrations.

## [3.2.0] - 2026-03-25

### Added

- **`ResponseValidator` Interface**: A pluggable contract for validating HTTP responses before they are returned to the caller. Implement `validate(response: Response<T>): Promise<void> | void` to enforce schema constraints or business rules. Both sync and async validators are supported.
- **`ValidationException<TCause>`**: A new generic exception class thrown when a validator rejects a response. The optional `TCause` parameter narrows the type of `cause` (e.g. `ValidationException<ZodError>`) for typed access without casting; defaults to `unknown`. Carries the original `Response` object for inspection, exposes `toJSON()` for structured logging, and is not retryable.
- **`isValidationException` Type Guard**: Consistent with the existing guard pattern, enables safe narrowing without `instanceof`.
- **`RequestBuilder.validateWith(...validators)`**: Registers one or more validators on a request via rest parameters. Validators accumulate across multiple calls and are stored on the `Request` model.
- **`HttpValidatedResponseInterceptor`**: A new interceptor interface with an `onResponseValidated` hook that fires only after all registered validators pass. Complements the existing `onResponse` hook which always fires regardless of validation outcome.
- **Interceptor Lifecycle for Validation**: The full request lifecycle is now `onRequest → HTTP call → onResponse → validators → onResponseValidated → caller`. If a validator throws, `onResponseValidated` is skipped and `onError` is triggered instead — while `onResponse` always runs.
- **Automatic Error Wrapping in Validators**: Non-`BaseAdapterException` errors thrown by validators (e.g. `ZodError`, `TypeError`) are automatically wrapped in `ValidationException` with the original error as `cause`. `BaseAdapterException` subclasses are re-thrown as-is.

## [3.1.0] - 2026-03-24

### Added

- **Semantic HTTP Exception Hierarchy**: Every HTTP status code (400–511) now maps to a dedicated, named exception class (e.g. `NotFoundException`, `TooManyRequestsException`, `GatewayTimeoutException`). Catching by class is now the idiomatic way to branch on status.
- **Structured Network Exceptions**: Added `ConnectionRefusedException`, `TimeoutException`, `SocketResetException`, `DnsResolutionException`, and `HostUnreachableException` — all derived from `NetworkException`. Each carries a typed error code (`ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`, `EHOSTUNREACH`/`ENETUNREACH`).
- **`UnknownException`**: Wraps any error that does not map to an HTTP or network failure (plain `Error`, primitives, `null`/`undefined`).
- **`RequestContext` Interface**: A security-safe request metadata object (`{ method?, url?, correlationId? }`) that is automatically attached to every exception. Headers and body are intentionally excluded to prevent auth-token and PII leakage in logs.
- **`isRetryable()` Method**: All exception classes expose `isRetryable(): boolean`. Retryable by default: `429`, `502`, `503`, `504` (HTTP) and `TimeoutException`, `SocketResetException`, `ConnectionRefusedException` (network).
- **`toJSON()` Override**: All exception classes override `toJSON()` so that `JSON.stringify(error)` produces a fully structured log-friendly object instead of `{}`. Causes are serialized recursively.
- **`getRetryAfterMs()` Helper**: `HttpException` parses the `Retry-After` response header in a case-insensitive manner and returns the delay in milliseconds.
- **`isClientError()` / `isServerError()` Helpers**: Convenience methods on `HttpException` to distinguish 4xx from 5xx without manually checking status ranges.
- **Exception Type Guards**: Exported `isHttpException`, `isNetworkException`, `isTimeoutException`, `isConnectionRefusedException`, `isDnsResolutionException`, `isSocketResetException`, `isHostUnreachableException`, `isUnknownException`, `isCircuitBreakerOpenException` for safe narrowing without `instanceof`.
- **`ErrorConverter`**: A central utility that normalizes any raw error (Axios-like object, native `Error`, plain object, primitive) into the strongly-typed exception hierarchy. Used internally by `HttpAdapter` and available for custom client adapters.
- **Native `Error.cause` Chaining**: All exceptions chain the original cause via the native `Error({ cause })` second argument (requires `"ES2022.Error"` in `tsconfig.json` lib), enabling full stack traces in structured loggers.
- **`HostUnreachableException`**: New network exception for `EHOSTUNREACH` and `ENETUNREACH` OS error codes.
- **100% Test Coverage**: All statements, branches, functions, and lines across the entire codebase are covered (307 tests).

### Changed

- `Response.create()` now accepts an optional `RequestContext` object as the fourth argument instead of separate `correlationId` and `url` parameters. `systemCorrelationId` is now a derived getter from `requestContext.correlationId`.
- `HttpAdapter` automatically constructs and propagates a `RequestContext` (method, url, correlationId) through both the success path and the error path on every request.
- The error interceptor contract now receives and re-throws `BaseAdapterException` subclasses instead of raw unknowns.

## [3.0.0] - 2026-03-23

### Breaking Changes
- **Interface Segregation**: The `HttpInterceptor` contract has been surgically divided into three discrete optional interfaces (`HttpRequestInterceptor`, `HttpResponseInterceptor`, `HttpErrorInterceptor`). Consumers who previously forced empty methods inside `implements HttpInterceptor` classes must now explicitly target the single interface they wish to implement, ensuring total compliance with SOLID (Interface Segregation Principle).

## [2.0.1] - 2026-03-22

### Fixed
- Fixed an issue where the NPM badge and `package.json` license metadata incorrectly stated `ISC` instead of the actual `MIT` license.

## [2.0.0] - 2026-03-22

### Breaking Changes
- **Zero Dependency Architecture**: Completely removed the `axios` dependency. The adapter now natively runs on top of the Node.js `Fetch API`.
- **Exception Handling**: Deprecated `AxiosError` representations in favor of a strictly-typed custom `HttpClientException`. Manual `try/catch` and interceptor blocks that check for Axios-specific error properties will need to be refactored to catch `HttpClientException`.
- **Strict Generics**: Elevated internal architecture code quality by transitioning loose generic representations (`<T = any>`) to robust strict typing (`<T = unknown>`), securing payload integrity across `HttpAdapter`.

### Changed
- Refactored `HttpAdapter` to rely perfectly on the `HttpClientContract` abstraction instead of hard-coupling a concrete client, allowing for completely pluggable custom HTTP libraries.

## [1.1.0] - 2026-03-11

### Added
- **Circuit Breaker Pattern**: Introduced `CircuitBreaker` resilience pattern to prevent cascading failures in Server-to-Server interactions.
- Added comprehensive unit tests for `CircuitBreaker` logic and adapter integration (100% code coverage).
- Added Turkish translation for documentation (`README.tr.md`).
- Added test coverage script (`test:cov`) to `package.json`.

### Fixed
- Fixed a minor bug in `ExponentialBackoffPolicy` tests to cover `null` and primitive errors, ensuring complete edge-case test coverage.

## [1.0.2] - Previous Release

### Added
- Initial release of the `@yildizpay/http-adapter` package.
- Fluent `RequestBuilder`.
- Generic `HttpAdapter` wrapping Axios.
- Extensible `HttpInterceptor` architecture.
- `ExponentialBackoffPolicy` for automatic retries.
