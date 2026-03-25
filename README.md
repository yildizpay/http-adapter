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
- **Immutable Design:** Core components are immutable to prevent side effects in concurrent environments.

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

### Exponential Backoff

The built-in `ExponentialBackoffPolicy` waits increasingly longer between retries (e.g., 200ms, 400ms, 800ms) and adds random jitter to prevent "thundering herd" issues.

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// Retries on 429, 502, 503, 504 and network errors
const retryPolicy = RetryPolicies.exponential(5);
```

### Circuit Breaker

To protect your system from waiting for a completely down downstream service, you can employ the `CircuitBreaker`. It opens the circuit after a configured amount of consecutive failures and replies instantaneously with `CircuitBreakerOpenException` without hitting the unresponsive server.

```typescript
import { CircuitBreaker } from '@yildizpay/http-adapter';

const breaker = new CircuitBreaker({
  failureThreshold: 5,         // Trip after 5 failures
  resetTimeoutMs: 30000,       // Try a 'half-open' request after 30 seconds
  successThreshold: 1,         // Close circuit after 1 successful half-open request
});
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
