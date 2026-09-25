import test from 'node:test';
import assert from 'node:assert/strict';
import {listBusinesses,getAdvisorDefinition,resolvePilotSiteConfig,STYLES} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {hybridOptions} from '../src/hybrid-engine.js';
import retail from '../src/data/retail-catalog-v395.json' with {type:'json'};
import pilot from '../src/data/pilot-catalog-v395.json' with {type:'json'};
const catalogs=[...new Set([...Object.keys(pilot),...Object.keys(retail)])];
function request(id,{goal='purchase',orders,extra={}}={}){
 const d=getAdvisorDefinition(id),answers={
   businessMode:d.operation.options[0],emphasis:d.emphasis.options[0],
   ...(d.hybrid?{hybridChoice:'none'}:{})
 };
 for(const q of d.specials){
   if(q.id==='butcherGrillService')answers[q.id]='raw';
   else if(q.id==='ordersEnabled')answers[q.id]=orders??false;
   else answers[q.id]=false;
 }
 Object.assign(answers,extra);
 return {businessId:id,businessName:'Test '+id,goal,style:'modern',answers};
}

test('Advisor audit covers ALL 72 IDs; every business has valid, distinct, answerable questions',()=>{
 const businesses=listBusinesses();assert.equal(businesses.length,72);
 const ids=new Set(businesses.map(b=>b.id));assert.equal(ids.size,72);
 for(const {id} of businesses){
   const d=getAdvisorDefinition(id);
   for(const [stage,question] of [['operation',d.operation],['emphasis',d.emphasis],...d.specials.map(s=>['special:'+s.id,s])]){
     assert.ok(question?.question && question.options?.length>=2,`${id}: missing ${stage}`);
     const codes=question.options.map(x=>typeof x==='string'?x:x.id);
     assert.equal(new Set(codes).size,codes.length,`${id}: duplicate choice ${stage}`);
   }
   assert.equal(new Set(d.specials.map(q=>q.id)).size,d.specials.length,`${id}: duplicate special questions`);
   assert.ok(d.styles.length===5,id);
   assert.equal(d.hybrid?.options?.[0]?.id,hybridOptions(id).length?'none':undefined,`${id}: hybrid guard`);
 }
});

test('All 17 priced retail profiles explicitly ask for order capability, independently of marketing goal',()=>{
 assert.equal(catalogs.length,17);
 for(const id of catalogs){
  const d=getAdvisorDefinition(id);
  assert.ok(d.specials.some(q=>q.id==='ordersEnabled'),`${id}: missing order question`);
  for(const goal of ['purchase','visit','catalog'])for(const yes of [false,true]){
    const site=buildSitePayload(request(id,{goal,orders:yes}));
    assert.equal(site.siteConfig.capabilities.commerce,yes,`${id}/${goal}/${yes}`);
    assert.equal(site.siteConfig.modules.includes('cart'),yes,`${id}/${goal}/${yes}: modules`);
    const html=renderHtml(site);
    assert.equal(html.includes('id="addToCart"'),yes,`${id}/${goal}/${yes}: action`);
    assert.equal(html.includes('id="stickyCart"'),true,`${id}: same desktop/mobile HTML`);
    assert.ok(site.catalog.products.every(p=>p.price>0&&p.image),`${id}: priced image data`);
  }
 }
});

test('Butcher supports independent order × meat preparation × goal; Wine supports independent order × tastings',()=>{
 for(const goal of ['purchase','visit','catalog'])for(const order of [true,false])for(const preparation of ['raw','grilled']){
  const p=buildSitePayload(request('butcher-shop',{goal,orders:order,extra:{butcherGrillService:preparation}}));
  assert.equal(p.siteConfig.capabilities.commerce,order);
  assert.equal(p.siteConfig.capabilities.butcherGrillService,preparation==='grilled');
 }
 for(const order of [true,false])for(const tasting of [true,false]){
  const p=buildSitePayload(request('wine-shop',{goal:'visit',orders:order,extra:{wineTastings:tasting}}));
  assert.equal(p.siteConfig.modules.includes('cart'),order);
  assert.equal(p.siteConfig.modules.includes('wine-tasting'),tasting);
 }
});

test('Legacy API operation intent still honors explicit retail online vs in-store answers when new question is omitted',()=>{
 for(const [id,online,shop] of [
   ['butcher-shop','Online poručivanje','Dolaze u mesaru'],
   ['wine-shop','Radnja + poručivanje','Prodaja u radnji'],
   ['shoe-shop','Online prodaja','Samo u radnji']
 ]){
  const extra=id==='butcher-shop'?{butcherGrillService:'raw'}:id==='wine-shop'?{wineTastings:false}:{};
  const yes=buildSitePayload({businessId:id,businessName:'Legacy test',goal:'visit',answers:{...extra,businessMode:online}});
  const no=buildSitePayload({businessId:id,businessName:'Legacy test',goal:'purchase',answers:{...extra,businessMode:shop}});
  assert.ok(yes.siteConfig.capabilities.commerce,`${id}: legacy online order`);
  assert.ok(!no.siteConfig.capabilities.commerce,`${id}: legacy in-store`);
 }
});

test('Business capability answers cannot be injected as a string or skipped for profiles that already demanded them',()=>{
 const base=request('phone-store',{orders:true});base.answers.ordersEnabled='yes';
 assert.throws(()=>buildSitePayload(base),/DA ili NE|Odgovorite/);
 for(const id of ['phone-store','grocery-store','auto-parts','bakery','pastry','fast-food','gift-shop']){
   const r=request(id);delete r.answers.ordersEnabled;
   assert.throws(()=>buildSitePayload(r),/Odgovorite/,id);
 }
});

test('72/72 end-to-end question coverage for both principal capability states and all marketing goals',()=>{
 const errors=[];
 for(const {id} of listBusinesses())for(const goal of ['purchase','visit','catalog'])for(const yes of [true,false]){
  try{
   const answers=request(id,{goal,orders:yes});
   const d=getAdvisorDefinition(id);for(const special of d.specials){
    if(special.id==='ordersEnabled')answers.answers.ordersEnabled=yes;
    else if(special.id==='butcherGrillService')answers.answers.butcherGrillService=yes?'grilled':'raw';
    else answers.answers[special.id]=yes;
   }
   const p=buildSitePayload(answers),html=renderHtml(p);
   assert.equal(p.siteConfig.business.id,id);
   assert.ok(html.includes('</html>')&&html.includes('global-modal.css'));
  }catch(e){errors.push(`${id} goal=${goal} yes=${yes}: ${e.message}`)}
 }
 assert.deepEqual(errors,[]);
});

test('Hybrid Advisor choices: ten allowed primary/secondary paths preserve independent primary capability',()=>{
 let count=0;
 for(const {id} of listBusinesses())for(const option of hybridOptions(id)){
  count++;
  const p=buildSitePayload(request(id,{orders:true,extra:{hybridChoice:option.id}}));
  assert.equal(p.siteConfig.capabilities.hybrid.secondaryId,option.id,id);
  assert.equal(p.siteConfig.capabilities.hybrid.kind,option.type,id);
  assert.ok(p.siteConfig.modules.includes('hybrid-'+option.type),id);
  assert.ok(p.secondary,`${id}/${option.id}: secondary payload missing`);
 }
 assert.equal(count,10);
});

test('React Advisor consumes server-provided special QUESTION LIST and sets goal labels by business class',async()=>{
 const fs=await import('node:fs');const source=fs.readFileSync(new URL('../../client/src/main.jsx',import.meta.url),'utf8');
 assert.ok(source.includes("definition.specials||"),'must not silently omit second question');
 assert.ok(source.includes("'special:'+q.id"),'dynamic special steps');
 assert.ok(source.includes('activeSpecial.options')&&source.includes("pick('special:'+activeSpecial.id"));
 for(const className of ['projectGoals','travelGoals','educationGoals','healthGoals'])assert.ok(source.includes(className),className);
});

test('Sports-shop without priced SKUs must ask about an inquiry, not claim an executable cart',()=>{
 const d=getAdvisorDefinition('sports-shop');
 assert.match(d.special.question,/upit/);
 const site=buildSitePayload(request('sports-shop',{extra:{verticalEnabled:true}}));
 assert.equal(site.siteConfig.modules.includes('cart'),false);
 const html=renderHtml(site);
 assert.ok(html.includes('Upit za opremu'));
 assert.ok(!html.includes('id="addToCart"'));
});
