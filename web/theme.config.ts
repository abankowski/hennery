import { defineConfig } from 'vite'
export default defineConfig({
  publicDir: false,
  build: { outDir: 'public', emptyOutDir: false, target: 'es2022', minify: false,
    lib: { entry: 'src/lib/theme-bootstrap.ts', name: 'HenneryTheme', formats: ['iife'], fileName: () => 'theme.js' } },
})
