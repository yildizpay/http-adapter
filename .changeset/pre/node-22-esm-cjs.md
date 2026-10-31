---
'@yildizpay/http-adapter': major
---

**Node.js >= 22 is required, and the package ships ESM and CommonJS builds.** ([#47](https://github.com/yildizpay/http-adapter/issues/47))

- Node 18 and 20 are end-of-life and no longer supported.
- `import` resolves to `dist/index.js` and `require` to `dist/index.cjs`, each with its own type declarations. The per-file output under `dist/` is gone, so tools that bypass `exports` (such as TypeScript's legacy `node10` resolution) can no longer reach paths like `dist/core/http.adapter`; import from `@yildizpay/http-adapter` or `@yildizpay/http-adapter/testing`.
- An application that loads the package through both `import` and `require` gets two copies of every class, so `instanceof` checks only match within the same module format.
- Type declarations keep their JSDoc, and the tarball no longer contains `tsconfig.tsbuildinfo`.
