/* V43.2: pure browser crypto, independent of React and third-party services. */
(()=>{'use strict';
const E=new TextEncoder();
const fromB64=x=>{if(!/^[a-zA-Z0-9_-]{1,1400}$/.test(x))throw new Error('Neispravan kod za povezivanje.');return Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));};
const b64=buf=>{let s='';for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
function parse(token){if(typeof token!=='string'||!token.startsWith('RMCB1.')||token.length>2000)throw new Error('Neispravan kod povezivanja.');
 const o=JSON.parse(new TextDecoder().decode(fromB64(token.slice(6))));
 if(o?.v!==1||typeof o.p!=='string'||o.p.length>100||!o.p||typeof o.k!=='string'||o.k.length>750)throw new Error('Neispravan kod povezivanja.');return o;
}
async function create(payload,token,managerUrl){
 // Sandboxed iframe srcDoc preview intentionally has opaque origin and may lose
 // SubtleCrypto. The trusted localhost React parent performs encryption instead;
 // NEVER relax iframe sandbox via allow-same-origin.
 if(!globalThis.crypto?.subtle||!globalThis.isSecureContext){
  if(window.parent===window)throw new Error('Za šifrovani link potreban je HTTPS ili localhost.');
  const nonce=Date.now()+'-'+Math.random().toString(36).slice(2);
  return await new Promise((resolve,reject)=>{
   let done=false;
   const cleanup=()=>{done=true;clearTimeout(timer);window.removeEventListener('message',handle);};
   const handle=e=>{const r=e.data;
    if(e.source!==window.parent||r?.type!=='RMC_PREVIEW_CRYPTO_REPLY'||r.nonce!==nonce||done)return;
    cleanup();if(r.error)reject(new Error(String(r.error).slice(0,180)));else if(typeof r.link==='string'&&r.link.startsWith('https://'))resolve(r.link);else reject(new Error('Neispravan odgovor iz pregleda.'));
   };
   const timer=setTimeout(()=>{cleanup();reject(new Error('Pregled nije generisao link. Preuzmi sajt i testiraj lokalno.'));},10000);
   window.addEventListener('message',handle);
   window.parent.postMessage({type:'RMC_PREVIEW_CRYPTO_REQUEST',nonce,payload,token,managerUrl},'*');
  });
 }

 const {p,k}=parse(token),pub=await crypto.subtle.importKey('spki',fromB64(k),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=E.encode(JSON.stringify(payload));if(bytes.length>2200)throw new Error('Zahtev je predugačak.');
 const ek=await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,await crypto.subtle.exportKey('raw',key));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
 const packed={p,ek:b64(ek),iv:b64(iv),ct:b64(ct)};
 const link=new URL(managerUrl);if(link.protocol!=='https:')throw new Error('Manager mora imati HTTPS adresu.');
 link.hash='rmb=B1.'+b64(E.encode(JSON.stringify(packed)));return link.href;
}
window.RMCBookingLink={create};
})();
