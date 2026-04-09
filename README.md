<p align="center">
  <img src="assets/logo.png" width="20%" alt="@yildizpay/http-adapter" />
  <h1 align="center">@yildizpay/http-adapter</h1>
  <p align="center">
    <b>🇬🇧 English</b> | <a href="README.tr.md">🇹🇷 Türkçe</a>
  </p>
  <p align="center">
    <img src="https://github.com/yildizpay/http-adapter/actions/workflows/ci.yml/badge.svg" alt="Build Status" />
    <img src="https://img.shields.io/npm/v/@yildizpay/http-adapter" alt="NPM Version" />
    <img src="https://img.shields.io/npm/l/@yildizpay/http-adapter" alt="License" />
  </p>
</p>

A professional, robust, and highly configurable HTTP client adapter designed for enterprise-grade Node.js applications. It provides a fluent API, built-in resilience patterns, and a powerful interceptor system, all natively sitting on top of the **Node.js Native Fetch API**, making it a zero-dependency library while allowing injection of custom HTTP clients.

## Key Features

- **Fluent Request Builder:** Construct complex HTTP requests with an intuitive, chainable API.
- **Structured Exception Hierarchy:** Every HTTP status code and network failure maps to a dedicated, named exception class with rich metadata, `isRetryable()` signals, and structured `toJSON()` serialization.
- **Response Validation:** Attach one or more `ResponseValidator` implementations to any request to enforce schema constraints or business rules automatically before the response reaches your code.
- **Interceptor Architecture:** Easily implement middleware for logging, authentication, error handling, and data transformation.
- **Resilience & Reliability:** Built-in support for retry policies (Exponential Backoff, etc.) and a generic **Circuit Breaker** to handle transient failures gracefully and prevent cascading failures in S2S communication.
- **Type Safety:** Fully typed requests and responses using generics, ensuring type safety across your application.
- **Testable:** Designed with dependency injection in mind, making it easy to mock and test.
- **Interceptor Pipeline:** A structured middleware chain for modifying requests, responses, and errors at a global level.

## Installation

```bash
npm install @yildizpay/http-adapter
# or
yarn add @yildizpay/http-adapter
# or
pnpm add @yildizpay/http-adapter
```

## Usage

### 1. Basic Request Construction

Use the `RequestBuilder` to create requests cleanly and concisely.

```typescript
import { RequestBuilder, HttpMethod } from '@yildizpay/http-adapter';

const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/users')
  .setMethod(HttpMethod.POST)
  .addHeader('Authorization', 'Bearer token')
  .setBody({ name: 'John Doe', email: 'john@example.com' })
  .build();
```

### 2. Creating the Adapter

Instantiate the `HttpAdapter` using the fluent builder API.

```typescript
import { HttpAdapter, RetryPolicies, CircuitBreaker } from '@yildizpay/http-adapter';

const adapter = HttpAdapter.builder()
  .withInterceptor(new AuthInterceptor(), new LoggingInterceptor())
  .withRetryPolicy(RetryPolicies.exponential(3))
  .withCircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 })
  .withCorrelationId()                // propagate x-correlation-id header (opt-in)
  .build();
```

You can also use `HttpAdapter.create()` directly if you prefer a single-call approach.

```typescript
const adapter = HttpAdapter.create(
  [new AuthInterceptor()],
  RetryPolicies.exponential(3),
  undefined,                    // Optional custom HTTP client
  new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 }),
);
```

### 3. Sending a Request

Execute the request and receive a strongly-typed response.

```typescript
interface UserResponse {
  id: string;
  name: string;
}

try {
  const response = await adapter.send<UserResponse>(request);
  console.log('User created:', response.data);
} catch (error) {
  console.error('Request failed:', error);
}
```

## Error Handling

`@yildizpay/http-adapter` converts every raw error — HTTP failures, network-level OS errors, or totally unexpected exceptions — into a structured, typed exception class. This means your `catch` blocks never need to inspect raw status codes or error codes manually.

### Exception Hierarchy

```
BaseAdapterException
├── HttpException                    (any HTTP response error)
│   ├── BadRequestException          (400)
│   ├── UnauthorizedException        (401)
│   ├── ForbiddenException           (403)
│   ├── NotFoundException            (404)
│   ├── ConflictException            (409)
│   ├── UnprocessableEntityException (422)
│   ├── TooManyRequestsException     (429)  ← isRetryable() = true
│   ├── InternalServerErrorException (500)
│   ├── BadGatewayException          (502)  ← isRetryable() = true
│   ├── ServiceUnavailableException  (503)  ← isRetryable() = true
│   ├── GatewayTimeoutException      (504)  ← isRetryable() = true
│   └── ... (all 4xx / 5xx codes)
├── NetworkException                 (OS-level connectivity failures)
│   ├── ConnectionRefusedException   (ECONNREFUSED)  ← isRetryable() = true
│   ├── TimeoutException             (ETIMEDOUT / ECONNABORTED / AbortError)  ← isRetryable() = true
│   ├── SocketResetException         (ECONNRESET)  ← isRetryable() = true
│   ├── DnsResolutionException       (ENOTFOUND / EAI_AGAIN)
│   └── HostUnreachableException     (EHOSTUNREACH / ENETUNREACH)
├── UnknownException                 (any unclassifiable error)
└── CircuitBreakerOpenException      (circuit is open, request not sent)
```

### Catching Exceptions by Type

```typescript
import {
  NotFoundException,
  TooManyRequestsException,
  TimeoutException,
  ConnectionRefusedException,
  CircuitBreakerOpenException,
  UnknownException,
} from '@yildizpay/http-adapter';

try {
  const response = await adapter.send<PaymentResponse>(request);
} catch (error) {
  if (error instanceof NotFoundException) {
    // HTTP 404 — resource does not exist
    console.error('Resource not found:', error.response.data);
  } else if (error instanceof TooManyRequestsException) {
    // HTTP 429 — back off before retrying
    const retryAfterMs = error.getRetryAfterMs();
    console.warn(`Rate limited. Retry after ${retryAfterMs}ms`);
  } else if (error instanceof TimeoutException) {
    // ETIMEDOUT / AbortError — downstream service too slow
    console.error('Request timed out:', error.code);
  } else if (error instanceof ConnectionRefusedException) {
    // ECONNREFUSED — downstream service is down
    console.error('Service is down:', error.requestContext?.url);
  } else if (error instanceof CircuitBreakerOpenException) {
    // Circuit is open — fail fast without hitting the server
    console.error('Circuit breaker is open. Not sending request.');
  } else if (error instanceof UnknownException) {
    // Something unexpected — log and investigate
    console.error('Unhandled error:', error.toJSON());
  }
}
```

### Type Guards

If you prefer narrowing without `instanceof` (useful in functional pipelines or when crossing module boundaries), every exception class has a corresponding type guard:

```typescript
import {
  isHttpException,
  isTimeoutException,
  isConnectionRefusedException,
  isCircuitBreakerOpenException,
} from '@yildizpay/http-adapter';

function handleError(error: unknown): void {
  if (isTimeoutException(error)) {
    // TypeScript now knows: error is TimeoutException
    scheduleRetry(error.requestContext?.url);
  } else if (isHttpException(error)) {
    // TypeScript now knows: error is HttpException
    reportToMonitoring(error.response.status, error.response.data);
  }
}
```

### `isRetryable()` Signal

Each exception exposes an `isRetryable(): boolean` method that reflects whether the failure is transient and worth retrying. This is useful when implementing custom retry decorators or deciding at the application layer whether to propagate or retry an error.

```typescript
} catch (error) {
  if (error instanceof BaseAdapterException && error.isRetryable()) {
    return retryOperation();
  }
  throw error;
}
```

Retryable exceptions: `TooManyRequestsException (429)`, `BadGatewayException (502)`, `ServiceUnavailableException (503)`, `GatewayTimeoutException (504)`, `TimeoutException`, `SocketResetException`, `ConnectionRefusedException`.

### Structured Logging with `toJSON()`

All exceptions override `toJSON()`, making them compatible with structured loggers (Pino, Winston, etc.). `JSON.stringify(error)` produces a complete, nested log entry instead of an empty `{}`.

```typescript
} catch (error) {
  if (error instanceof BaseAdapterException) {
    logger.error(error.toJSON());
    // {
    //   name: 'NotFoundException',
    //   message: 'Not Found',
    //   code: 'ERR_NOT_FOUND',
    //   stack: '...',
    //   response: {
    //     status: 404,
    //     data: { detail: 'Payment record not found' },
    //     request: { method: 'GET', url: 'https://api.example.com/payments/123', correlationId: 'corr-abc' }
    //   }
    // }
  }
}
```

### `RequestContext` — Safe Request Metadata

Every exception automatically carries a `RequestContext` object (`method`, `url`, `correlationId`) sourced from the originating request. Headers and body are deliberately excluded to prevent accidental auth-token or PII leakage in logs.

```typescript
} catch (error) {
  if (error instanceof NetworkException) {
    logger.warn({
      event: 'network_failure',
      exception: error.name,
      request: error.requestContext, // { method, url, correlationId }
    });
  }
}
```

### Response Validators

Attach validators to a request to automatically enforce schema constraints or business rules on the response before it reaches your code. Validators run sequentially after the HTTP call succeeds and before response-side interceptors. The first validator that throws halts the chain.

```typescript
import { ResponseValidator, ValidationException, Response } from '@yildizpay/http-adapter';

class PaymentStatusValidator implements ResponseValidator<IyzicoResponse> {
  validate(response: Response<IyzicoResponse>): void {
    if (response.data.status !== 'success') {
      throw new ValidationException(
        `Payment failed: ${response.data.errorMessage}`,
        response,
      );
    }
  }
}

// Works with any schema validation library — zero coupling to Zod, Joi, etc.
class PaymentSchemaValidator implements ResponseValidator<unknown> {
  validate(response: Response<unknown>): void {
    IyzicoResponseSchema.parse(response.data); // Zod throws on mismatch
  }
}

const request = new RequestBuilder('https://api.iyzipay.com')
  .setEndpoint('/payment/auth')
  .setMethod(HttpMethod.POST)
  .setBody(dto)
  .validateWith(new PaymentSchemaValidator(), new PaymentStatusValidator())
  .build();
```

Catching a validation failure:

```typescript
import { isValidationException } from '@yildizpay/http-adapter';

} catch (error) {
  if (isValidationException(error)) {
    console.error('Validation failed:', error.message);
    console.error('Raw response:', error.response.data);
  }
}
```

Non-`BaseAdapterException` errors thrown inside a validator (e.g. `ZodError`) are automatically wrapped in `ValidationException` with the original error available as `cause`. Use the generic parameter for typed access:

```typescript
} catch (error) {
  if (isValidationException<ZodError>(error) && error.cause) {
    console.error('Schema issues:', error.cause.issues);
  }
}
```

The full interceptor lifecycle when validators are registered:

```
onRequest → HTTP call → onResponse → validators → onResponseValidated → caller
                                          ↓ (on failure)
                                       onError
```

`onResponse` always fires. `onResponseValidated` only fires when all validators pass — ideal for caching or downstream side effects that require a business-valid response.

### Error Interceptor

You can also catch and transform exceptions at the interceptor layer before they reach your business logic.

```typescript
import {
  HttpErrorInterceptor,
  Request,
  BaseAdapterException,
  UnauthorizedException,
} from '@yildizpay/http-adapter';

export class GlobalErrorInterceptor implements HttpErrorInterceptor {
  async onError(error: BaseAdapterException, request: Request): Promise<never> {
    if (error instanceof UnauthorizedException) {
      await this.tokenService.refresh();
    }
    // Re-throw so the caller can handle it
    throw error;
  }
}
```

## Resilience & Retries

Network instability is inevitable. This adapter allows you to define robust retry strategies.

### Built-in Retry Policies

| Policy | Factory | Behaviour |
|---|---|---|
| Exponential Backoff | `RetryPolicies.exponential(attempts)` | Delay doubles with each attempt plus small jitter — default choice |
| Fixed Delay | `RetryPolicies.fixedDelay(attempts, delayMs)` | Constant wait between every retry |
| Linear Backoff | `RetryPolicies.linearBackoff(attempts, stepMs)` | Delay grows linearly (`attempt × stepMs`) |
| Full Jitter | `RetryPolicies.fullJitter(attempts, baseMs)` | Fully random delay within exponential cap — best for spreading concurrent load |
| Decorrelated Jitter | `RetryPolicies.decorrelatedJitter(attempts, baseMs, maxDelayMs)` | AWS-recommended algorithm with widest spread across concurrent clients |

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// All policies retry on 429, 502, 503, 504 and network errors by default
RetryPolicies.exponential(3);
RetryPolicies.fixedDelay(3, 1000);          // 1 s between each attempt
RetryPolicies.linearBackoff(3, 500);        // 500 ms, 1000 ms, 1500 ms
RetryPolicies.fullJitter(3, 100);           // random within [0, 2^attempt * 100 ms]
RetryPolicies.decorrelatedJitter(3, 100);   // AWS decorrelated jitter, cap 30 s
```

### Custom Retry Predicate

Override the default retry decision (`error.isRetryable()`) for any policy via `retryIf()`. Accepts a plain function or a class implementing `RetryPredicate`.

```typescript
import { RetryPolicies, RetryPredicate, BaseAdapterException, isNetworkException } from '@yildizpay/http-adapter';

// Inline function
const policy = RetryPolicies.exponential(3)
  .retryIf((error) => isNetworkException(error));

// Class-based predicate
class BusinessRetryPredicate implements RetryPredicate {
  shouldRetry(error: BaseAdapterException): boolean {
    return error.isRetryable() && myCircuitIsAllowing();
  }
}

const policy = RetryPolicies.fullJitter(3).retryIf(new BusinessRetryPredicate());
```

### Circuit Breaker

To protect your system from waiting for a completely down downstream service, you can employ the `CircuitBreaker`. It opens the circuit after a configured amount of consecutive failures and replies instantaneously with `CircuitBreakerOpenException` without hitting the unresponsive server.

```typescript
import { CircuitBreaker, CircuitBreakerOpenException } from '@yildizpay/http-adapter';

const breaker = new CircuitBreaker({
  failureThreshold: 5,         // Trip after 5 failures
  resetTimeoutMs: 30000,       // Try a 'half-open' request after 30 seconds
  successThreshold: 1,         // Close circuit after 1 successful half-open request
});

// CircuitBreakerOpenException carries when the circuit will allow the next probe
try {
  await adapter.send(request);
} catch (err) {
  if (err instanceof CircuitBreakerOpenException) {
    console.warn(`Circuit is open. Retry after ${err.retryAfterMs()}ms`);
  }
}
```

#### State machine

```
  [CLOSED] ──(failureThreshold reached)──▶ [OPEN]
     ▲                                        │
     │                                (resetTimeoutMs)
     │                                        │
     └──(successThreshold met)──── [HALF_OPEN] ──(failure)──▶ [OPEN]
```

#### Why only one probe in HALF_OPEN?

Node.js runs on a single-threaded event loop, but `async/await` introduces cooperative multitasking: while one coroutine is suspended at an `await`, the event loop is free to start other coroutines. Without a guard, every request arriving during `HALF_OPEN` would read the same state and proceed concurrently — potentially overwhelming a service that has only just started to recover.

To prevent this, the circuit breaker uses a **probe flag**: only the first caller gets the probe slot; all subsequent concurrent callers receive `CircuitBreakerOpenException` until the probe resolves. This is a deliberate trade-off — a few requests are rejected in exchange for a controlled, safe recovery test.

## Observability

The adapter ships with a two-tier observability system. **Observers are read-only** — they cannot modify requests or responses. Use them for metrics, structured logging, and distributed tracing. Use interceptors when you need to mutate the pipeline.

### `HttpAdapterObserver`

Attach a single observer to the adapter via `.withObserver()` on the builder.

| Hook | When it fires |
|---|---|
| `onRequestStart(request)` | After all request interceptors, immediately before the HTTP call |
| `onRequestSuccess(response, durationMs)` | After a successful response (includes retry time if retries occurred) |
| `onRequestFailure(error, durationMs)` | When the final error is propagated to the caller |
| `onRetry(attempt, error, delayMs)` | Each time a retry is scheduled, before the backoff delay |

```typescript
import { HttpAdapterObserver, HttpAdapter, RetryPolicies } from '@yildizpay/http-adapter';

class MetricsObserver implements HttpAdapterObserver {
  onRequestSuccess(_response: Response, durationMs: number): void {
    metrics.histogram('http.request.duration', durationMs);
  }

  onRequestFailure(error: BaseAdapterException, durationMs: number): void {
    metrics.increment('http.request.error', { type: error.name });
  }

  onRetry(attempt: number, _error: BaseAdapterException, delayMs: number): void {
    logger.warn(`Retry attempt ${attempt} in ${delayMs}ms`);
  }
}

const adapter = HttpAdapter.builder()
  .withRetryPolicy(RetryPolicies.exponential(3))
  .withObserver(new MetricsObserver())
  .build();
```

### `CircuitBreakerObserver`

Attach an observer to a `CircuitBreaker` instance via the fluent `.observe()` method.

| Hook | When it fires |
|---|---|
| `onStateChange(from, to)` | On every state transition (CLOSED↔OPEN↔HALF_OPEN) |
| `onSuccess()` | After every successful execution |
| `onFailure(error)` | When a failure is counted (i.e. `isFailure` predicate returned `true`) |
| `onProbeRejected()` | When a concurrent caller is turned away in HALF_OPEN |

```typescript
import { CircuitBreaker, CircuitBreakerObserver, CircuitState } from '@yildizpay/http-adapter';

class CircuitMetricsObserver implements CircuitBreakerObserver {
  onStateChange(from: CircuitState, to: CircuitState): void {
    logger.warn(`Circuit breaker: ${from} → ${to}`);
    metrics.increment('circuit_breaker.state_change', { from, to });
  }

  onProbeRejected(): void {
    metrics.increment('circuit_breaker.probe_rejected');
  }
}

const adapter = HttpAdapter.builder()
  .withCircuitBreaker(
    new CircuitBreaker({ failureThreshold: 5 })
      .observe(new CircuitMetricsObserver()),
  )
  .withObserver(new MetricsObserver())
  .build();
```

## Interceptors

Thanks to the **Interface Segregation Principle (ISP)**, you aren't forced to implement massive interfaces. You can hook into the exact lifecycle event you need by implementing `HttpRequestInterceptor`, `HttpResponseInterceptor`, or `HttpErrorInterceptor`.

### 1. Request Interceptor (e.g., Auth Tokens)

Add common headers like Authorization tokens before requests leave.

```typescript
import { HttpRequestInterceptor, Request } from '@yildizpay/http-adapter';

export class AuthInterceptor implements HttpRequestInterceptor {
  async onRequest(request: Request): Promise<Request> {
    request.addHeader('Authorization', 'Bearer my-secret-token');
    return request;
  }
}
```

### 2. Response Interceptor (e.g., Data Transformation)

Inspect or mutate payloads identically across all incoming responses.

```typescript
import { HttpResponseInterceptor, Response } from '@yildizpay/http-adapter';

export class TransformResponseInterceptor implements HttpResponseInterceptor {
  async onResponse(response: Response): Promise<Response> {
    if (response.status === 201) {
      console.log('Resource successfully created!');
    }
    return response;
  }
}
```

### 3. Error Interceptor (e.g., Global Error Handling)

Catch network failures or non-success HTTP statuses centrally.

```typescript
import {
  HttpErrorInterceptor,
  Request,
  BaseAdapterException,
  UnauthorizedException,
} from '@yildizpay/http-adapter';

export class GlobalErrorInterceptor implements HttpErrorInterceptor {
  async onError(error: BaseAdapterException, request: Request): Promise<BadRequestException> {
    if (error instanceof UnauthorizedException) {
      console.error(`Unauthorized access to ${error.requestContext?.url}! Redirecting to login...`);
    }
    throw error;
  }
}
```

## Correlation ID Propagation

Every request automatically generates a `systemCorrelationId` used internally for logging and error context. You can also forward it as an outgoing header to downstream services.

Propagation is **opt-in** — enable it on the adapter with `.withCorrelationId()`:

```typescript
const adapter = HttpAdapter.builder()
  .withCorrelationId()                    // forwards as 'x-correlation-id' (default)
  .withCorrelationId('x-request-id')      // use a custom header name
  .build();
```

Per-request overrides take full precedence over the adapter-level config:

```typescript
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/payments')
  .withCorrelationId('x-trace-id')        // enable for this request with a custom header
  .build();

const request2 = new RequestBuilder('https://api.example.com')
  .setEndpoint('/internal')
  .withoutCorrelationId()                 // disable for this request (adapter config ignored)
  .build();
```

**Header resolution order:** per-request header → adapter header → `'x-correlation-id'`.

## Request-Level Overrides

The adapter's global configuration (retry policy, circuit breaker, interceptors) applies to every request by default. For cases where a single request needs different behaviour, `RequestBuilder` exposes per-request overrides that take full precedence over the global config.

### Retry Policy

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// Override: use a different policy for this request
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withRetryPolicy(RetryPolicies.decorrelatedJitter(5))
  .build();

// Disable: no retries for this request, regardless of global policy
const sensitiveRequest = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/refunds')
  .withoutRetry()
  .build();
```

### Circuit Breaker

```typescript
// Override: use a dedicated circuit breaker for this request
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withCircuitBreaker(new CircuitBreaker({ failureThreshold: 3 }))
  .build();

// Bypass: skip the circuit breaker entirely for this request
const probeRequest = new RequestBuilder('https://api.example.com')
  .setEndpoint('/health')
  .withoutCircuitBreaker()
  .build();
```

### Interceptor Exclusion

```typescript
// Exclude all instances of a class (e.g. skip logging for sensitive requests)
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withoutInterceptor(LoggingInterceptor)
  .build();

// Exclude a specific instance (when multiple instances of the same class are registered)
const loggingInterceptor = new LoggingInterceptor('payments');

const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withoutInterceptorInstance(loggingInterceptor)
  .build();
```

## Testing Utilities

`@yildizpay/http-adapter` ships a dedicated `testing` sub-path that provides purpose-built test doubles, spies, and no-op helpers. Import them without polluting your production bundle:

```typescript
import {
  MockHttpAdapter,
  MockHttpClient,
  NoopInterceptor,
  SpyInterceptor,
  SpyObserver,
} from '@yildizpay/http-adapter/testing';
```

### `MockHttpAdapter`

A full in-memory test double for `HttpAdapter` that implements `HttpAdapterContract`. Use it in unit tests to control responses without making real HTTP calls.

#### Setting up responses

```typescript
const adapter = new MockHttpAdapter();

// Always return this response
adapter.mockResolvedValue({ STATUS: 'SUCCESS', ORDER_ID: '123' });

// Always throw this error
adapter.mockRejectedValue(new ServiceUnavailableException(...));

// One-time responses consumed in FIFO order, falling back to the default
adapter
  .mockResolvedOnce({ STATUS: 'PENDING' })
  .mockResolvedOnce({ STATUS: 'SUCCESS' })
  .mockResolvedValue({ STATUS: 'UNKNOWN' });   // fallback

// Custom factory — receives the full Request object
adapter.mockImplementation((request) => ({
  STATUS: request.body?.type === 'REFUND' ? 'REFUNDED' : 'SUCCESS',
}));
```

#### Endpoint-specific mocking

Use `onEndpoint()` to scope responses and assertions to a single path. Endpoint responses take priority over global ones.

```typescript
adapter.onEndpoint('/api/payments').mockResolvedValue({ STATUS: 'SUCCESS' });
adapter.onEndpoint('/api/refunds').mockRejectedValue(new NotFoundException(...));

// One-time queue per endpoint
adapter.onEndpoint('/api/payments')
  .mockResolvedOnce({ STATUS: 'PENDING' })
  .mockResolvedValue({ STATUS: 'SUCCESS' });
```

#### Assertions

```typescript
// After running the code under test:
adapter.assertCalledTimes(2);
adapter.assertCalledWith('/api/payments', { method: HttpMethod.POST });
adapter.assertCalledWithBody(0, { AMOUNT: '100', CURRENCY: 'TRY' });
adapter.assertNthCalledWith(1, '/api/payments');
adapter.assertLastCalledWith('/api/refunds');
adapter.assertCallOrder('/api/payments', '/api/refunds');
adapter.assertNotCalled();

// Convenience getters
adapter.callCount;     // number
adapter.firstCall;     // Request | undefined
adapter.lastCall;      // Request | undefined
adapter.wasCalled();   // boolean
adapter.wasNotCalled(); // boolean
```

Endpoint scopes expose the same assertion API, scoped to their path:

```typescript
const scope = adapter.onEndpoint('/api/payments');
scope.assertCalledTimes(1);
scope.assertCalledWith({ body: { MERCHANT_ID: 'M001' } });
scope.wasCalled();
```

#### `RequestMatcher` — partial request matching

All `assertCalledWith` variants accept an optional `RequestMatcher` for deep partial matching on `method`, `body`, `headers`, and `queryParams`. Only the fields you specify are checked; extra fields in the actual request are ignored.

```typescript
adapter.assertCalledWith('/api/payments', {
  method: HttpMethod.POST,
  body: { AMOUNT: '100' },             // extra keys in actual body are ignored
  headers: { 'x-merchant-id': 'M001' },
});
```

Body matching uses deep partial equality — nested objects are matched partially, `NaN` is handled correctly via `Object.is`, `Date` instances are compared by value, and arrays are never confused with plain objects.

#### Strict mode

Enable strict mode to fail fast whenever a call is made to an unregistered endpoint, even when a global default is configured. Useful for catching unexpected HTTP calls in tests.

```typescript
const adapter = new MockHttpAdapter({ strict: true });
adapter.onEndpoint('/api/payments').mockResolvedValue({ STATUS: 'SUCCESS' });

// This throws immediately — '/api/users' is not registered
await adapter.send(request);
```

#### Reset

`reset()` clears all calls, queues, and default behaviors without invalidating existing `onEndpoint()` references.

```typescript
beforeEach(() => adapter.reset());
```

---

### `MockHttpClient`

A lower-level test double for the `HttpClientContract` transport layer. Use it when testing custom `HttpClient` wrappers rather than full adapter pipelines. Exposes the same queue API and assertion helpers as `MockHttpAdapter`.

```typescript
const client = new MockHttpClient();
client.mockResolvedValue({ data: { id: 1 }, status: 200, headers: {} });

const result = await client.request(config);
client.assertCalledTimes(1);
client.assertCalledWith({ method: HttpMethod.POST });
```

---

### Noop Helpers

Pass-through implementations that satisfy a contract without any side effects. Useful when a hook must be provided but its behaviour is irrelevant to the test under execution.

| Class | Implements |
|---|---|
| `NoopInterceptor` | All four `HttpInterceptor` hooks — returns each value unchanged |
| `NoopObserver` | All `HttpAdapterObserver` hooks — empty methods |
| `NoopCircuitBreakerObserver` | All `CircuitBreakerObserver` hooks — empty methods |

```typescript
const adapter = HttpAdapter.builder()
  .withInterceptor(new NoopInterceptor())
  .withObserver(new NoopObserver())
  .build();
```

---

### Spy Helpers

Record every invocation and pass values through unchanged. Use them when you need to assert that a hook was called without mocking the full request pipeline.

```typescript
const interceptorSpy = new SpyInterceptor();
const observerSpy = new SpyObserver();

const adapter = HttpAdapter.builder()
  .withInterceptor(interceptorSpy)
  .withObserver(observerSpy)
  .build();

await adapter.send(request);

// SpyInterceptor
expect(interceptorSpy.requestCalls).toHaveLength(1);
expect(interceptorSpy.responseCalls).toHaveLength(1);
expect(interceptorSpy.errorCalls).toHaveLength(0);

// SpyObserver
expect(observerSpy.requestStartCalls).toHaveLength(1);
expect(observerSpy.successCalls[0].durationMs).toBeGreaterThan(0);

// Reset between tests
interceptorSpy.reset();
observerSpy.reset();
```

| Spy | Recorded arrays |
|---|---|
| `SpyInterceptor` | `requestCalls`, `responseCalls`, `responseValidatedCalls`, `errorCalls` |
| `SpyObserver` | `requestStartCalls`, `successCalls`, `failureCalls`, `retryCalls` |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
