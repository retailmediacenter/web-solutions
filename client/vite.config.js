import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const normalizedBase=value=>{
  const path=(value||'/').trim()||'/';
  return path.startsWith('/') ? (path.endsWith('/')?path:path+'/') : '/'+path+'/';
};

export default defineConfig(({ mode }) => {
  const env=loadEnv(mode,process.cwd(),'');
  return {
    plugins: [react(),{name:'exclude-legacy-v395-from-public-build',closeBundle(){
      // Historical V39.5 is a local visual reference, never publish its bundled JS.
      rmSync(resolve(process.cwd(),'dist','v395'),{recursive:true,force:true});
    }}],
    // Root on Render staging and a subpath on retailmediacenter.com use the same build.
    base: normalizedBase(env.VITE_BASE_PATH),
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': 'http://127.0.0.1:3000', '/legacy': 'http://127.0.0.1:3000' }
    }
  };
});
