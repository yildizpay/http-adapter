import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'testing/index': 'src/testing/index.ts',
  },
  format: ['esm', 'cjs'],
  target: 'node22',
  dts: true,
  sourcemap: true,
  clean: true,
  // Shared chunk, so classes such as Response are the same in both entry points.
  splitting: true,
  treeshake: true,
});
