// End-to-end check of the RUNNING local Node server, not just on-disk files.
// Run after restarting START_LOCAL_DEV.bat: node scripts/smoke-booking-v4152.mjs
const origin=process.env.RMC_API_ORIGIN||'http://127.0.0.1:3000';
const expected='v41.5.2-booking-card-fix';
const cases=[
  ['hair-salon','acceptsTimeRequests','Šišanje'],
  ['auto-service','acceptsTimeRequests','Servis kočnica'],
  ['consultant','acceptsTimeRequests','Poslovna analiza'],
  ['optician','eyeExamAppointments','Pregled vida']
];
const check=(ok,message)=>{if(!ok)throw new Error(message);};
try{
  const h=await fetch(origin+'/api/health',{cache:'no-store'});
  check(h.ok,'Local API unavailable: '+h.status);
  const health=await h.json();
  check(health.stage===expected,'OLD API STILL RUNNING (stage='+health.stage+'). Close old CMD windows, restart START_LOCAL_DEV.bat, reload Chrome.');
  for(const [id,key,title] of cases){
    const resp=await fetch(origin+'/api/site/generate',{
      method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},
      body:JSON.stringify({businessId:id,businessName:'V4152 Smoke Test',goal:'purchase',style:'modern',answers:{[key]:true}})
    });
    check(resp.ok,id+': generate returned '+resp.status);
    const result=await resp.json();
    const html=result.previewHtml||'';
    const expectedAttr='data-service="'+title.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"';
    check(html.includes(expectedAttr),id+': card click attribute does NOT contain real title');
    check(!html.includes('data-service="${'),id+': unresolved JS template still served');
    check(html.includes('<select name="service" required>'),id+': booking dropdown missing');
    console.log('PASS '+id+' => '+title);
  }
  console.log('PASS: correct V41.5.2 server is running; all 4 generated sites have real card link values.');
}catch(error){
  console.error('FAIL:',error.message);
  process.exitCode=1;
}
