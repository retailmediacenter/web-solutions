// Linkovi samo pripremaju poruku. Klik u eksternoj aplikaciji NE dokazuje slanje.
// Brojevi bez pozivnog se automatski dopunjuju samo za jasno prepoznatljive
// srpske mobilne formate 06xxxxxxxx; ostalo traži ručni izbor kontakta.
export function whatsappRecipient(phone){
  const raw=String(phone ?? '').trim().replace(/[\s().-]/g,'');
  if(!raw)return '';
  let dial=raw;
  if(/^06\d{7,8}$/.test(raw))dial='381'+raw.slice(1);
  else if(/^00381\d{8,9}$/.test(raw))dial=raw.slice(2);
  else if(/^\+\d{8,15}$/.test(raw))dial=raw.slice(1);
  else if(!/^[1-9]\d{7,14}$/.test(raw))return '';
  return /^[1-9]\d{7,14}$/.test(dial)?dial:'';
}
export const hasWhatsAppRecipient=phone=>Boolean(whatsappRecipient(phone));
export function whatsappUrl(phone,message){
  const number=whatsappRecipient(phone);
  const base=number?`https://wa.me/${number}`:'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
// Viber share protocol allows choosing a recipient; preselecting a phone with
// a pre-filled message isn't reliably supported across Viber platforms.
export function viberUrl(message){
  return `viber://forward?text=${encodeURIComponent(message)}`;
}
