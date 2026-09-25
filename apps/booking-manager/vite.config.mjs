import {defineConfig} from 'vite';
// Relativne putanje omogućavaju odvojen HTTPS static deploy.
export default defineConfig({
  base: './',
  server: {port: 4184, strictPort: true},
  preview: {port: 4185, strictPort: true},
  build: {target: 'es2020'},
});
