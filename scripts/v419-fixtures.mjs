import fs from 'node:fs';
import path from 'node:path';
import {buildSitePayload} from '../server/src/site.js';
import {renderHtml} from '../server/src/render-site.js';
const directory=process.argv[2]||'/mnt/data/v419_browser';fs.mkdirSync(directory,{recursive:true});
const cases={
 'shop-modern':{businessId:'butcher-shop',businessName:'Mesara Beograd',goal:'purchase',style:'modern',answers:{butcherGrillService:'grilled'}},
 'shop-traditional':{businessId:'butcher-shop',businessName:'Mesara Beograd',goal:'purchase',style:'traditional',answers:{butcherGrillService:'grilled'}},
 'shop-warm':{businessId:'butcher-shop',businessName:'Mesara Beograd',goal:'purchase',style:'warm',answers:{butcherGrillService:'grilled'}},
 'shop-tech':{businessId:'butcher-shop',businessName:'Mesara Beograd',goal:'purchase',style:'tech',answers:{butcherGrillService:'grilled'}},
 'shop-premium':{businessId:'butcher-shop',businessName:'Mesara Beograd',goal:'purchase',style:'premium',answers:{butcherGrillService:'grilled'}},
 'service':{businessId:'hair-salon',businessName:'Salon',goal:'visit',style:'warm',answers:{acceptsTimeRequests:true}},
 'service-auto':{businessId:'auto-service',businessName:'Auto servis',goal:'visit',style:'modern',answers:{acceptsTimeRequests:true}},
 'vertical':{businessId:'real-estate',businessName:'Agencija',goal:'visit',style:'tech',answers:{verticalEnabled:true}},
 'pharmacy':{businessId:'pharmacy',businessName:'Apoteka',goal:'visit',style:'premium',answers:{businessMode:'Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana',pharmacyConsultations:true}},
 'hybrid':{businessId:'auto-parts',businessName:'Auto delovi',goal:'purchase',style:'traditional',answers:{ordersEnabled:true,hybridChoice:'vehicle-sales'}}
};
for(const [name,inp] of Object.entries(cases))fs.writeFileSync(path.join(directory,name+'.html'),renderHtml(buildSitePayload(inp)));
console.log(Object.keys(cases).join(','));
