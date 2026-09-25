/* Delivers only a prepared administrative inquiry — no patient health details. */
(()=>{'use strict';
const form=document.getElementById('pharmacyConsultForm'),dlg=document.getElementById('pharmacyConsultDialog');
if(!form||!dlg)return;
const $=id=>document.getElementById(id);
let cfg={};try{cfg=JSON.parse($('pharmacyConsultData').textContent)}catch{}
let message='';
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const v=Object.fromEntries(new FormData(form));
 message=['Pozdrav, molim opšte informacije/savetovanje u apoteci '+(cfg.businessName||'')+':',
  'Tema: '+v.topic,'Kontakt: '+v.method,'Ime: '+v.name,'Telefon: '+v.phone,
  'Molim vas da mi odgovorite o mogućnostima razgovora. Ne šaljem zdravstvene podatke.'].join('\n');
 $('pharmacyConsultMessage').textContent=message;
 const digits=String(cfg.phone||'').replace(/\D/g,'');
 $('pharmacyConsultWA').href='https://wa.me/'+digits+'?text='+encodeURIComponent(message);
 $('pharmacyConsultViber').href='viber://forward?text='+encodeURIComponent(message.length<=190?message:message.slice(0,130)+'… (kopirajte pun zahtev)');
 $('pharmacyConsultNotice').textContent='Zahtev još nije poslat. Kopirajte ga ili otvorite aplikaciju.';
 dlg.showModal();
});
$('pharmacyConsultClose').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
$('pharmacyConsultCopy').addEventListener('click',async()=>{
 let ok=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);ok=true}}catch{}
 if(!ok){const t=document.createElement('textarea');t.value=message;t.style.position='fixed';t.style.left='-9999px';document.body.append(t);t.select();try{ok=document.execCommand('copy')}catch{}t.remove()}
 $('pharmacyConsultNotice').textContent=ok?'Zahtev je kopiran.':'Označite poruku i kopirajte je ručno.';
});
})();
