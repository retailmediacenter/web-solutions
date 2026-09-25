// A second, isolated request flow for a hybrid's single secondary capability.
(()=>{'use strict';
const form=document.getElementById('hybridForm'),dialog=document.getElementById('hybridDialog');
if(!form||!dialog)return;
const conf=JSON.parse(document.getElementById('hybridData').textContent);
const labels={item:conf.kind==='service'?'Usluga':conf.kind==='vehicles'?'Vrsta vozila':'Proizvod',quantity:'Količina',vehicle:'Vozilo / marka i model',
 issue:'Opis zahteva',date:'Željeni datum',daypart:'Poželjno doba dana',budget:'Okvirni budžet',name:'Ime',phone:'Telefon',note:'Napomena'};
const fields=['item','quantity','vehicle','issue','date','daypart','budget','name','phone','note'];
const $=id=>document.getElementById(id);
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const date=form.elements.namedItem('date');if(date){date.min=localToday();}
const scrollToForm=()=>{const top=form.getBoundingClientRect().top+window.scrollY-95;window.scrollTo({top:Math.max(0,top),behavior:'smooth'});};

// Standalone V39.5-style vehicle inventory: same logic in React Preview and ZIP.
const vehicles=Array.isArray(conf.vehicles)?conf.vehicles:[];
const vehicleDialog=$('vehicleDetailDialog');
let selectedVehicle=null;
if(conf.kind==='vehicles'&&vehicles.length){
 const search=$('vehicleSearch'),category=$('vehicleCategory'),grid=$('vehicleInventory');
 const normalize=s=>String(s||'').toLocaleLowerCase('sr-RS');
 const update=()=>{let count=0;
  for(const card of grid.querySelectorAll('.vehicle-card')){
   const needle=normalize(search?.value),kind=category?.value||'';
   const found=vehicles.find(v=>card.querySelector('[data-vehicle-detail]')?.dataset.vehicleDetail===v.id);
   const show=!!found&&(!kind||found.category===kind)&&(!needle||normalize(found.title+' '+found.category+' '+found.description).includes(needle));
   card.hidden=!show;if(show)count++;
  }
  if($('vehicleCount'))$('vehicleCount').textContent='Prikazano: '+count+' primer vozila';
 };
 search?.addEventListener('input',update);category?.addEventListener('change',update);
 const captions={year:'Godište',mileage:'Kilometraža',fuel:'Gorivo',gearbox:'Menjač',power:'Snaga'};
 const openVehicle=id=>{
  const v=vehicles.find(x=>x.id===id);if(!v||!vehicleDialog)return;
  selectedVehicle=v;
  $('vehicleDetailPhoto').src=v.image;$('vehicleDetailPhoto').alt=v.title;
  $('vehicleDetailName').textContent=v.title;
  $('vehicleDetailPrice').textContent=v.priceLabel+' · ilustrativna cena';
  $('vehicleDetailDescription').textContent=v.description;
  const dl=$('vehicleDetailSpecs');dl.replaceChildren();
  for(const [key,label] of Object.entries(captions)){
   if(!v.fields?.[key])continue;
   const line=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=label;dd.textContent=v.fields[key];line.append(dt,dd);dl.append(line);
  }
  if(!vehicleDialog.open)vehicleDialog.showModal();
 };
 document.addEventListener('click',event=>{
  const el=event.target.closest('[data-vehicle-detail]');
  if(el){event.preventDefault();openVehicle(el.dataset.vehicleDetail);}
 });
 $('vehicleDetailClose')?.addEventListener('click',()=>vehicleDialog.close());
 vehicleDialog?.addEventListener('click',event=>{if(event.target===vehicleDialog)vehicleDialog.close();});
 $('vehicleRequest')?.addEventListener('click',()=>{
  if(!selectedVehicle)return;
  const item=form.elements.namedItem('item');item.value=selectedVehicle.title;
  const model=form.elements.namedItem('vehicle');if(model)model.value=selectedVehicle.title;
  vehicleDialog.close();scrollToForm();
 });
}

document.addEventListener('click',event=>{
 const a=event.target.closest('[data-hybrid-item]');if(!a)return;
 const option=form.elements.namedItem('item');const target=a.dataset.hybridItem;
 if(option && target){if(![...option.options].some(x=>x.value===target))option.add(new Option(target,target));option.value=target;}
 event.preventDefault();scrollToForm();
});
let message='';
const viberUrl=s=>'viber://forward?text='+encodeURIComponent(s.length<=190?s:s.slice(0,120).replace(/\s+\S*$/,'')+'… (kopirajte ceo zahtev)');
const whatsappUrl=s=>{const digits=String(conf.contact.phone||'').replace(/\D/g,'');return 'https://wa.me/'+digits+'?text='+encodeURIComponent(s);};
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const values=Object.fromEntries(new FormData(form).entries());
 if(values.date&&values.date<localToday()){date?.setCustomValidity('Datum ne može biti u prošlosti.');form.reportValidity();return;}
 if(date)date.setCustomValidity('');
 message=['Pozdrav, šaljem upit za '+conf.label+' firmi '+conf.business.name+':',
 ...fields.filter(k=>String(values[k]||'').trim()).map(k=>labels[k]+': '+String(values[k]).trim()),
 'Molim vas da potvrdite dostupnost i uslove.'].join('\n');
 $('hybridMessage').textContent=message;
 $('hybridViber').href=viberUrl(message);$('hybridWhatsapp').href=whatsappUrl(message);
 $('hybridNotice').textContent='Zahtev još nije poslat. Kopirajte celu poruku ili izaberite aplikaciju.';
 if(!dialog.open)dialog.showModal();
});
$('hybridClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
$('hybridCopy').addEventListener('click',async()=>{
 let ok=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);ok=true;}}catch{}
 if(!ok){const area=document.createElement('textarea');area.value=message;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();try{ok=document.execCommand('copy');}catch{}area.remove();}
 $('hybridNotice').textContent=ok?'Zahtev je kopiran.':'Kopiranje nije dostupno; označite tekst i kopirajte ručno.';
});
$('hybridViber').addEventListener('click',()=>{void navigator.clipboard?.writeText(message).catch(()=>{});});
})();
