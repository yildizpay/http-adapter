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
- **Interceptor Pipeline:** Request, response ve hataları global düzeyde düzenlemek için yapılandırılmış bir middleware zinciri sunar.

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

### Built-in Retry Policy'ler

| Policy | Factory | Davranış |
|---|---|---|
| Exponential Backoff | `RetryPolicies.exponential(attempts)` | Her denemede gecikme iki katına çıkar, küçük jitter eklenir — varsayılan seçim |
| Fixed Delay | `RetryPolicies.fixedDelay(attempts, delayMs)` | Her retry arasında sabit bekleme süresi |
| Linear Backoff | `RetryPolicies.linearBackoff(attempts, stepMs)` | Gecikme doğrusal büyür (`attempt × stepMs`) |
| Full Jitter | `RetryPolicies.fullJitter(attempts, baseMs)` | Üstel cap içinde tamamen rastgele gecikme — concurrent yükü yaymak için en iyi seçim |
| Decorrelated Jitter | `RetryPolicies.decorrelatedJitter(attempts, baseMs, maxDelayMs)` | AWS tarafından önerilen algoritma, concurrent istemciler arasında en geniş yayılımı sağlar |

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// Tüm policy'ler varsayılan olarak 429, 502, 503, 504 ve ağ hatalarında retry yapar
RetryPolicies.exponential(3);
RetryPolicies.fixedDelay(3, 1000);          // her denemede 1 sn bekleme
RetryPolicies.linearBackoff(3, 500);        // 500 ms, 1000 ms, 1500 ms
RetryPolicies.fullJitter(3, 100);           // [0, 2^attempt * 100 ms] aralığında rastgele
RetryPolicies.decorrelatedJitter(3, 100);   // AWS decorrelated jitter, cap 30 sn
```

### Özel Retry Predicate

`retryIf()` ile herhangi bir policy'nin varsayılan retry kararını (`error.isRetryable()`) override edebilirsiniz. Düz bir fonksiyon ya da `RetryPredicate` interface'ini implement eden bir sınıf kabul eder.

```typescript
import { RetryPolicies, RetryPredicate, BaseAdapterException, isNetworkException } from '@yildizpay/http-adapter';

// Inline fonksiyon
const policy = RetryPolicies.exponential(3)
  .retryIf((error) => isNetworkException(error));

// Sınıf tabanlı predicate
class BusinessRetryPredicate implements RetryPredicate {
  shouldRetry(error: BaseAdapterException): boolean {
    return error.isRetryable() && myCircuitIsAllowing();
  }
}

const policy = RetryPolicies.fullJitter(3).retryIf(new BusinessRetryPredicate());
```

### Circuit Breaker

Tamamen çökmüş bir downstream servisi beklemeye karşı sisteminizi korumak için `CircuitBreaker` kullanabilirsiniz. Belirli sayıda ardışık hata alındığında circuit açılır ve yanıt vermeyen servise gereksiz istek göndermeksizin anında `CircuitBreakerOpenException` fırlatır.

```typescript
import { CircuitBreaker, CircuitBreakerOpenException } from '@yildizpay/http-adapter';

const breaker = new CircuitBreaker({
  failureThreshold: 5,         // 5 hatadan sonra circuit'i aç
  resetTimeoutMs: 30000,       // 30 saniye sonra half-open test isteği gönder
  successThreshold: 1,         // 1 başarılı half-open request sonrası circuit'i kapat
});

// CircuitBreakerOpenException bir sonraki deneme zamanını taşır
try {
  await adapter.send(request);
} catch (err) {
  if (err instanceof CircuitBreakerOpenException) {
    console.warn(`Circuit açık. ${err.retryAfterMs()}ms sonra tekrar dene`);
  }
}
```

#### Durum makinesi

```
  [CLOSED] ──(failureThreshold aşıldı)──▶ [OPEN]
     ▲                                        │
     │                               (resetTimeoutMs)
     │                                        │
     └──(successThreshold karşılandı)── [HALF_OPEN] ──(hata)──▶ [OPEN]
```

#### HALF_OPEN'da neden sadece bir probe isteği geçer?

Node.js, tek iş parçacıklı (single-threaded) bir event loop üzerinde çalışır; ancak `async/await` yapısı **kooperatif çoklu görev** (cooperative multitasking) modelini hayata geçirir: bir coroutine `await` noktasında askıya alındığında, event loop diğer coroutine'leri çalıştırmaya devam edebilir. Bu davranış, `HALF_OPEN` durumunda kritik bir risk yaratır: herhangi bir guard mekanizması olmaksızın, o anda gelen tüm istekler aynı `HALF_OPEN` durumunu okuyup eş zamanlı olarak ilerleyebilir — yeni toparlanmaya başlayan bir servisi bir anda çok sayıda istekle boğabilir.

Bunu önlemek için circuit breaker bir **probe flag** kullanır: yalnızca ilk çağıran probe slotunu alır; probe tamamlanana kadar diğer tüm eş zamanlı çağrılar `CircuitBreakerOpenException` ile reddedilir. Bu bilinçli bir tasarım kararıdır — birkaç isteği feda ederek servisin gerçekten sağlıklı olup olmadığı güvenli biçimde doğrulanır.

## Observability

Adaptör, iki katmanlı bir observability sistemiyle birlikte gelir. **Observer'lar salt okunurdur** — request veya response'u değiştiremezler. Metrics, yapılandırılmış loglama ve dağıtık izleme için observer'ları, pipeline'ı değiştirmeniz gerektiğinde ise interceptor'ları kullanın.

### `HttpAdapterObserver`

Builder üzerindeki `.withObserver()` metoduyla adaptöre tek bir observer bağlanır.

| Hook | Ne zaman tetiklenir |
|---|---|
| `onRequestStart(request)` | Tüm request interceptor'larından sonra, HTTP çağrısından hemen önce |
| `onRequestSuccess(response, durationMs)` | Başarılı yanıt sonrasında (retry süresi dahil) |
| `onRequestFailure(error, durationMs)` | Son hata çağırana iletildiğinde |
| `onRetry(attempt, error, delayMs)` | Her retry planlandığında, backoff gecikmesinden önce |

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
    logger.warn(`Retry denemesi ${attempt}, ${delayMs}ms sonra`);
  }
}

const adapter = HttpAdapter.builder()
  .withRetryPolicy(RetryPolicies.exponential(3))
  .withObserver(new MetricsObserver())
  .build();
```

### `CircuitBreakerObserver`

Fluent `.observe()` metodu aracılığıyla bir `CircuitBreaker` instance'ına observer bağlanır.

| Hook | Ne zaman tetiklenir |
|---|---|
| `onStateChange(from, to)` | Her state geçişinde (CLOSED↔OPEN↔HALF_OPEN) |
| `onSuccess()` | Her başarılı çalıştırma sonrasında |
| `onFailure(error)` | Bir hata sayıldığında (`isFailure` predicate `true` döndürdüğünde) |
| `onProbeRejected()` | HALF_OPEN'da eş zamanlı bir çağıran reddedildiğinde |

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

## Request Bazlı Override

Adapter'ın global konfigürasyonu (retry policy, circuit breaker, interceptorlar) varsayılan olarak tüm isteklere uygulanır. Tek bir isteğin farklı davranması gerektiğinde `RequestBuilder`, global config'i tamamen geçersiz kılan per-request override'lar sunar.

### Retry Policy

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// Override: bu istek için farklı bir policy kullan
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withRetryPolicy(RetryPolicies.decorrelatedJitter(5))
  .build();

// Disable: global policy'den bağımsız olarak bu istek için retry'ı kapat
const sensitiveRequest = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/refunds')
  .withoutRetry()
  .build();
```

### Circuit Breaker

```typescript
// Override: bu istek için ayrı bir circuit breaker kullan
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withCircuitBreaker(new CircuitBreaker({ failureThreshold: 3 }))
  .build();

// Bypass: bu istek için circuit breaker'ı tamamen atla
const probeRequest = new RequestBuilder('https://api.example.com')
  .setEndpoint('/health')
  .withoutCircuitBreaker()
  .build();
```

### Interceptor Hariç Tutma

```typescript
// Bir class'ın tüm instance'larını hariç tut (örn. hassas isteklerde loglama)
const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withoutInterceptor(LoggingInterceptor)
  .build();

// Belirli bir instance'ı hariç tut (aynı class'tan birden fazla instance varsa)
const loggingInterceptor = new LoggingInterceptor('payments');

const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/v1/payments')
  .withoutInterceptorInstance(loggingInterceptor)
  .build();
```

## Test Araçları

`@yildizpay/http-adapter`, production bundle'ını şişirmeden kullanabileceğiniz hazır test double'ları, spy'lar ve noop yardımcıları içeren ayrı bir `testing` sub-path'i ile gelir:

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

`HttpAdapterContract` interface'ini implemente eden, gerçek HTTP çağrısı yapmadan response'ları kontrol etmenize olanak tanıyan tam özellikli bir bellek içi test double'ı.

#### Response Yapılandırma

```typescript
const adapter = new MockHttpAdapter();

// Her çağrı için aynı response
adapter.mockResolvedValue({ STATUS: 'SUCCESS', ORDER_ID: '123' });

// Her çağrı için aynı hata
adapter.mockRejectedValue(new ServiceUnavailableException(...));

// FIFO sırasıyla tüketilen tek seferlik response'lar; kuyruk bitince fallback'e düşer
adapter
  .mockResolvedOnce({ STATUS: 'PENDING' })
  .mockResolvedOnce({ STATUS: 'SUCCESS' })
  .mockResolvedValue({ STATUS: 'UNKNOWN' });   // fallback

// Özel factory — tam Request nesnesini alır
adapter.mockImplementation((request) => ({
  STATUS: request.body?.type === 'REFUND' ? 'REFUNDED' : 'SUCCESS',
}));
```

#### Endpoint Bazlı Mocking

`onEndpoint()` ile response'ları ve assertion'ları tek bir path'e kilitleyebilirsiniz. Endpoint response'ları global response'lardan önceliklidir.

```typescript
adapter.onEndpoint('/api/payments').mockResolvedValue({ STATUS: 'SUCCESS' });
adapter.onEndpoint('/api/refunds').mockRejectedValue(new NotFoundException(...));

// Endpoint başına tek seferlik kuyruk
adapter.onEndpoint('/api/payments')
  .mockResolvedOnce({ STATUS: 'PENDING' })
  .mockResolvedValue({ STATUS: 'SUCCESS' });
```

#### Assertion'lar

```typescript
// Test edilen kod çalıştıktan sonra:
adapter.assertCalledTimes(2);
adapter.assertCalledWith('/api/payments', { method: HttpMethod.POST });
adapter.assertCalledWithBody(0, { AMOUNT: '100', CURRENCY: 'TRY' });
adapter.assertNthCalledWith(1, '/api/payments');
adapter.assertLastCalledWith('/api/refunds');
adapter.assertCallOrder('/api/payments', '/api/refunds');
adapter.assertNotCalled();

// Kısayol getter'lar
adapter.callCount;      // number
adapter.firstCall;      // Request | undefined
adapter.lastCall;       // Request | undefined
adapter.wasCalled();    // boolean
adapter.wasNotCalled(); // boolean
```

Endpoint scope'ları da aynı assertion API'sini kendi path'leriyle sınırlı olarak sunar:

```typescript
const scope = adapter.onEndpoint('/api/payments');
scope.assertCalledTimes(1);
scope.assertCalledWith({ body: { MERCHANT_ID: 'M001' } });
scope.wasCalled();
```

#### `RequestMatcher` — Kısmi Request Eşleştirme

Tüm `assertCalledWith` varyantları, `method`, `body`, `headers` ve `queryParams` üzerinde derin kısmi eşleştirme için opsiyonel bir `RequestMatcher` kabul eder. Yalnızca belirttiğiniz alanlar kontrol edilir; gerçek request'teki fazladan alanlar göz ardı edilir.

```typescript
adapter.assertCalledWith('/api/payments', {
  method: HttpMethod.POST,
  body: { AMOUNT: '100' },              // gerçek body'deki fazladan key'ler göz ardı edilir
  headers: { 'x-merchant-id': 'M001' },
});
```

Body eşleştirmesi derin kısmi eşitlik kullanır — iç içe nesneler kısmen eşleştirilir, `NaN` `Object.is` ile doğru şekilde ele alınır, `Date` instance'ları değer olarak karşılaştırılır ve array'ler düz nesnelerle karıştırılmaz.

#### Strict Mode

Strict mode, global bir default yapılandırılmış olsa bile kayıt dışı bir endpoint'e çağrı yapıldığında anında hata fırlatır. Testlerde beklenmedik HTTP çağrılarını yakalamak için kullanışlıdır.

```typescript
const adapter = new MockHttpAdapter({ strict: true });
adapter.onEndpoint('/api/payments').mockResolvedValue({ STATUS: 'SUCCESS' });

// '/api/users' kayıtlı olmadığından anında hata fırlatır
await adapter.send(request);
```

#### Reset

`reset()`, mevcut `onEndpoint()` referanslarını geçersiz kılmadan tüm çağrıları, kuyruğu ve varsayılan davranışları temizler.

```typescript
beforeEach(() => adapter.reset());
```

---

### `MockHttpClient`

`HttpClientContract` transport katmanı için daha düşük seviyeli bir test double'ı. Tam adapter pipeline'ı yerine özel `HttpClient` wrapper'larını test ederken kullanılır. `MockHttpAdapter` ile aynı kuyruk API'sine ve assertion yardımcılarına sahiptir.

```typescript
const client = new MockHttpClient();
client.mockResolvedValue({ data: { id: 1 }, status: 200, headers: {} });

const result = await client.request(config);
client.assertCalledTimes(1);
client.assertCalledWith({ method: HttpMethod.POST });
```

---

### Noop Yardımcılar

Herhangi bir yan etki olmadan bir contract'ı karşılayan pass-through implementasyonlar. Bir hook sağlanması zorunlu olduğunda ancak davranışı test için önem taşımadığında kullanılır.

| Sınıf | İmplemente Ettiği |
|---|---|
| `NoopInterceptor` | Tüm dört `HttpInterceptor` hook'u — her değeri değiştirmeden döndürür |
| `NoopObserver` | Tüm `HttpAdapterObserver` hook'ları — boş metodlar |
| `NoopCircuitBreakerObserver` | Tüm `CircuitBreakerObserver` hook'ları — boş metodlar |

```typescript
const adapter = HttpAdapter.builder()
  .withInterceptor(new NoopInterceptor())
  .withObserver(new NoopObserver())
  .build();
```

---

### Spy Yardımcılar

Her çağrıyı kaydeder ve değerleri değiştirmeden iletir. Tam request pipeline'ını mock'lamadan bir hook'un çağrıldığını doğrulamanız gerektiğinde kullanın.

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

// Testler arasında sıfırlama
interceptorSpy.reset();
observerSpy.reset();
```

| Spy | Kayıt Dizileri |
|---|---|
| `SpyInterceptor` | `requestCalls`, `responseCalls`, `responseValidatedCalls`, `errorCalls` |
| `SpyObserver` | `requestStartCalls`, `successCalls`, `failureCalls`, `retryCalls` |

## Katkıda Bulunma

Katkılarınızı her zaman bekliyoruz! Lütfen bir Pull Request göndermekten çekinmeyin.

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır.
