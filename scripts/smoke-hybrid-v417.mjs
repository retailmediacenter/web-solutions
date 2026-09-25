// Post-restart HTTP smoke: confirms the REAL running Node API rather than old in-memory V41.6.
const base='http://127.0.0.1:3000';
async function call(url,opts){const r=await fetch(base+url,opts);const json=await r.json();if(!r.ok)throw new Error(json.error||url+' returned '+r.status);return json;}
try {
 const health=await call('/api/health');
 if(health.stage!=='v41.7.1-vehicle-inventory-terminology')throw new Error('Stari Node server! Trenutni stage: '+health.stage+'. Zatvorite prethodne CMD servere.');
 if(health.registryEntries!==72)throw new Error('Business Registry nije učitan (72).');
 const d=await call('/api/advisor/questions/auto-parts');
 if(!d.hybrid?.options?.some(x=>x.id==='vehicle-sales'))throw new Error('Nema Hybrid Advisor pitanja za auto-delove.');
 const fixtures=[
 {businessId:'plumbing-supplies',businessName:'Test Vodooprema',style:'modern',goal:'purchase',answers:{hybridChoice:'plumber'}},
 {businessId:'auto-parts',businessName:'Test Automobili',style:'modern',goal:'purchase',answers:{hybridChoice:'vehicle-sales',ordersEnabled:true}},
 {businessId:'hair-salon',businessName:'Test Frizer',style:'modern',goal:'purchase',answers:{hybridChoice:'hair-cosmetics',acceptsTimeRequests:true}}
 ];
 for(const body of fixtures){
  const p=await call('/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!p.previewHtml.includes('id="hybridForm"')||!p.siteConfig.modules.some(x=>x.startsWith('hybrid-')))
   throw new Error('Hibrid nije generisan: '+body.businessId);
  console.log('PASS',body.businessId,body.answers.hybridChoice);
 }
 console.log('PASS V41.7 running API; registry 72; 3 real Hybrid HTTP fixtures.');
}catch(e){console.error('FAIL',e.message);process.exitCode=1;}
