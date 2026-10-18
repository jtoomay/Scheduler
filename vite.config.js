import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const here = import.meta.dirname

/**
 * Asset-info shape differs between Rollup versions (`name`) and rolldown (`names`),
 * so check both rather than assuming one.
 */
const isCss = (asset) =>
  asset.names?.some((n) => n.endsWith('.css')) || asset.name?.endsWith('.css')

// Library build. The dev harness lives in vite.playground.config.js.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // One stylesheet for the whole library: consumers import it once.
    cssCodeSplit: false,
    lib: {
      entry: resolve(here, 'src/ToomstackScheduler/index.js'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Rollup strips source-level directives, so the Next.js App Router marker
        // has to be re-added here. Harmless everywhere else.
        banner: '"use client";',
        // The entry has both named and default exports. 'named' makes the CJS build set
        // __esModule, so `require(...).default` interops correctly and matches index.d.cts.
        exports: 'named',
        assetFileNames: (asset) => (isCss(asset) ? 'styles.css' : '[name][extname]'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./vitest.setup.js'],
  },
})
