import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'src/main/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                'electron',
                'path',
                'url',
                'fs',
                'os',
                'crypto',
                'http',
                'https',
                'electron-store',
                'electron-log',
              ],
            },
          },
          resolve: {
            // ws tries to require bufferutil and utf-8-validate which are optional
            // we alias them to a non-existent path and mark them as external
            // so rollup doesn't try to bundle them and they just fail at runtime (which ws handles)
            alias: {
              'bufferutil': 'node:empty',
              'utf-8-validate': 'node:empty',
            }
          }
        },
      },
      {
        entry: 'src/main/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
})
