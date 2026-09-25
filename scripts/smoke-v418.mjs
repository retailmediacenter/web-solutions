// Run AFTER closing old Node processes and starting START_LOCAL_DEV.bat.
const base=process.env.RMC_API_URL||'http://127.0.0.1:3000';
const stage='v41.8.1-pharmacy-hybrid';
async function req(path,options){
  const r=await fetch(base+path,options);let data;try{data=await r.json()}catch{throw Error(`${path}: invalid JSON response`)}
  if(!r.ok)throw Error(`${path}: ${data.error||r.status}`);
  return data;
}
const health=await req('/api/health');
if(health.stage!==stage||health.registryEntries!==72)throw Error(`OLD SERVER: expected ${stage} and 72, got ${health.stage}/${health.registryEntries}. Close ALL old CMD windows, restart.`);
const basic=await req('/api/registry/basic');
if(basic.businesses.filter(x=>x.pilot).length!==72)throw Error('Registry is 72 but not all 72 scenarios are enabled');
for(const id of ['sports-shop','marketing-agency','real-estate','language-school','hotel','apartments','rent-a-car','clinic','pharmacy','vet']){
 const def=await req('/api/advisor/questions/'+id);
 if(def.special?.id!==(id==='pharmacy'?'pharmacyConsultations':'verticalEnabled'))throw Error(`${id}: V41.8 Advisor question not available`);
 const payload={businessId:id,businessName:'Test '+id,style:'modern',goal:'visit',description:'Test '+id,answers:id==='pharmacy'?{businessMode:'Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana',pharmacyConsultations:true}:{verticalEnabled:true}};
 const g=await req('/api/site/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(!(id==='pharmacy'?g.previewHtml.includes('pharmacy-consult-runtime.js'):g.previewHtml.includes('vertical-runtime.js'))||g.siteConfig.business.id!==id)throw Error(`${id}: new renderer is not active`);
}
console.log('PASS: V41.8 API stage, 72 scenarios, 10 sector-specific live Preview tests. Ready for manual QA.');
