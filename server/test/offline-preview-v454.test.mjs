import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addLocalPhonePreview,makeLocalPhonePreview} from '../src/offline-preview.js';

const photo='assets/images/curated/retail/shop/products/example_01.jpg';
const html=`<!doctype html><html><head><link rel="stylesheet" href="site.css"><style>.own{color:blue}</style></head><body><div style="background-image:url('${photo}')"><img src="${photo}"></div><script id="siteData" type="application/json">{"catalog":{"image":"${photo}"}}</script><script src="app.js" defer></script></body></html>`;
function fixture(){return [
  {name:'index.html',data:html},
  {name:'site.css',data:'.card{display:block}'},
  {name:'app.js',data:'window.rmcLocalTest=true;'},
  {name:photo,data:Buffer.from('A valid-looking test fixture; bytes are checked, not displayed.')}
];}

test('separate iPhone preview embeds CSS, JS and dynamic catalog photos without changing standard index',()=>{
  const before=fixture();
  const withPreview=addLocalPhonePreview(before);
  assert.equal(withPreview.length,before.length+1);
  assert.equal(withPreview[0],before[0]);
  assert.equal(withPreview[0].data,html);
  const offline=withPreview.at(-1);
  assert.equal(offline.name,'PREGLED_NA_TELEFONU.html');
  assert.match(offline.data,/<style data-rmc-original="site\.css">/);
  assert.match(offline.data,/<script data-rmc-original="app\.js">/);
  assert.match(offline.data,/data:image\/jpeg;base64,/);
  assert.equal((offline.data.match(/data:image\/jpeg;base64,/g)||[]).length,3);
  assert.doesNotMatch(offline.data,/<link\b[^>]+href="site\.css"/i);
  assert.doesNotMatch(offline.data,/<script\b[^>]+src="app\.js"/i);
  assert.doesNotMatch(offline.data,/assets\/images\/curated\//);
  assert.match(offline.data,/id="siteData"/);
});

test('missing local photo fails self-contained preview; hosting files stay unchanged',()=>{
  const incomplete=fixture().filter(file=>file.name!==photo);
  assert.throws(()=>makeLocalPhonePreview(incomplete),/offline fotografija/);
  assert.equal(addLocalPhonePreview(incomplete),incomplete);
});

test('large file-count exports remain publishable without adding a 71st file',()=>{
  const many=fixture();
  for(let i=0;i<66;i++)many.push({name:`unused-${i}.txt`,data:'test'});
  assert.equal(many.length,70);
  assert.equal(addLocalPhonePreview(many),many);
});
