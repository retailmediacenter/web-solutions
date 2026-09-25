/* V41.4 standalone browser runtime. Contains ONLY generated-site interactions.
   No Advisor, Business Registry or site generator code is sent to visitors. */
(()=>{
  'use strict';
  const data=document.getElementById('siteData');
  if(!data) return;
  let site,catalog;
  try { ({siteConfig:site,catalog}=JSON.parse(data.textContent)); } catch {return;}
  const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('sr-RS',{maximumFractionDigits:0}).format(n)+' RSD';
  const products=new Map(catalog.products.map(p=>[p.id,p]));
  let chosen=null,cart=[],orderSelection=[],orderIntent='purchase',prepared='',bookingPrepared='';
  const minQty=p=>p?.unit==='kg'?.5:1;
  const stepQty=p=>p?.step||1;
  const roundQty=n=>Math.round(n*100)/100;
  const cleanQty=(p,value)=>{
    const step=stepQty(p),min=minQty(p),n=Number(value);
    if(!Number.isFinite(n))return min;
    const fixed=Math.round(Math.max(min,Math.min(99,n))/step)*step;
    return roundQty(Math.max(min,Math.min(99,fixed)));
  };
  const formatQty=(n,p)=>`${new Intl.NumberFormat('sr-RS',{maximumFractionDigits:2}).format(n)} ${p.unit==='kg'?'kg':p.unit==='par'?'par':'kom'}`;
  const escapeHtml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const variantText=line=>[line.preparation,line.size&&`Broj ${line.size}`,line.variant].filter(Boolean).join(' · ');
  const getLine=()=>{
    if(!chosen)return null;
    const qty=cleanQty(chosen,$('qtyInput').value),prep=$('prepWrap').hidden?'':$('preparation').value,size=$('sizeWrap').hidden?'':$('shoeSize').value;
    const variant=$('variantWrap').hidden?'':$('variantInput').value.trim().slice(0,110);
    const key=[chosen.id,prep,size,variant].join('|');
    return {key,id:chosen.id,title:chosen.title,image:chosen.image,price:chosen.price,unit:chosen.unit,step:chosen.step,qty,preparation:prep,size,variant};
  };
  const total=lines=>roundQty(lines.reduce((sum,l)=>sum+l.qty*l.price,0));
  const plural=n=>n===1?'artikal':n>=2&&n<=4?'artikla':'artikala';
  const dialogs=[...document.querySelectorAll('dialog.site-dialog')];
  function show(dialog){for(const d of dialogs)if(d.open)d.close();dialog.showModal();}
  function updateSubtotal(){
    if(!chosen)return;
    const n=cleanQty(chosen,$('qtyInput').value);
    $('qtyInput').value=n;
    $('detailSubtotal').textContent=(site.capabilities.commerce?'Ukupno: ':'Informativno: ')+money(roundQty(n*chosen.price));
  }
  function openProduct(id){
    const p=products.get(id);if(!p)return;
    chosen=p;
    $('detailImage').src=p.image;$('detailImage').alt=p.title;
    $('detailCategory').textContent=p.category;
    $('detailName').textContent=p.title;
    $('detailPrice').textContent=money(p.price)+(p.unit==='kg'?'/kg':'');
    $('qtyInput').min=minQty(p);$('qtyInput').max=99;$('qtyInput').step=stepQty(p);$('qtyInput').value=1;
    $('prepWrap').hidden=!(site.capabilities.butcherGrillService && p.grillable);
    $('preparation').value='Sveže';
    $('sizeWrap').hidden=site.business.id!=='shoe-shop';$('shoeSize').value='41';
    $('variantWrap').hidden=!site.capabilities.variantNote;
    $('variantLabel').textContent=site.capabilities.variantLabel||'Varijanta / napomena';
    $('variantInput').value='';
    $('variantInput').required=!!site.capabilities.requireVehicle;
    $('variantInput').placeholder=site.capabilities.requireVehicle?'Obavezno: marka, model i godište vozila':'Unesite željenu varijantu';
    updateSubtotal();show($('productDialog'));
  }
  function checkedLine(){
    const variant=$('variantInput');
    if(site.capabilities.requireVehicle && !variant.value.trim()){
      variant.setCustomValidity('Unesite marku, model i godište vozila radi provere kompatibilnosti.');
      variant.reportValidity();
      variant.focus();
      return null;
    }
    variant.setCustomValidity('');
    return getLine();
  }
  $('variantInput').addEventListener('input',()=>$('variantInput').setCustomValidity(''));
  function addLine(line){
    if(!line)return;
    const old=cart.find(x=>x.key===line.key);
    if(old)old.qty=roundQty(Math.min(99,old.qty+line.qty));
    else cart.push({...line});
    updateCart();
  }
  function updateCart(){
    const count=cart.reduce((n,l)=>n+(l.unit==='kg'?1:l.qty),0),t=total(cart),sticky=$('stickyCart');
    sticky.hidden=count===0;
    $('stickyCount').textContent=`${count} ${plural(count)}`;
    $('stickyTotal').textContent=money(t);
    $('cartTotal').textContent=money(t);
    $('orderFromCart').disabled=count===0;
    const box=$('cartLines');
    if(cart.length===0){box.innerHTML='<p>Korpa je prazna.</p>';return;}
    box.innerHTML=cart.map((l,i)=>{
      const q=formatQty(l.qty,l);
      return `<article class="cart-line"><img src="${escapeHtml(l.image)}" alt=""><div class="cart-copy"><strong>${escapeHtml(l.title)}</strong>
        ${variantText(l)?`<small>${escapeHtml(variantText(l))}</small>`:''}<small>Količina: ${escapeHtml(q)}</small>
        <span class="line-price">${l.qty===1?money(l.price):money(l.price)+' × '+escapeHtml(new Intl.NumberFormat('sr-RS',{maximumFractionDigits:2}).format(l.qty))+' · '+money(roundQty(l.price*l.qty))}</span>
        <div class="cart-quantity"><button type="button" data-cart-minus="${i}" aria-label="Smanji količinu">−</button><button type="button" data-cart-plus="${i}" aria-label="Povećaj količinu">+</button></div></div><button type="button" class="cart-remove" data-cart-remove="${i}">Ukloni</button></article>`;
    }).join('');
  }
  function order(lines,intent='purchase'){
    if(!lines?.length)return;
    orderSelection=structuredClone(lines);
    orderIntent=intent;
    $('orderKicker').textContent=intent==='inquiry'?'UPIT':'PORUDŽBINA';
    $('orderHeading').textContent=intent==='inquiry'?'Proverite dostupnost proizvoda':'Proverite i pošaljite zahtev';
    $('orderSubmit').textContent=intent==='inquiry'?'Pripremi upit':'Pripremi poruku';
    $('fulfillmentWrap').hidden=intent==='inquiry';
    $('orderForm').hidden=false;$('sharePanel').hidden=true;$('orderForm').reset();prepared='';
    show($('orderDialog'));
  }
  function messageFor(lines,info){
    const rows=lines.map(l=>{
      const details=variantText(l);
      return `• ${l.title} — ${formatQty(l.qty,l)}${details?' ('+details+')':''}: ${money(roundQty(l.qty*l.price))}`;
    });
    if(orderIntent==='inquiry'){
      return ['Pozdrav, želeo/la bih da proverim dostupnost:',...rows,
        `Informativna vrednost: ${money(total(lines))}`,
        `Ime: ${info.name}`,`Telefon: ${info.phone}`,
        info.note?`Napomena: ${info.note}`:'',
        'Molim vas da potvrdite dostupnost, stvarne cene i mogućnost preuzimanja.'].filter(Boolean).join('\n');
    }
    return ['Pozdrav, želeo/la bih da pošaljem zahtev za porudžbinu:',...rows,
      `Ukupno (demo): ${money(total(lines))}`,
      `Način: ${info.fulfillment}`,`Ime: ${info.name}`,`Telefon: ${info.phone}`,
      info.note?`Napomena: ${info.note}`:'',
      'Molim vas da potvrdite dostupnost, stvarne cene i preuzimanje.'].filter(Boolean).join('\n');
  }
  async function copyText(text,statusId){
    let copied=false;
    try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}} catch {}
    if(!copied){const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(t);t.focus();t.select();try{copied=document.execCommand('copy');}catch{}t.remove();}
    const out=$(statusId);if(out)out.textContent=copied?'Poruka je kopirana.':'Selektujte tekst poruke i kopirajte ručno.';
  }
  // Viber officially limits the URL-share payload to 200 characters. Never
  // silently treat that abbreviated text as the complete customer request:
  // the full request is always available via the separate Copy action.
  const viberUrl=text=>'viber://forward?text='+encodeURIComponent(text.includes('#rmb=')?text:(text.length<=190?text:text.slice(0,120)+'… (kopiraj ceo zahtev)'));
  function tryCopyBeforeViber(text,statusId){
    // Best effort; browser/iframe may restrict custom URL schemes or clipboard.
    // The normal "Kopiraj" button remains the guaranteed fallback.
    copyText(text,statusId);
  }
  function whatsappUrl(text){
    const phone=String(site.contact?.phone||'').replace(/\D/g,'');
    return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  }
  document.addEventListener('click',e=>{
    // Never allow a relative fragment inside an iframe srcDoc preview to navigate
    // to the parent React URL. Scroll this document's own window instead.
    const jump=e.target.closest('a[href^="#"]');
    if(jump){
      const hash=jump.getAttribute('href');
      const target=hash&&hash.length>1?document.getElementById(hash.slice(1)):null;
      if(target){
        e.preventDefault();
        const offset=(document.querySelector('.site-header')?.offsetHeight||0)+14;
        const top=window.scrollY+target.getBoundingClientRect().top-offset;
        window.scrollTo({top:Math.max(0,top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
        return;
      }
    }
    const productButton=e.target.closest('[data-product]');
    if(productButton){openProduct(productButton.dataset.product);return;}
    if(e.target.closest('[data-close]')){e.target.closest('dialog')?.close();return;}
    if(e.target.closest('#qtyMinus') && chosen){$('qtyInput').value=roundQty(Math.max(minQty(chosen),Number($('qtyInput').value)-stepQty(chosen)));updateSubtotal();return;}
    if(e.target.closest('#qtyPlus') && chosen){$('qtyInput').value=roundQty(Math.min(99,Number($('qtyInput').value)+stepQty(chosen)));updateSubtotal();return;}
    if(e.target.closest('#addToCart')){const line=checkedLine();if(!line)return;addLine(line);$('productDialog').close();return;}
    if(e.target.closest('#buyNow')){const line=checkedLine();if(!line)return;addLine(line);order([line]);return;}
    if(e.target.closest('#availabilityInquiry')){const line=checkedLine();if(line)order([line],'inquiry');return;}
    if(e.target.closest('#stickyCart')){updateCart();show($('cartDialog'));return;}
    if(e.target.closest('[data-cart-remove]')){const i=Number(e.target.closest('[data-cart-remove]').dataset.cartRemove);if(i>=0&&i<cart.length)cart.splice(i,1);updateCart();return;}
    const minus=e.target.closest('[data-cart-minus]'),plus=e.target.closest('[data-cart-plus]');
    if(minus||plus){const i=Number((minus||plus).dataset.cartMinus??(minus||plus).dataset.cartPlus),line=cart[i];if(line){const next=roundQty(line.qty+(plus?stepQty(line):-stepQty(line)));if(next<minQty(line))cart.splice(i,1);else line.qty=next;updateCart();}return;}
    if(e.target.closest('#clearCart')){cart=[];updateCart();return;}
    if(e.target.closest('#orderFromCart')){order(cart);return;}
    if(e.target.closest('#copyMessage')){copyText(prepared,'copyStatus');return;}
    if(e.target.closest('#viberMessage')){tryCopyBeforeViber(prepared,'copyStatus');return;}
    if(e.target.closest('#copyBooking')){copyText(bookingPrepared);$('copyBooking').textContent='Kopirano ✓';return;}
    if(e.target.closest('#wineBookingRetry')){$('tastingForm')?.requestSubmit();return;}
    if(e.target.closest('#viberBooking')){tryCopyBeforeViber(bookingPrepared);return;}
    const filter=e.target.closest('[data-filter]');if(filter){document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('is-active',x===filter);x.setAttribute('aria-pressed',x===filter?'true':'false');});applyFilter();}
  });
  $('qtyInput').addEventListener('change',updateSubtotal);
  function applyFilter(){
    const query=$('catalogSearch').value.toLocaleLowerCase('sr').trim(),cat=document.querySelector('[data-filter].is-active')?.dataset.filter||'Sve';let count=0;
    document.querySelectorAll('#catalogGrid [data-card]').forEach(card=>{const show=(cat==='Sve'||card.dataset.category===cat)&&card.dataset.search.includes(query);card.hidden=!show;count+=Number(show);});
    $('catalogCount').textContent=`Prikazano: ${count}`;
  }
  $('catalogSearch').addEventListener('input',applyFilter);
  $('orderForm').addEventListener('submit',e=>{
    e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
    const info=Object.fromEntries(new FormData(form).entries());
    prepared=messageFor(orderSelection,info);
    $('orderMessage').textContent=prepared;$('waMessage').href=whatsappUrl(prepared);$('viberMessage').href=viberUrl(prepared);
    form.hidden=true;$('sharePanel').hidden=false;
  });
  const tastingForm=$('tastingForm');
  if(tastingForm){
    const today=new Date(),local=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
    tastingForm.elements.date.min=local;
    tastingForm.addEventListener('submit',async e=>{
      e.preventDefault();if(!tastingForm.reportValidity())return;
      const info=Object.fromEntries(new FormData(tastingForm).entries());
      if(info.date<local){tastingForm.elements.date.setCustomValidity('Izaberite današnji ili budući datum.');tastingForm.reportValidity();return;}
      tastingForm.elements.date.setCustomValidity('');
      bookingPrepared=['Pozdrav, želim da pošaljem zahtev za degustaciju vina:',
        `Vrsta: ${info.experience}`,`Datum: ${info.date}`,`Željeno vreme: ${info.time}`,`Broj osoba: ${info.partySize}`,
        `Ime: ${info.name}`,`Telefon: ${info.phone}`,info.note?`Napomena: ${info.note}`:'',
        'Molim vas da potvrdite da li je termin dostupan.'].filter(Boolean).join('\n');
      if(site.bookingTransport&&site.booking?.enabled){
        const dialog=$('bookingDialog'),sending=$('wineBookingSending'),success=$('wineBookingSuccess'),failed=$('wineBookingError');
        const state=name=>{sending.hidden=name!=='sending';success.hidden=name!=='success';failed.hidden=name!=='error';show(dialog);};
        const services=Array.isArray(site.booking.services)?site.booking.services:[];
        const serviceId=services.find(item=>item.name===info.experience)?.id||'';
        const fingerprint=JSON.stringify({serviceId,date:info.date,time:info.time,name:info.name,phone:info.phone,partySize:info.partySize,note:info.note});
        const retry=window.__rmcWineBookingRetry&&window.__rmcWineBookingRetry.fingerprint===fingerprint?window.__rmcWineBookingRetry:{fingerprint,requestId:crypto.randomUUID()};window.__rmcWineBookingRetry=retry;
        state('sending');
        try{
          if(!window.RMCBookingSubmit)throw new Error('Nedostaje modul za slanje rezervacija.');
          const result=await window.RMCBookingSubmit.send(site.bookingTransport,{requestId:retry.requestId,clientName:info.name,phone:info.phone,serviceId,serviceName:info.experience,date:info.date,time:info.time,note:('Broj osoba: '+String(info.partySize||'1')+'; '+String(info.note||''))});
          $('wineReservationCode').textContent=result.reservationCode;state('success');return;
        }catch(err){$('wineBookingErrorText').textContent='Zahtev nije poslat. '+err.message;state('error');return;}
      }
      $('viberBooking').hidden=false;$('waBooking').hidden=false;
      if(site.bookingManager?.token){
        try{
          if(!window.RMCBookingLink)throw new Error('Modul za šifrovanje nije učitan.');
          const link=await window.RMCBookingLink.create({v:1,requestId:crypto.randomUUID(),clientName:info.name,phone:info.phone,serviceName:info.experience,date:info.date,time:info.time,units:1,notes:('Broj osoba: '+String(info.partySize||'1')+'; '+String(info.note||'')).slice(0,650)},site.bookingManager.token,site.bookingManager.url);
          bookingPrepared+='\n\nOTVORI REZERVACIJU U BOOKING MANAGERU:\n'+link;
        }catch(err){window.alert('Booking link nije pripremljen: '+err.message+'. Proverite HTTPS.');return;}
      }
      $('bookingMessage').textContent=bookingPrepared;$('waBooking').href=whatsappUrl(bookingPrepared);$('viberBooking').href=viberUrl(bookingPrepared);
      $('copyBooking').textContent='Kopiraj zahtev';show($('bookingDialog'));
    });
    tastingForm.elements.date.addEventListener('change',()=>tastingForm.elements.date.setCustomValidity(''));
  }
  // Native dialog backdrop clicks close only when the click is outside the content.
  for(const dialog of dialogs)dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  updateCart();
})();
