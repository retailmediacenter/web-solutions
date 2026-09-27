// V44 B3: DAY_PART modal presentation. No side effects, no new booking transport.
export function dayPartDetailHtml({b,safe,formatDate,dayPartLabel,today,detailGrid,shareActions,STATUS}){
 const editable=b.status===STATUS.PENDING||b.status===STATUS.PROPOSED;
 const confirmed=b.status===STATUS.CONFIRMED;
 const title=editable?'Predloži termin':confirmed?'Potvrđena intervencija':'Detalji zahteva';
 const requestDate=b.requestedDate||b.date;
 const requestPart=b.requestedDayPart||b.dayPart;
 const chosenDate=b.proposal?.date||b.date;
 const dateValue=chosenDate<today()?today():chosenDate;
 return `<div class="dialog-head daypart-head"><div><div class="eyebrow">ZAHTEV ZA INTERVENCIJU</div><h2>${title}</h2></div><button class="close" data-action="close-dialog" aria-label="Zatvori">×</button></div>
 <div class="dialog-body daypart-body">
 <div class="daypart-request"><strong>${safe(b.clientName)}</strong><span>Klijent traži: ${safe(formatDate(requestDate))} · ${safe(dayPartLabel(requestPart))}</span></div>
 ${editable?`<section class="daypart-proposal" aria-label="Izbor datuma i vremena">
 <div class="daypart-proposal-fields"><label>Datum<input id="daypart-proposal-date" type="date" min="${safe(today())}" value="${safe(dateValue)}" required></label><label>Vreme<input id="daypart-proposal-time" type="time" step="900" value="${safe(b.proposal?.time||'')}" required></label></div>
 <p id="proposal-feedback" class="feedback bad" hidden role="status"></p><button type="button" class="btn btn-primary daypart-save" data-action="save-daypart-proposal">${b.proposal?'Izmeni predlog':'Sačuvaj predlog'}</button>
 ${b.proposal?`<p class="daypart-saved">Sačuvan predlog: ${safe(formatDate(b.proposal.date))} · ${safe(b.proposal.time)}</p>`:''}
 </section>`:confirmed?`<div class="daypart-confirmed"><strong>Potvrđeno</strong><span>${safe(formatDate(b.date))} · ${safe(b.time)}</span></div>`:''}
 <details class="daypart-extra"><summary>Detalji zahteva</summary>${detailGrid(b,{includeStatus:false})}</details>
 </div>
 ${shareActions(b,{compact:true})}
 <div class="dialog-actions daypart-actions">
 ${b.status===STATUS.PROPOSED&&b.proposal?'<button class="btn btn-light" data-action="confirm-proposal">Potvrdi prihvaćen termin</button>':''}
 ${b.status===STATUS.PENDING?'<button class="btn btn-danger" data-action="decline-booking">Odbij</button>':''}
 ${b.status===STATUS.PROPOSED||confirmed?'<button class="btn btn-danger" data-action="cancel-booking">Otkaži</button>':''}
 ${confirmed?'<button class="btn btn-light" data-action="ics">↓ Dodaj u kalendar</button>':''}
 </div>`;
}
