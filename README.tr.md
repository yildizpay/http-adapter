# @yildizpay/http-adapter

[🇬🇧 English](README.md) | 🇹🇷 **Türkçe**

![Build Status](https://github.com/yildizpay/http-adapter/actions/workflows/ci.yml/badge.svg)
![NPM Version](https://img.shields.io/npm/v/@yildizpay/http-adapter)
![License](https://img.shields.io/npm/l/@yildizpay/http-adapter)

Node.js tabanlı kurumsal seviye (enterprise-grade) uygulamalar için tasarlanmış profesyonel, dayanıklı (robust) ve yüksek oranda yapılandırılabilir bir HTTP istemci (client) adaptörü. Akıcı (fluent) bir API, yerleşik ağ direnci (resilience) desenleri ve güçlü bir önleyici (interceptor) sistemi sunar. Bunların tamamı, güvenilir Axios kütüphanesinin üzerinde konumlandırılmıştır.

## Temel Özellikler

- **Akıcı İstek Oluşturucu (Fluent Request Builder):** Sezgisel ve zincirlenebilir (chainable) bir API ile karmaşık HTTP isteklerini kolayca oluşturun.
- **Önleyici Mimarisi (Interceptor Architecture):** Loglama, kimlik doğrulama, hata yönetimi ve veri dönüşümü gibi ara yazılım (middleware) işlemlerini zahmetsizce entegre edin.
- **Ağ Direnci ve Güvenilirlik (Resilience & Reliability):** Sunucular arası entegrasyonlarda geçici arızaları zarif bir şekilde yönetmek ve zincirleme (cascading) hataları önlemek için üstel geri çekilme (Exponential Backoff vs.) gibi yeniden deneme (retry) politikaları ve yerleşik bir **Devre Kesici (Circuit Breaker)** içerir.
- **Tip Güvenliği (Type Safety):** Jenerikleri (generics) kullanan tam tiplendirilmiş (fully typed) istek ve yanıtlar ile uygulamanız genelinde tip güvenliği sağlar.
- **Test Edilebilirlik:** Bağımlılık enjeksiyonu (dependency injection) düşünülerek tasarlandığından, birim testleri (unit mock) yazmak oldukça kolaydır.
- **Değişmez (Immutable) Tasarım:** Eşzamanlı (concurrent) ortamlarda yan etkileri (side effects) önlemek için çekirdek (core) bileşenler değiştirilemez (immutable) yapıda tasarlanmıştır.

## Kurulum

```bash
npm install @yildizpay/http-adapter
# veya
yarn add @yildizpay/http-adapter
# veya
pnpm add @yildizpay/http-adapter
```

## Kullanım

### 1. Temel İstek Oluşturma

İstekleri temiz ve öz bir şekilde oluşturmak için `RequestBuilder` sınıfını kullanın.

```typescript
import { RequestBuilder, HttpMethod } from '@yildizpay/http-adapter';

const request = new RequestBuilder('https://api.example.com')
  .setEndpoint('/users')
  .setMethod(HttpMethod.POST)
  .addHeader('Authorization', 'Bearer token')
  .setBody({ name: 'Ahmet Yılmaz', email: 'ahmet@example.com' })
  .build();
```

### 2. Adaptörü Başlatma

İsteğe bağlı önleyiciler (interceptors), yeniden deneme (retry) politikaları ve devre kesici (circuit breaker) ile `HttpAdapter` nesnesini oluşturun.

```typescript
import { HttpAdapter, RetryPolicies, CircuitBreaker } from '@yildizpay/http-adapter';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000, 
});

const adapter = HttpAdapter.create(
  [
    /* interceptors (önleyiciler) */
  ],
  RetryPolicies.exponential(3), // Üstel (exponential) geri çekilme ile 3 defaya kadar yeniden dene
  undefined,                    // İsteğe bağlı özel axios nesnesi (opsiyonel)
  circuitBreaker                // İsteğe bağlı Devre Kesici (opsiyonel)
);
```

### 3. İstek Gönderme

İsteği yürütün ve kesin bir şekilde tiplendirilmiş (strongly-typed) yanıtı (response) alın.

```typescript
interface UserResponse {
  id: string;
  name: string;
}

try {
  const response = await adapter.send<UserResponse>(request);
  console.log('Kullanıcı oluşturuldu:', response.data);
} catch (error) {
  console.error('İstek başarısız oldu:', error);
}
```

## Direnç ve Yeniden Denemeler (Resilience & Retries)

Ağ kararsızlığı kaçınılmazdır. Bu adaptör, sağlam yeniden deneme stratejileri tanımlamanıza olanak tanır.

### Üstel Geri Çekilme (Exponential Backoff)

Yerleşik `ExponentialBackoffPolicy`, denemeler arasında giderek daha uzun süreler (ör. 200ms, 400ms, 800ms) bekler ve "gürleyen sürü" (thundering herd) sorunlarını önlemek için gecikmelere rastgele bir sapma (jitter) ekler.

```typescript
import { RetryPolicies } from '@yildizpay/http-adapter';

// 429, 500, 502, 503, 504 durum kodlarında ve ağ hatalarında yeniden dener
const retryPolicy = RetryPolicies.exponential(5);
```

### Devre Kesici (Circuit Breaker)

Sisteminizi tamamen çökmüş olan bir sunucuyu beklemekten korumak için `CircuitBreaker` (Devre Kesici) yönteminden yararlanabilirsiniz. Konfigürasyonla belirlenmiş miktarda ardışık hata alındığında devre açılır ve yanıt vermeyen sunucuya gereksiz istek göndermeksizin anında `CircuitBreakerOpenException` fırlatarak cevap verir.

```typescript
import { CircuitBreaker } from '@yildizpay/http-adapter';

const breaker = new CircuitBreaker({
  failureThreshold: 5,         // 5 hatadan sonra devreyi aç
  resetTimeoutMs: 30000,       // 30 saniye sonra 'yarı-açık' (half-open) test isteği dene
  successThreshold: 1,         // Yarı-açık durumda 1 başarılı istek sonrası devreyi kapat
});
```

## Önleyiciler (Interceptors)

Önleyiciler (Interceptors), bir isteğin yaşam döngüsüne (lifecycle) dâhil olmanızı sağlar. Özel iş mantıkları kurgulamak için `HttpInterceptor` arayüzünü uygulamanız yeterlidir.

```typescript
import { HttpInterceptor, Request, Response } from '@yildizpay/http-adapter';

export class LoggingInterceptor implements HttpInterceptor {
  async onRequest(request: Request): Promise<Request> {
    console.log(
      `[${request.systemCorrelationId}] ${request.method} isteği ${request.endpoint} adresine gönderiliyor.`,
    );
    return request;
  }

  async onResponse(response: Response): Promise<Response> {
    console.log(`İstek başarı durumu: ${response.status}`);
    return response;
  }

  async onError(error: unknown, request: Request): Promise<unknown> {
    console.error(`${request.endpoint} uç noktasına yapılan istekte hata oluştu`, error);
    return error;
  }
}
```

## Katkıda Bulunma

Katkılarınızı her zaman bekliyoruz! Lütfen bir "Pull Request" göndermekten çekinmeyin.

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır.
