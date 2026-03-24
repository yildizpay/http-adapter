# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
