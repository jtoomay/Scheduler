import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const here = import.meta.dirname

/**
 * Dev harness. The point of the aliases is that playground/ imports the library by its
 * published name, so a missing or misspelled export fails here instead of after publish.
 * Array form, because order matters: the stylesheet entry must win over the bare name.
 */
export default defineConfig({
  plugins: [react()],
  root: resolve(here, 'playground'),
  resolve: {
    alias: [
      {
        find: 'toomstack-scheduler/styles.css',
        replacement: resolve(here, 'src/ToomstackScheduler/scheduler.css'),
      },
      {
        find: 'toomstack-scheduler',
        replacement: resolve(here, 'src/ToomstackScheduler/index.js'),
      },
    ],
  },
  server: { port: 5181 },
  build: { outDir: resolve(here, 'playground-dist') },
})
