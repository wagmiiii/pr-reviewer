import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node24',
    platform: 'node',
    dts: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  {
    entry: ['src/action.ts'],
    format: ['cjs'],
    target: 'node24',
    platform: 'node',
    dts: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    noExternal: [/(.*)/], // bundle all dependencies for action
  },
]);
