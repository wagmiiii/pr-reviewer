import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  // Declarations come from `tsc -p tsconfig.build.json`, not from tsup — see
  // the comment in that file for why.
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
