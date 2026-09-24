import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappRecipient,hasWhatsAppRecipient,whatsappUrl,viberUrl} from '../messaging.mjs';
test('Srpski lokalni mobilni broj dopunjava pozivni',()=>{
 assert.equal(whatsappRecipient('064 123 4567'),'381641234567');
 assert.equal(whatsappRecipient('06 1 234 5678'),'381612345678');
});
test('Medjunarodni brojevi prolaze',()=>{
 assert.equal(whatsappRecipient('+381 64 123-4567'),'381641234567');
 assert.equal(whatsappRecipient('00381 64 1234567'),'381641234567');
 assert.equal(whatsappRecipient('+49 151 12345678'),'4915112345678');
});
test('Nepotpuni, prazni i sumnjivi brojevi ne usmeravaju ka nepoznatom primaocu',()=>{
 for(const x of ['', '09876543','064','064abc12345', '+381', '+123<script>']){
  assert.equal(whatsappRecipient(x),'',x);
  assert.equal(hasWhatsAppRecipient(x),false);
 }
});
test('WhatsApp link kodira poruku i bira primaoca kada je broj validan',()=>{
 const txt='POTVRDA REZERVACIJE\nŠišanje & feniranje';
 assert.equal(whatsappUrl('0641234567',txt),`https://wa.me/381641234567?text=${encodeURIComponent(txt)}`);
 assert.equal(whatsappUrl('',txt),`https://wa.me/?text=${encodeURIComponent(txt)}`);
});
test('Viber deep link ispravno kodira unicode i prelom',()=>{
 const txt='POTVRDA\nČetvrtak';
 assert.equal(viberUrl(txt),`viber://forward?text=${encodeURIComponent(txt)}`);
});
