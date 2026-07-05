import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  outDir: 'lib',
  format: ['cjs'],
  platform: 'node',
  dts: { entry: 'src/index.ts' },
  clean: true,
  minify: false,
  treeshake: true,
  sourcemap: false,
})
