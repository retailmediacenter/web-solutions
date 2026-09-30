import { cpSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(),{name:'exclude-legacy-v395-from-public-build',closeBundle(){
    // Historical V39.5 is a local visual reference, never publish its bundled JS.
    rmSync(resolve(process.cwd(),'dist','v395'),{recursive:true,force:true});
    // Showcase is a self-contained static site, shipped below the main app.
    const showcase=resolve(process.cwd(),'..','showcase'),target=resolve(process.cwd(),'dist','showcase');
    cpSync(showcase,target,{recursive:true,filter:path=>!/[\\/](?:\\.git|README\\.md|package\\.json|template\\.html)$/.test(path)});
  }}],
  // Relative asset URLs keep the same build portable on GitHub Pages, Webglobe
  // and a domain root. API origin is configured separately via VITE_API_BASE_URL.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000', '/legacy': 'http://127.0.0.1:3000' }
  }
});