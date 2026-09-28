/* V46.3.4: compact EXACT_TIME reservation details. Visual-only adapter:
   all state transitions, calendar checks and communication remain in app.mjs. */
export function exactTimeDetailHtml({b,STATUS,safe,statName,scheduleText,formatDate,original,proposalChoices,shareActions}){
 const open=[STATUS.PENDING,STATUS.PROPOSED].includes(b.status);
 const code=b.reservationCode||'Starija rezervacija';
 const found=String(b.notes||'').match(/(?:^|[;\n])\s*(?:Broj osoba|Gosti)\s*:\s*(\d+)/i);
 const party=found?Number(found[1]):null;
 const notes=String(b.notes||'').replace(/(?:^|[;\n])\s*(?:Broj osoba|Gosti)\s*:\s*\d+\s*;?/i,'').trim().replace(/^;\s*/,'');
 const status=statName[b.status]||'';
 const proposal=b.status===STATUS.PROPOSED&&b.proposal;
 const summary=b.status===STATUS.CONFIRMED
   ?'<div class="exact-state success">Termin je potvrđen i upisan u lokalni kalendar.</div>'
   :[STATUS.DECLINED,STATUS.CANCELLED].includes(b.status)
   ?'<div class="exact-state warning">Zahtev je zatvoren.</div>'
   :`<div class="exact-state ${original.ok?'success':'warning'}">${original.ok?'Traženi termin je trenutno slobodan.':safe(original.reason||'Traženi termin nije slobodan.')+' Ponudi drugi termin.'}</div>`;
 return `<div class="dialog-head exact-head"><div>
     <h2>${safe(code)}</h2><div class="exact-customer">${safe(b.clientName)}</div>
     <span class="tag ${safe(b.status)}">${safe(status)}</span>
   </div><button class="close" data-action="close-dialog" aria-label="Zatvori">×</button></div>
   <div class="dialog-body exact-body">
     <section class="exact-key-fields" aria-label="Podaci o rezervaciji">
       <div class="exact-field"><small>USLUGA</small><strong>${safe(b.serviceName)}</strong></div>
       <div class="exact-field exact-time"><small>TRAŽENI TERMIN</small><strong>${safe(scheduleText(b))}</strong></div>
       ${party!==null?`<div class="exact-field exact-party"><small>BROJ OSOBA</small><strong>${safe(party)}</strong></div>`:''}
     </section>
     ${summary}
     ${proposal?`<div class="exact-current-proposal"><small>POSLATI PREDLOG</small><strong>${safe(formatDate(b.proposal.date))} u ${safe(b.proposal.time)}</strong></div>`:''}
     ${open?`<section id="exact-proposal-editor" class="proposal-box exact-proposal" hidden>
       <h3>Izaberi drugi termin</h3><div class="proposal-pills">${proposalChoices}</div>
       <p id="proposal-feedback" class="feedback" aria-live="polite"></p>
       <button type="button" class="btn btn-primary exact-save-proposal" data-action="save-proposal" disabled>Sačuvaj predlog</button>
     </section>`:''}
     ${notes?`<div class="exact-note"><small>NAPOMENA</small><p>${safe(notes)}</p></div>`:''}
     <details class="exact-extra"><summary>Kontakt i dodatni podaci</summary>
       <div><small>Telefon</small><strong>${safe(b.phone||'Nije unet')}</strong></div>
       <div><small>Trajanje / resursi</small><strong>${safe(b.duration)} min / ${safe(b.units)}</strong></div>
     </details>
     ${shareActions(b,{compact:true})}
   </div>
   <div class="dialog-actions exact-actions"><div class="detail-actions">
      ${open?`<button class="btn btn-primary" data-action="confirm-booking" ${!original.ok?'disabled':''}>Potvrdi termin</button>
        <button class="btn btn-soft" data-action="open-exact-proposal">Predloži drugi termin</button>`:''}
      ${proposal?'<button class="btn btn-light" data-action="confirm-proposal">Potvrdi predlog</button>':''}
      ${b.status===STATUS.CONFIRMED?'<button class="btn btn-light" data-action="ics">Dodaj u kalendar</button>':''}
      ${b.status===STATUS.PENDING?'<button class="btn btn-danger" data-action="decline-booking">Odbij</button>':''}
      ${b.status===STATUS.CONFIRMED||b.status===STATUS.PROPOSED?'<button class="btn btn-danger" data-action="cancel-booking">Otkaži</button>':''}
   </div></div>`;
}
