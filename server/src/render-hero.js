// V48.1/V48.2 — shared Motion/Depth Hero presentation layer.
// One 2D hero photo becomes a cinematic pseudo-3D scene using camera motion,
// a feathered depth duplicate and CTA choreography. No industry-specific engine.
const MOTION_CSS=`<style id="ws-hero-3d-css">
html[data-style="3d"]{--accent:#625cff;--radius:18px}
html[data-style="3d"] .hero.ws-hero-3d{
 position:relative;isolation:isolate;overflow:hidden;background:#07101e!important;background-image:none!important;
 --ws-motion-duration:4.2s;--ws-base-end:1.14;--ws-depth-end:1.19;--ws-pan-x:0%;--ws-depth-pan-x:0%;
 --ws-focus-x:50%;--ws-focus-y:48%;
}
html[data-style="3d"] .hero.ws-hero-3d[data-duration="3"]{--ws-motion-duration:3.2s}
html[data-style="3d"] .hero.ws-hero-3d[data-duration="5"]{--ws-motion-duration:5.4s}
html[data-style="3d"] .hero.ws-hero-3d[data-intensity="subtle"]{--ws-base-end:1.08;--ws-depth-end:1.11}
html[data-style="3d"] .hero.ws-hero-3d[data-intensity="strong"]{--ws-base-end:1.20;--ws-depth-end:1.27}
html[data-style="3d"] .hero.ws-hero-3d[data-motion="zoom-left"]{--ws-pan-x:3.8%;--ws-depth-pan-x:6%;--ws-focus-x:34%}
html[data-style="3d"] .hero.ws-hero-3d[data-motion="zoom-right"]{--ws-pan-x:-3.8%;--ws-depth-pan-x:-6%;--ws-focus-x:66%}
html[data-style="3d"] .hero.ws-hero-3d[data-motion="focus-sweep"]{--ws-focus-x:58%}
.ws-motion-hero__media{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#07101e}
.ws-motion-hero__base,.ws-motion-hero__depth{position:absolute;inset:-5%;background-image:var(--hero-image);background-position:center;background-size:cover;will-change:transform}
.ws-motion-hero__base{transform:scale(1.02);animation:wsMotionCamera var(--ws-motion-duration) cubic-bezier(.2,.7,.18,1) both}
.ws-motion-hero__depth{
 opacity:.52;filter:saturate(1.08) contrast(1.06);
 -webkit-mask-image:radial-gradient(ellipse 46% 54% at var(--ws-focus-x) var(--ws-focus-y),#000 0 44%,rgba(0,0,0,.84) 58%,transparent 78%);
 mask-image:radial-gradient(ellipse 46% 54% at var(--ws-focus-x) var(--ws-focus-y),#000 0 44%,rgba(0,0,0,.84) 58%,transparent 78%);
 transform:scale(1.035);animation:wsMotionDepth var(--ws-motion-duration) cubic-bezier(.2,.7,.18,1) both;
}
html[data-style="3d"] .hero.ws-hero-3d[data-depth="off"] .ws-motion-hero__depth{display:none}
html[data-style="3d"] .hero.ws-hero-3d[data-depth="light"] .ws-motion-hero__depth{opacity:.28;filter:saturate(1.04) contrast(1.03)}
.ws-motion-hero__shade{position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,rgba(5,10,22,.76) 3%,rgba(6,11,23,.47) 47%,rgba(6,11,23,.22) 100%),linear-gradient(0deg,rgba(4,9,19,.28),transparent 52%)}
html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .ws-motion-hero__shade{background:linear-gradient(270deg,rgba(5,10,22,.76) 3%,rgba(6,11,23,.47) 47%,rgba(6,11,23,.22) 100%),linear-gradient(0deg,rgba(4,9,19,.28),transparent 52%)}
html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .ws-motion-hero__shade{background:linear-gradient(90deg,rgba(5,10,22,.42),rgba(5,10,22,.55),rgba(5,10,22,.42)),linear-gradient(0deg,rgba(4,9,19,.25),transparent 52%)}
html[data-style="3d"] .hero.ws-hero-3d .hero-content{position:relative;z-index:4;text-shadow:0 12px 40px rgba(0,0,0,.38);animation:wsHeroCopyIn .9s ease-out .35s both}
html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .hero-content{text-align:center}
html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .hero-content h1,
html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .hero-content p{margin-left:auto;margin-right:auto}
html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .hero-actions{justify-content:center}
html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .hero-content{text-align:right}
html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .hero-content h1,
html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .hero-content p{margin-left:auto}
html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .hero-actions{justify-content:flex-end}
html[data-style="3d"] .hero.ws-hero-3d[data-cta-layout="spread"] .hero-actions{width:min(760px,100%);justify-content:space-between}
html[data-style="3d"] .hero.ws-hero-3d[data-cta-sequence="sequential"] .hero-actions>*{opacity:0;transform:translateY(10px);animation:wsHeroCtaIn .55s ease-out 1.15s forwards}
html[data-style="3d"] .hero.ws-hero-3d[data-cta-sequence="sequential"] .hero-actions>*:nth-child(2){animation-delay:1.75s}
html[data-style="3d"] .hero.ws-hero-3d[data-cta-sequence="sequential"] .hero-actions>*:nth-child(3){animation-delay:2.2s}
html[data-style="3d"] .hero.ws-hero-3d .primary{box-shadow:0 14px 34px rgba(72,72,255,.28)}
@keyframes wsMotionCamera{from{transform:scale(1.02) translate3d(0,0,0)}to{transform:scale(var(--ws-base-end)) translate3d(var(--ws-pan-x),0,0)}}
@keyframes wsMotionDepth{from{transform:scale(1.035) translate3d(0,0,0)}to{transform:scale(var(--ws-depth-end)) translate3d(var(--ws-depth-pan-x),-1%,0)}}
html[data-style="3d"] .hero.ws-hero-3d[data-motion="focus-sweep"] .ws-motion-hero__base{animation-name:wsMotionSweep}
html[data-style="3d"] .hero.ws-hero-3d[data-motion="focus-sweep"] .ws-motion-hero__depth{animation-name:wsMotionDepthSweep}
@keyframes wsMotionSweep{0%{transform:scale(1.02) translate3d(0,0,0)}46%{transform:scale(1.09) translate3d(3.2%,0,0)}100%{transform:scale(var(--ws-base-end)) translate3d(-3.2%,0,0)}}
@keyframes wsMotionDepthSweep{0%{transform:scale(1.035) translate3d(0,0,0)}46%{transform:scale(1.13) translate3d(5.2%,-.5%,0)}100%{transform:scale(var(--ws-depth-end)) translate3d(-5.2%,-1%,0)}}
@keyframes wsHeroCopyIn{from{opacity:0;transform:translate3d(0,14px,0)}to{opacity:1;transform:none}}
@keyframes wsHeroCtaIn{to{opacity:1;transform:none}}
@media(max-width:760px){
 html[data-style="3d"] .hero.ws-hero-3d{--ws-base-end:1.09;--ws-depth-end:1.12;--ws-pan-x:0%;--ws-depth-pan-x:0%}
 .ws-motion-hero__base,.ws-motion-hero__depth{inset:-2%}.ws-motion-hero__depth{opacity:.30}
 html[data-style="3d"] .hero.ws-hero-3d[data-cta-layout="spread"] .hero-actions{justify-content:flex-start;gap:10px}
 html[data-style="3d"] .hero.ws-hero-3d[data-text="center"] .hero-actions{justify-content:center}
 html[data-style="3d"] .hero.ws-hero-3d[data-text="right"] .hero-actions{justify-content:flex-end}
}
@media(prefers-reduced-motion:reduce){
 .ws-motion-hero__base,.ws-motion-hero__depth,
 html[data-style="3d"] .hero.ws-hero-3d .hero-content,
 html[data-style="3d"] .hero.ws-hero-3d .hero-actions>*{animation:none!important;opacity:1!important;transform:none!important}
}
</style>`;

const SCENE='<div class="ws-motion-hero__media" aria-hidden="true"><span class="ws-motion-hero__base"></span><span class="ws-motion-hero__depth"></span><span class="ws-motion-hero__shade"></span></div>';

const allowed={
 mode:new Set(['zoom-center','zoom-left','zoom-right','focus-sweep']),
 depth:new Set(['off','light','medium']),
 intensity:new Set(['subtle','standard','strong']),
 textPosition:new Set(['left','center','right']),
 ctaLayout:new Set(['grouped','spread']),
 ctaSequence:new Set(['together','sequential'])
};
const pick=(value,set,fallback)=>set.has(value)?value:fallback;

function motionConfig(siteConfig={}){
 const raw=siteConfig?.presentation?.heroMotion||{};
 return {
  mode:pick(raw.mode,allowed.mode,'focus-sweep'),
  depth:pick(raw.depth,allowed.depth,'medium'),
  intensity:pick(raw.intensity,allowed.intensity,'standard'),
  duration:[3,4,5].includes(Number(raw.duration))?Number(raw.duration):4,
  textPosition:pick(raw.textPosition,allowed.textPosition,'left'),
  ctaLayout:pick(raw.ctaLayout,allowed.ctaLayout,'grouped'),
  ctaSequence:pick(raw.ctaSequence,allowed.ctaSequence,'sequential')
 };
}

export function applyHeroRenderer(html,siteConfig={}){
 const style=siteConfig?.style==='tech'?'modern':(siteConfig?.style||'modern');
 let output=siteConfig?.style==='tech'?html.replace('data-style="tech"','data-style="modern"'):html;
 if(style!=='3d')return output;
 if(output.includes('id="ws-hero-3d-css"'))return output;
 const motion=motionConfig(siteConfig);
 let found=false;
 output=output.replace(/<section class="hero([^"]*)"([^>]*)>/,(_,classes,attrs)=>{
  found=true;
  const className=['hero',String(classes||'').trim(),'ws-hero-3d'].filter(Boolean).join(' ');
  const data=` data-motion="${motion.mode}" data-depth="${motion.depth}" data-intensity="${motion.intensity}" data-duration="${motion.duration}" data-text="${motion.textPosition}" data-cta-layout="${motion.ctaLayout}" data-cta-sequence="${motion.ctaSequence}"`;
  return `<section class="${className}"${attrs}${data}>${SCENE}`;
 });
 if(!found)return output;
 return output.replace('</head>',MOTION_CSS+'</head>');
}
