// System-level pharmacy section added to BOTH preview and ZIP HTML.
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
export function addPharmacyConsultToHtml(html,site){
 if(site.business.id!=='pharmacy')return html;
 // Even a catalog-only pharmacy uses the standard Commerce product inquiry modal.
 if(!site.capabilities.pharmacyConsultations)return html;
 const section=`<section class="site-section pharmacy-consult" id="savetovanje">
  <div class="kicker">OPŠTE INFORMACIJE</div><h2>Savetovanje o proizvodima</h2>
  <p>Apoteka pruža opšte informacije o asortimanu. Ne unosite simptome, dijagnoze, terapiju ili medicinsku dokumentaciju.</p>
  <form id="pharmacyConsultForm" class="pharmacy-consult-form">
   <label>Tema upita<select name="topic" required><option value="" selected disabled>Izaberite temu</option>
    <option>Informacije o proizvodima za negu</option><option>Informacije o dodacima ishrani</option><option>Informacije o asortimanu i dostupnosti</option><option>Dogovor za razgovor sa farmaceutom</option></select></label>
   <label>Način kontakta<select name="method" required><option>Telefonski razgovor</option><option>Poseta apoteci</option></select></label>
   <label>Ime<input name="name" autocomplete="name" maxlength="90" required></label>
   <label>Telefon<input type="tel" name="phone" autocomplete="tel" maxlength="35" required></label>
   <button type="submit" class="primary pharmacy-wide">Pripremi zahtev za savetovanje</button>
  </form><p class="hint">Zahtev ne potvrđuje savetovanje ili termin. Za hitna zdravstvena pitanja obratite se zdravstvenom radniku.</p>
 </section>`;
 const dialog=`<dialog id="pharmacyConsultDialog" class="site-dialog pharmacy-consult-dialog" aria-label="Pripremljen zahtev za savetovanje">
 <button type="button" class="dialog-close" id="pharmacyConsultClose" aria-label="Zatvori">×</button>
 <div class="dialog-pad"><div class="kicker">SAVETOVANJE</div><h2>Zahtev je pripremljen</h2>
 <p>Nije automatski poslat. Izaberite način slanja.</p><pre id="pharmacyConsultMessage"></pre>
 <div class="dialog-actions"><button class="primary" type="button" id="pharmacyConsultCopy">Kopiraj zahtev</button>
 <a class="secondary" id="pharmacyConsultViber" target="_blank" rel="noopener noreferrer">Viber</a>
 <a class="secondary" id="pharmacyConsultWA" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>
 <p class="hint" id="pharmacyConsultNotice" role="status">Za slanje celog zahteva po potrebi koristite kopiranje.</p></div></dialog>`;
 const cfg={businessName:site.business.name,phone:site.contact?.phone||''};
 let result=html.replace('<a href="#kontakt">Kontakt</a>', '<a href="#savetovanje">Savetovanje</a><a href="#kontakt">Kontakt</a>');
 result=result.replace('<section class="site-section contact" id="kontakt">',section+'<section class="site-section contact" id="kontakt">');
 result=result.replace('<footer class="site-footer">',dialog+'<footer class="site-footer">');
 result=result.replace('</head>','<link rel="stylesheet" href="pharmacy-consult.css"></head>');
 result=result.replace('</body>','<script type="application/json" id="pharmacyConsultData">'+json(cfg)+'</script><script defer src="pharmacy-consult-runtime.js"></script></body>');
 return result;
}
