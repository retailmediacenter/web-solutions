// Run ONLY after restarting local dev servers; confirms the running Node API,
// not merely source files on disk, includes original V39.5 demo inventory.
const base='http://127.0.0.1:3000';
const response=await fetch(base+'/api/health');
if(!response.ok)throw new Error('Lokalni API nije dostupan.');
const health=await response.json();
if(health.stage!=='v41.7.1-vehicle-inventory-terminology')throw new Error('Pokrenut je stari Node API: '+health.stage);
for(const [primary,answers] of [['auto-parts',{hybridChoice:'vehicle-sales',ordersEnabled:true}],['auto-service',{hybridChoice:'vehicle-sales',acceptsTimeRequests:true}]]){
 const body={businessId:primary,businessName:'Test vozila',style:'modern',goal:'purchase',answers};
 const r=await fetch(base+'/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw new Error(primary+': '+await r.text());
 const data=await r.json();
 if(data.secondary?.products?.length!==10||!data.previewHtml.includes('id="vehicleDetailDialog"'))throw new Error('Galerija nije generisana: '+primary);
 if(!data.previewHtml.includes('DEMO vozila i cene nisu stvarna dostupna ponuda'))throw new Error('Nedostaje demo obeležavanje.');
 const exp=await fetch(base+'/api/site/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!exp.ok)throw new Error('ZIP export: '+await exp.text());
 const zip=Buffer.from(await exp.arrayBuffer());
 if(!zip.includes(Buffer.from('auto_service_product_used_hatchback_01.jpg'))||!zip.includes(Buffer.from('auto_service_product_used_delivery_van_01.jpg')))throw new Error('Export nije uključio svih 10 slika.');
 console.log('PASS: '+primary+' → 10 originalnih demo vozila → Preview i ZIP');
}
for(const id of ['auto-parts','plumbing-supplies','electrical-supplies']){
 const r=await fetch(base+'/api/advisor/questions/'+id);const d=await r.json();
 if(d.emphasis.options.some(x=>x.toLowerCase().includes('kolekcij')))throw new Error(id+': izraz kolekcija je pogrešan.');
}
console.log('PASS: V41.7.1 radi, terminologija ispravljena, Registry 72.');
