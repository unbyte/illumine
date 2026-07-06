import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm', 'cjs'],
  platform: 'node',
  dts: false,
  clean: true,
  minify: false,
  treeshake: true,
  sourcemap: false,
})
