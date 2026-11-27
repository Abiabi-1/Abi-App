import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
export default defineConfig({
  base: './',
  plugins: [preact()],
  build: { outDir: '../next', emptyOutDir: true, target: 'es2019', sourcemap: false },
});
