# Migrating from v3 to v4

This guide lists every breaking change in `@yildizpay/http-adapter` 4.0, with before and after code. It is updated as v4 changes land on the `next` branch.

## Runtime and packaging

### Node.js 22 or later is required

Node 18 and 20 are end-of-life. `engines` is now `node >= 22`.

### ESM and CommonJS builds

The package ships both formats, so `import` and `require` keep working without changes. The per-file output under `dist/` is gone, so import from the package entry points only:

```typescript
// Before (only resolved with TypeScript's legacy node10 resolution)
import { HttpAdapter } from '@yildizpay/http-adapter/dist/core/http.adapter';

// After
import { HttpAdapter } from '@yildizpay/http-adapter';
import { MockHttpAdapter } from '@yildizpay/http-adapter/testing';
```

## Adapter setup

### `HttpAdapter.create()` takes an options object

The six positional parameters are replaced by one options object. Every option is optional, and `circuitBreaker` also accepts `CircuitBreakerOptions`, as the builder does. `HttpAdapter.builder()` is unchanged and remains the recommended way to configure an adapter.

```typescript
// Before
const adapter = HttpAdapter.create(
  [new AuthInterceptor()],
  RetryPolicies.exponential(3),
  undefined,
  new CircuitBreaker({ failureThreshold: 5 }),
  { enabled: true, header: 'x-correlation-id' },
  new MetricsObserver(),
);

// After
const adapter = HttpAdapter.create({
  interceptors: [new AuthInterceptor()],
  retryPolicy: RetryPolicies.exponential(3),
  circuitBreaker: { failureThreshold: 5 },
  correlationId: { enabled: true, header: 'x-correlation-id' },
  observer: new MetricsObserver(),
});
```

| v3 positional parameter | v4 option |
|---|---|
| `interceptors` (1st) | `interceptors` |
| `retryPolicy` (2nd) | `retryPolicy` |
| `httpClient` (3rd) | `httpClient` |
| `circuitBreaker` (4th) | `circuitBreaker` |
| `correlationIdConfig` (5th) | `correlationId` |
| `observer` (6th) | `observer` |

`create()` now copies the `interceptors` array, so pushing to that array after creating the adapter no longer changes the adapter.

## Retry policies

### `attempts` is now `maxAttempts`

The first parameter of every `RetryPolicies` factory is renamed to match the `RetryPolicy.maxAttempts` property. It is still the **total number of calls, including the first one**, so calls with positional arguments keep working unchanged:

```typescript
// Before and after: at most 3 calls (1 original + 2 retries)
RetryPolicies.exponential(3);
```

Only code that refers to the parameter by name, such as wrappers or docs, needs updating:

| v3 | v4 |
|---|---|
| `exponential(attempts)` | `exponential(maxAttempts)` |
| `fixedDelay(attempts, delayMs)` | `fixedDelay(maxAttempts, delayMs)` |
| `linearBackoff(attempts, stepMs)` | `linearBackoff(maxAttempts, stepMs)` |
| `fullJitter(attempts, baseMs)` | `fullJitter(maxAttempts, baseMs)` |
| `decorrelatedJitter(attempts, baseMs, maxDelayMs)` | `decorrelatedJitter(maxAttempts, baseMs, maxDelayMs)` |

## Request bodies

### `HttpBody` allows arrays

`HttpBody` is now a JSON object type (`JsonObject`) whose values can be primitives, objects, arrays and nested arrays. `JsonValue`, `JsonObject` and `JsonPrimitive` are exported too.

```typescript
// Before: did not compile, because arrays were not allowed
// After:
new RequestBuilder(baseUrl)
  .setEndpoint('/cart')
  .setBody({ items: [{ sku: 'A1', qty: 2 }], tags: ['gift'] })
  .build();
```

A top-level array body is not an `HttpBody`. Serialize it yourself and send it with `setRawBody(JSON.stringify(items))`. Form-urlencoded bodies still accept flat objects only, and arrays are rejected with a `TypeError` like nested objects are.

## Testing utilities

### Positional mock APIs are zero-based: `assertNthCalledWith` is now `assertCallAt`

`assertNthCalledWith(n, …)` was 1-based, while `getCall(index)` and `assertCalledWithBody(index, …)` are 0-based. It is replaced by the zero-based `assertCallAt(index, …)`:

```typescript
// Before: checks the first call
adapter.assertNthCalledWith(1, '/api/payments', { method: HttpMethod.POST });

// After: same check
adapter.assertCallAt(0, '/api/payments', { method: HttpMethod.POST });
```

All positional testing APIs now count from 0: `getCall`, `assertCalledWithBody` and `assertCallAt` on `MockHttpAdapter`, `getCall` on `EndpointMockScope`, and `getCall` on `MockHttpClient`.
