<p align="center">
  <img src="assets/logo.png" width="20%" alt="@yildizpay/http-adapter" />
  <h1 align="center">@yildizpay/http-adapter</h1>
  <p align="center">
    <a href="README.md">🇬🇧 English</a> | <b>🇹🇷 Türkçe</b>
  </p>
  <p align="center">
    <img src="https://github.com/yildizpay/http-adapter/actions/workflows/ci.yml/badge.svg" alt="Build Status" />
    <img src="https://img.shields.io/npm/v/@yildizpay/http-adapter" alt="NPM Version" />
    <img src="https://img.shields.io/npm/l/@yildizpay/http-adapter" alt="License" />
  </p>
</p>

Node.js tabanlı kurumsal uygulamalar için tasarlanmış profesyonel ve yüksek oranda yapılandırılabilir bir HTTP client adaptörü. Fluent API, built-in resilience pattern'ları, güçlü bir interceptor sistemi ve kapsamlı bir exception hiyerarşisi sunar. Zero-dependency olan paketin çekirdeği **Node.js Native Fetch API** kullanır; ancak istenen farklı custom HTTP client'lara da kolayca genişletilebilir.

## Temel Özellikler

- **Fluent Request Builder:** Sezgisel ve zincirlenebilir bir API ile karmaşık HTTP isteklerini kolayca oluşturun.
- **Structured Exception Hierarchy:** Her HTTP durum kodu ve ağ hatası, zengin metadata, `isRetryable()` sinyali ve `toJSON()` desteğiyle ayrı bir exception sınıfına dönüştürülür.
- **Response Validation:** Herhangi bir request'e bir veya daha fazla `ResponseValidator` ekleyerek schema kısıtlamalarını veya business rule'ları response kodunuza ulaşmadan otomatik olarak denetleyebilirsiniz.
- **Interceptor Mimarisi:** Loglama, kimlik doğrulama, hata yönetimi ve veri dönüşümü gibi middleware işlemlerini zahmetsizce entegre edin.
- **Resilience & Reliability:** S2S entegrasyonlarında geçici hataları zarif bir şekilde yönetmek için Exponential Backoff gibi retry policy'ler ve built-in **Circuit Breaker** içerir.
- **Type Safety:** Generic'ler kullanılarak tam olarak tiplendirilmiş request ve response'lar ile uygulama genelinde tip güvenliği sağlanır.
- **Test Edilebilirlik:** Dependency injection düşünülerek tasarlandığından mock yazmak oldukça kolaydır.
- **Immutable Tasarım:** Concurrent ortamlarda side effect'leri önlemek için core bileşenler immutable olarak tasarlanmıştır.

## Kurulum

```bash
npm install @yildizpay/http-adapter
# veya
yarn add @yildizpay/http-adapter
# veya
pnpm add @yildizpay/http-adapter
```

## Kullanım

### 1. Request Oluşturma

`RequestBuilder` ile istekleri temiz ve öz bir şekilde oluşturun.

```typescript
import { RequestBuilder, HttpMethod } from '@yildizpay/http-adapter';

const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/users')
  .setMethod(HttpMethod.POST)
  .addHeader('Authorization', 'Bearer token')
  .setBody({ name: 'Ahmet Yılmaz', email: 'ahmet@example.com' })
  .build();
```

### 2. Adapter'ı Başlatma

Fluent builder API ile `HttpAdapter` oluşturun.

```typescript
import { HttpAdapter, RetryPolicies } from '@yildizpay/http-adapter';

const adapter = HttpAdapter.builder()
  .withInterceptor(new AuthInterceptor(), new LoggingInterceptor())
  .withRetryPolicy(RetryPolicies.exponential(3))
  .withCircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 })
  .withCorrelationId()                // x-correlation-id header'ını ilet (opt-in)
  .build();
```

Tek seferlik kurulum için `HttpAdapter.create()` de kullanılabilir.

```typescript
const adapter = HttpAdapter.create(
  [new AuthInterceptor()],
  RetryPolicies.exponential(3),
  undefined,                    // Opsiyonel custom HTTP client
  new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 }),
);
```

### 3. Request Gönderme

Request'i çalıştırın ve strongly-typed response alın.

```typescript
interface UserResponse {
  id: string;
  name: string;
}

try {
  const response = await adapter.send<UserResponse>(request);
  console.log('Kullanıcı oluşturuldu:', response.data);
} catch (error) {
  console.error('Request başarısız oldu:', error);
}
```

## Hata Yönetimi (Error Handling)

`@yildizpay/http-adapter`, her türlü ham hatayı — HTTP hataları, OS düzeyindeki ağ hataları veya tamamen beklenmedik exception'lar — yapılandırılmış ve tiplendirilmiş bir exception sınıfına dönüştürür. Bu sayede `catch` bloklarında ham durum kodlarını ya da hata kodlarını elle incelemenize gerek kalmaz.

### Exception Hiyerarşisi

```
BaseAdapterException
├── HttpException                    (herhangi bir HTTP response hatası)
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
│   └── ... (tüm 4xx / 5xx kodları)
├── NetworkException                 (OS düzeyindeki bağlantı hataları)
│   ├── ConnectionRefusedException   (ECONNREFUSED)  ← isRetryable() = true
│   ├── TimeoutException             (ETIMEDOUT / ECONNABORTED / AbortError)  ← isRetryable() = true
│   ├── SocketResetException         (ECONNRESET)  ← isRetryable() = true
│   ├── DnsResolutionException       (ENOTFOUND / EAI_AGAIN)
│   └── HostUnreachableException     (EHOSTUNREACH / ENETUNREACH)
├── UnknownException                 (sınıflandırılamayan her türlü hata)
└── CircuitBreakerOpenException      (circuit açık, request gönderilmedi)
```

### Exception Türüne Göre Yakalama

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
    // HTTP 404 — kaynak bulunamadı
    console.error('Kaynak bulunamadı:', error.response.data);
  } else if (error instanceof TooManyRequestsException) {
    // HTTP 429 — retry'dan önce bekle
    const retryAfterMs = error.getRetryAfterMs();
    console.warn(`Rate limit aşıldı. ${retryAfterMs}ms sonra tekrar dene`);
  } else if (error instanceof TimeoutException) {
    // ETIMEDOUT / AbortError — downstream servis yavaş
    console.error('Request timeout:', error.code);
  } else if (error instanceof ConnectionRefusedException) {
    // ECONNREFUSED — downstream servis kapalı
    console.error('Servis kapalı:', error.requestContext?.url);
  } else if (error instanceof CircuitBreakerOpenException) {
    // Circuit açık — sunucuya istek gönderilmeden fail fast
    console.error('Circuit breaker açık. Request gönderilmedi.');
  } else if (error instanceof UnknownException) {
    // Beklenmedik bir hata — logla ve araştır
    console.error('Bilinmeyen hata:', error.toJSON());
  }
}
```

### Type Guard'lar

`instanceof` kullanmadan type narrowing tercih ediyorsanız — fonksiyonel pipeline'larda veya modül sınırlarını geçerken kullanışlıdır — her exception sınıfının karşılık gelen bir type guard'ı mevcuttur:

```typescript
import {
  isHttpException,
  isTimeoutException,
  isConnectionRefusedException,
  isCircuitBreakerOpenException,
} from '@yildizpay/http-adapter';

function handleError(error: unknown): void {
  if (isTimeoutException(error)) {
    // TypeScript artık biliyor: error, TimeoutException türünde
    scheduleRetry(error.requestContext?.url);
  } else if (isHttpException(error)) {
    // TypeScript artık biliyor: error, HttpException türünde
    reportToMonitoring(error.response.status, error.response.data);
  }
}
```

### `isRetryable()` Sinyali

Her exception, hatanın geçici olup olmadığını ve retry'a değer olup olmadığını belirten bir `isRetryable(): boolean` metodu sunar. Custom retry decorator'lar yazarken ya da uygulama katmanında hatayı tekrar denemek isteyip istemediğinize karar verirken kullanışlıdır.

```typescript
} catch (error) {
  if (error instanceof BaseAdapterException && error.isRetryable()) {
    return retryOperation();
  }
  throw error;
}
```

Retry edilebilir exception'lar: `TooManyRequestsException (429)`, `BadGatewayException (502)`, `ServiceUnavailableException (503)`, `GatewayTimeoutException (504)`, `TimeoutException`, `SocketResetException`, `ConnectionRefusedException`.

### `toJSON()` ile Structured Logging

Tüm exception'lar `toJSON()` metodunu override eder; bu sayede Pino, Winston gibi structured logger'larla tam uyumludur. `JSON.stringify(error)` çağrısı boş `{}` yerine eksiksiz bir log objesi üretir.

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
    //     data: { detail: 'Ödeme kaydı bulunamadı' },
    //     request: { method: 'GET', url: 'https://api.example.com/payments/123', correlationId: 'corr-abc' }
    //   }
    // }
  }
}
```

### `RequestContext` — Güvenli Request Metadata

Her exception, kaynak request'ten alınan `RequestContext` objesini (`method`, `url`, `correlationId`) otomatik olarak taşır. Auth token'larının veya kişisel verilerin (PII) loglara sızmasını önlemek amacıyla header ve body bilgileri bu objeden kasıtlı olarak çıkarılmıştır.

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

### Response Validator'lar

Request'e validator ekleyerek schema kısıtlamalarını veya business rule'ları response kodunuza ulaşmadan otomatik olarak denetleyebilirsiniz. Validator'lar HTTP çağrısı başarılı olduktan sonra, response-side interceptor'lardan önce sırayla çalışır. İlk hata veren validator chain'i durdurur.

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

// Zod, Joi gibi herhangi bir validation kütüphanesiyle çalışır
class PaymentSchemaValidator implements ResponseValidator<unknown> {
  validate(response: Response<unknown>): void {
    IyzicoResponseSchema.parse(response.data); // Zod uyuşmazlıkta exception fırlatır
  }
}

const request = new RequestBuilder('https://api.iyzipay.com')
  .setEndpoint('/payment/auth')
  .setMethod(HttpMethod.POST)
  .setBody(dto)
  .validateWith(new PaymentSchemaValidator(), new PaymentStatusValidator())
  .build();
```

Validation hatasını yakalamak:

```typescript
import { isValidationException } from '@yildizpay/http-adapter';

} catch (error) {
  if (isValidationException(error)) {
    console.error('Validation başarısız:', error.message);
    console.error('Ham response:', error.response.data);
  }
}
```

Validator içinde fırlatılan `BaseAdapterException` olmayan hatalar (örn. `ZodError`) otomatik olarak `ValidationException`'a sarılır; orijinal hata `cause`'ta tutulur. Typed erişim için generic parametre kullanılabilir:

```typescript
} catch (error) {
  if (isValidationException<ZodError>(error) && error.cause) {
    console.error('Schema hataları:', error.cause.issues);
  }
}
```

Validator kayıtlıyken tam interceptor lifecycle'ı:

```
onRequest → HTTP call → onResponse → validators → onResponseValidated → caller
                                          ↓ (hata durumunda)
                                       onError
```

`onResponse` her zaman çalışır. `onResponseValidated` yalnızca tüm validator'lar geçtiğinde çalışır — business açısından geçerli bir response gerektiren cache veya side effect işlemleri için idealdir.

### Error Interceptor

Exception'lar business logic'e ulaşmadan önce interceptor seviyesinde yakalanabilir ve dönüştürülebilir.

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
    // Caller'ın handle edebilmesi için hatayı yeniden fırlat
    throw error;
  }
}
```

## Resilience & Retry

Ağ kararsızlığı kaçınılmazdır. Bu adaptör, sağlam retry stratejileri tanımlamanıza olanak tanır.

### Exponential Backoff

Built-in `ExponentialBackoffPolicy`, denemeler arasında giderek artan süreler (ör. 200ms, 400ms, 800ms) bekler ve "thundering herd" sorununu önlemek için gecikmelere rastgele jitter ekler.

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// 429, 502, 503, 504 ve ağ hatalarında retry yapar
const retryPolicy = RetryPolicies.exponential(5);
```

### Circuit Breaker

Tamamen çökmüş bir downstream servisi beklemeye karşı sisteminizi korumak için `CircuitBreaker` kullanabilirsiniz. Belirli sayıda ardışık hata alındığında circuit açılır ve yanıt vermeyen servise gereksiz istek göndermeksizin anında `CircuitBreakerOpenException` fırlatır.

```typescript
import { CircuitBreaker } from '@yildizpay/http-adapter';

const breaker = new CircuitBreaker({
  failureThreshold: 5,         // 5 hatadan sonra circuit'i aç
  resetTimeoutMs: 30000,       // 30 saniye sonra half-open test isteği gönder
  successThreshold: 1,         // 1 başarılı half-open request sonrası circuit'i kapat
});
```

## Interceptors

**Interface Segregation Principle (ISP)** sayesinde gereksiz metodları implement etmek zorunda kalmazsınız. Yalnızca ihtiyaç duyduğunuz lifecycle event'e göre `HttpRequestInterceptor`, `HttpResponseInterceptor` veya `HttpErrorInterceptor` interface'ini implement edebilirsiniz.

### 1. Request Interceptor (Örn: Auth Token)

Request'ler gönderilmeden önce `Authorization` gibi header'ları otomatik ekleyebilirsiniz.

```typescript
import { HttpRequestInterceptor, Request } from '@yildizpay/http-adapter';

export class AuthInterceptor implements HttpRequestInterceptor {
  async onRequest(request: Request): Promise<Request> {
    request.addHeader('Authorization', 'Bearer benim-gizli-tokenim');
    return request;
  }
}
```

### 2. Response Interceptor (Örn: Veri Dönüşümü)

Gelen tüm response'ları merkezi olarak şekillendirebilir veya loglayabilirsiniz.

```typescript
import { HttpResponseInterceptor, Response } from '@yildizpay/http-adapter';

export class TransformResponseInterceptor implements HttpResponseInterceptor {
  async onResponse(response: Response): Promise<Response> {
    if (response.status === 201) {
      console.log('Kaynak başarıyla oluşturuldu!');
    }
    return response;
  }
}
```

### 3. Error Interceptor (Örn: Global Hata Yönetimi)

Sunucudan gelen hatalı HTTP kodlarını (4xx, 5xx) veya ağ hatalarını tek bir yerden yakalayıp yönetebilirsiniz.

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
      console.error(`${error.requestContext?.url} endpoint'ine yetkisiz erişim!`);
    }
    throw error;
  }
}
```

## Correlation ID Propagation

Her request otomatik olarak bir `systemCorrelationId` üretir; bu ID loglama ve hata context'i için içsel olarak kullanılır. İstersen downstream servislere giden request header'larına da eklenebilir.

Propagation **opt-in**'dir — adapter'da `.withCorrelationId()` çağrılarak etkinleştirilir:

```typescript
const adapter = HttpAdapter.builder()
  .withCorrelationId()                    // 'x-correlation-id' olarak iletir (default)
  .withCorrelationId('x-request-id')      // custom header adı kullanır
  .build();
```

Per-request override, adapter config'inin önüne geçer:

```typescript
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/payments')
  .withCorrelationId('x-trace-id')        // bu request için custom header ile etkinleştir
  .build();

const request2 = new RequestBuilder('https://api.example.com')
  .setEndpoint('/internal')
  .withoutCorrelationId()                 // bu request için devre dışı bırak
  .build();
```

**Header resolution sırası:** per-request header → adapter header → `'x-correlation-id'`.

## Katkıda Bulunma

Katkılarınızı her zaman bekliyoruz! Lütfen bir Pull Request göndermekten çekinmeyin.

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır.
