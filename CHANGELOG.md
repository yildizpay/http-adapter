# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
