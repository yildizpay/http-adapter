# @yildizpay/http-adapter

**🇬🇧 English** | [🇹🇷 Türkçe](README.tr.md)

![Build Status](https://github.com/yildizpay/http-adapter/actions/workflows/ci.yml/badge.svg)
![NPM Version](https://img.shields.io/npm/v/@yildizpay/http-adapter)
![License](https://img.shields.io/npm/l/@yildizpay/http-adapter)

A professional, robust, and highly configurable HTTP client adapter designed for enterprise-grade Node.js applications. It provides a fluent API, built-in resilience patterns, and a powerful interceptor system, all natively sitting on top of the **Node.js Native Fetch API**, making it a zero-dependency library while allowing injection of custom HTTP clients.

## Key Features

- **Fluent Request Builder:** Construct complex HTTP requests with an intuitive, chainable API.
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

Instantiate the `HttpAdapter` with optional interceptors and retry policies.

```typescript
import { HttpAdapter, RetryPolicies, CircuitBreaker } from '@yildizpay/http-adapter';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000, 
});

const adapter = HttpAdapter.create(
  [
    /* interceptors */
  ],
  RetryPolicies.exponential(3), // Retry up to 3 times with exponential backoff
  undefined,                    // Optional custom HTTP client
  circuitBreaker                // Optional Circuit Breaker
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

## Resilience & Retries

Network instability is inevitable. This adapter allows you to define robust retry strategies.

### Exponential Backoff

The built-in `ExponentialBackoffPolicy` waits increasingly longer between retries (e.g., 200ms, 400ms, 800ms) and adds random jitter to prevent "thundering herd" issues.

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// Retries on 429, 500, 502, 503, 504 and network errors
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

Interceptors allow you to hook into the lifecycle of a request. Implement the `HttpInterceptor` interface to create custom logic.

```typescript
import { HttpInterceptor, Request, Response } from '@yildizpay/http-adapter';

export class LoggingInterceptor implements HttpInterceptor {
  async onRequest(request: Request): Promise<Request> {
    console.log(
      `[${request.systemCorrelationId}] Sending ${request.method} to ${request.endpoint}`,
    );
    return request;
  }

  async onResponse(response: Response): Promise<Response> {
    console.log(`Received status: ${response.status}`);
    return response;
  }

  async onError(error: unknown, request: Request): Promise<unknown> {
    console.error(`Error in request ${request.endpoint}`, error);
    return error;
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
