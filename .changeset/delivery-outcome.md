---
'@yildizpay/http-adapter': minor
---

**Every exception reports whether the request reached the server.** ([#49](https://github.com/yildizpay/http-adapter/issues/49))

`deliveryOutcome` is `'not_sent'`, `'unknown'` or `'received'` on every `BaseAdapterException`, and is included in `toJSON()`. Use `isNotSent`, `isDeliveryUnknown`, `isReceived` or `getDeliveryOutcome` to decide whether a failed payment may be sent again or to another provider.

- `not_sent` is only reported with positive evidence. It covers DNS failures, refused or unreachable connections, timeouts while connecting, TLS errors, an open circuit breaker, request interceptor errors and body serialization errors.
- `received` covers HTTP error statuses, validation failures and bodies that break off after the headers arrived.
- Everything else is `unknown`.
- The default client measures the outcome from undici's `diagnostics_channel` events, with no new dependency. A timeout while connecting is now told apart from a timeout after the request was sent.
- Custom clients can set `deliveryOutcome` on the errors they throw.
