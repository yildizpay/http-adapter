---
'@yildizpay/http-adapter': major
---

**API cleanup.** See [MIGRATION.md](https://github.com/yildizpay/http-adapter/blob/next/MIGRATION.md) for before and after code. ([#57](https://github.com/yildizpay/http-adapter/issues/57))

- `HttpAdapter.create()` takes one `HttpAdapterOptions` object (`interceptors`, `retryPolicy`, `httpClient`, `circuitBreaker`, `correlationId`, `observer`) instead of six positional parameters. `circuitBreaker` also accepts `CircuitBreakerOptions`, and the `interceptors` array is copied.
- The `attempts` parameter of every `RetryPolicies` factory is renamed to `maxAttempts`. It is still the total number of calls, including the first one, so positional calls are unaffected.
- `HttpBody` is a JSON object whose values may be arrays and nested arrays. `JsonValue`, `JsonObject` and `JsonPrimitive` are exported.
- `MockHttpAdapter.assertNthCalledWith(n, …)` (1-based) is replaced by `assertCallAt(index, …)` (0-based, like `getCall()`).
