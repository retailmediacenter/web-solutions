import {MODULE_LIBRARY} from './module-plan.js';

const ids=new Set(MODULE_LIBRARY.map(module=>module.id));
const unique=items=>[...new Set(items.filter(item=>ids.has(item)))];
const text=value=>String(value??'').toLocaleLowerCase('sr');

const base=['header','hero','featured','location','contact'];
const packageModules={
 publish:base,
 business:[...base,'booking'],
 commerce:[...base,'commerce-controller','catalog']
};

/**
 * Converts brief facts into a transparent recommendation. This is deliberately
 * deterministic: the OpenAI assessment may explain the suggestion, but it
 * never decides the commercial entitlement or changes the project by itself.
 */
export function recommendPackage({notes='',modulePlan=[],items=[]}={}){
 const brief=text(notes);
 const quantity=brief.match(/\b(\d{1,3})\s*(artik|proizvod|stavk)/)?.[1];
 const wantsOrders=/\b(pick\s*&?\s*collect|preuzimanje|narudžb|narudzb|poruč|poruc|korpa|katalog|artik)/.test(brief);
 const wantsBooking=/\b(rezervacij|zakaziv|termin|booking)/.test(brief);
 const wantsFaq=/\b(faq|česta pitanja|cesta pitanja|objasn)/.test(brief);
 const plan=wantsOrders||Number(quantity)>0?'commerce':wantsBooking?'business':'publish';
 const proposed=unique([...packageModules[plan],...(wantsFaq?['faq']:[])]);
 const current=unique(modulePlan);
 const added=proposed.filter(module=>!current.includes(module));
 const retained=current.filter(module=>proposed.includes(module));
 const reasons=[];
 if(Number(quantity)>0)reasons.push(`Brief navodi ${quantity} artikala.`);
 if(wantsOrders)reasons.push('Brief traži katalog ili naručivanje, što zahteva Commerce paket.');
 if(!wantsOrders&&wantsBooking)reasons.push('Brief traži rezervacije ili zakazivanje, što zahteva Business paket.');
 if(!reasons.length)reasons.push('Brief ne traži Portal funkcionalnosti; dovoljan je Publish paket.');
 if(wantsFaq)reasons.push('FAQ je predložen jer brief traži dodatno objašnjenje usluge.');
 return {recommendedPlan:plan,reasons,proposedModules:proposed,currentModules:current,retainedModules:retained,addedModules:added,locked:false};
}

export const packageModuleLibrary=MODULE_LIBRARY;
