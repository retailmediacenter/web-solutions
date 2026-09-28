/* V47.1 — browser-only demonstration. Not a test business, queue identity or owner account.
   Keep all records ephemeral: never call IndexedDB, Redis, Push or external messengers. */
import {makeProfile,normalizeRequest,dateKey,addDays,STATUS} from './booking-core.mjs';
import {ORDER_STATUS} from './order-core.mjs';

export const DEMO_QUERY='demo';
export function isDemoLocation(search=''){
 return new URLSearchParams(search).get(DEMO_QUERY)==='1';
}
export function buildPublicDemoState(now=new Date()){
 const p=makeProfile('Vinoteka Vino & Terroir — DEMO');
 p.id='rmc-demo-profile';
 p.capacity=8;
 p.services=[
   {id:'demo-tasting',name:'Degustacija vina',duration:60,units:1,siteServiceId:'demo-tasting'},
   {id:'demo-private',name:'Privatna degustacija',duration:90,units:1,siteServiceId:'demo-private'}
 ];
 p.siteProfile={business:{name:p.name,phone:'',email:'',address:''},
   services:p.services.map(s=>({serviceId:s.id,id:s.id,name:s.name,duration:s.duration,units:s.units})),
   commerce:{enabled:true,products:[
     {id:'demo-red',name:'Crveno vino — primer',price:1200},
     {id:'demo-white',name:'Belo vino — primer',price:890}
   ]}
 };
 const date=addDays(dateKey(now),1),week=addDays(date,1);
 const first=normalizeRequest({id:'demo-booking-1',serviceId:'demo-tasting',date,time:'12:00',clientName:'Primer kupca',phone:'',notes:'Demonstraciona rezervacija',units:1,source:'DEMO'},p);
 first.reservationCode='K7NP2Y4R';
 const second=normalizeRequest({id:'demo-booking-2',serviceId:'demo-private',date:week,time:'14:00',clientName:'Drugi primer',phone:'',units:1,source:'DEMO'},p);
 second.status=STATUS.CONFIRMED;second.reservationCode='J6RW3Y8T';
 const makeItem=(id,name,price,qty)=>({productId:id,name,unit:'kom',quantity:qty,unitPrice:price,lineTotal:price*qty,size:'',variant:'',preparation:'',image:''});
 const orders=[
   {id:'demo-order-1',profileId:p.id,orderCode:'J6RW3Y8T',type:'ORDER',status:ORDER_STATUS.NEW,
     clientName:'Primer kupca',phone:'',note:'Preuzimanje tokom popodneva',fulfillment:'PICKUP',
     items:[makeItem('demo-red','Crveno vino — primer',1200,2),makeItem('demo-white','Belo vino — primer',890,1)],
     total:3290,currency:'RSD',pricing:'indicative',createdAt:now.toISOString(),updatedAt:now.toISOString()},
   {id:'demo-order-2',profileId:p.id,orderCode:'P3TN6YW8',type:'ORDER',status:ORDER_STATUS.PREPARING,
     clientName:'Drugi primer',phone:'',note:'',fulfillment:'PICKUP',items:[makeItem('demo-white','Belo vino — primer',890,2)],
     total:1780,currency:'RSD',pricing:'indicative',createdAt:now.toISOString(),updatedAt:now.toISOString()}
 ];
 return {schema:1,activeProfileId:p.id,profiles:[p],bookings:[first,second],orders,savedAt:null};
}
