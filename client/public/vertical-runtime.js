/* V41.8 sector-specific enquiry UX. Preview and standalone export use identical JS. */
(()=>{'use strict';
const tag=document.getElementById('verticalData');if(!tag)return;
let site;try{site=JSON.parse(tag.textContent)}catch{return;}
const form=document.getElementById('verticalForm'),dialog=document.getElementById('verticalDialog');if(!form||!dialog)return;
const $=id=>document.getElementById(id);
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
for(const el of form.querySelectorAll('input[type="date"]'))el.min=today();
for(const el of form.querySelectorAll('input[type="month"]'))el.min=today().slice(0,7);
function jump(node){if(!node)return;const header=document.querySelector('.site-header')?.offsetHeight||0;const top=window.scrollY+node.getBoundingClientRect().top-header-15;window.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href^="#"]');if(a){const n=document.getElementById(a.getAttribute('href').slice(1));if(n){e.preventDefault();
  const selection=a.dataset.verticalItem;const picker=form.elements.namedItem('item');if(selection&&picker&&[...picker.options].some(x=>x.value===selection))picker.value=selection;
  jump(n);return;
 }}
 if(e.target.closest('#verticalClose'))dialog.close();
 if(e.target.closest('#verticalCopy'))void copyMessage();
 if(e.target.closest('#verticalViber'))void copyMessage();
});
const search=$('verticalSearch');if(search)search.addEventListener('input',()=>{
 const q=search.value.toLocaleLowerCase('sr').trim();let visible=0;
 for(const card of document.querySelectorAll('.vertical-card')){const match=card.textContent.toLocaleLowerCase('sr').includes(q);card.hidden=!match;if(match)visible++;}
 if($('verticalShown'))$('verticalShown').textContent='Prikazano: '+visible;
});
let message='';async function copyMessage(){let ok=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);ok=true}}catch{}
 if(!ok){const t=document.createElement('textarea');t.value=message;t.style.position='fixed';t.style.left='-9999px';document.body.append(t);t.select();try{ok=document.execCommand('copy')}catch{}t.remove()}
 $('verticalNotice').textContent=ok?'Ceo zahtev je kopiran.':'Označite tekst zahteva i kopirajte ga ručno.';
}
function urlViber(s){return 'viber://forward?text='+encodeURIComponent(s.length<=190?s:s.slice(0,130).replace(/\s+\S*$/,'')+'… (nalepite kompletan kopirani zahtev)')}
function urlWA(s){const phone=String(site.contact?.phone||'').replace(/\D/g,'');return 'https://wa.me/'+phone+'?text='+encodeURIComponent(s)}
form.addEventListener('submit',e=>{
 e.preventDefault();if(!form.reportValidity())return;
 const values=Object.fromEntries(new FormData(form));
 const start=values.arrival,end=values.departure;
 const date=values.date;
 const setError=(el,txt)=>{el?.setCustomValidity(txt);el?.reportValidity()};
 if(start&&start<today()){setError(form.elements.namedItem('arrival'),'Odaberite današnji ili budući datum.');return}
 if(end&&start&&(end<start||(end===start&&site.kind!=='rental'))){setError(form.elements.namedItem('departure'),'Datum vraćanja/odlaska mora biti posle početnog datuma.');return}
 if(site.kind==='rental'&&start===end&&values.pickupTime&&values.returnTime&&values.returnTime<=values.pickupTime){setError(form.elements.namedItem('returnTime'),'Vreme povratka mora biti nakon preuzimanja.');return}
 if(date&&date<today()){setError(form.elements.namedItem('date'),'Odaberite budući datum.');return}
 for(const key of ['start','travelMonth']){if(values[key]&&values[key]<today().slice(0,7)){setError(form.elements.namedItem(key),'Odaberite tekući ili naredni mesec.');return}}
 for(const el of form.querySelectorAll('input[type="date"],input[type="time"]'))el.setCustomValidity('');
 // Never claim successful delivery; the user must select a communication channel.
 const keys=Object.keys(site.labels||{});
 const baseKeys=['item',...keys.filter(k=>!['item','name','phone','note'].includes(k)),'name','phone','note'];
 const labels={item:'Ponuda / oblast',name:'Ime',phone:'Telefon',note:'Napomena',...site.labels};
 message=['Pozdrav, šaljem '+(site.enabled?'zahtev':'informativni upit')+' za '+site.business.name+':',
  ...baseKeys.filter(k=>String(values[k]??'').trim()).map(k=>labels[k]+': '+values[k].trim()),
  'Molim vas za odgovor; ovaj upit nije potvrđena rezervacija, cena niti dostupnost.'].join('\n');
 $('verticalMessage').textContent=message;$('verticalViber').href=urlViber(message);$('verticalWhatsapp').href=urlWA(message);
 $('verticalNotice').textContent='Zahtev još nije poslat. Kopiranje i deljenje pokreće korisnik.';dialog.showModal();
});
for(const el of form.querySelectorAll('input[type="date"],input[type="time"],input[type="month"]'))el.addEventListener('change',()=>el.setCustomValidity(''));
})();
