// Shared Hero presentation layer.
// Existing renderers keep their accessible Hero markup; this owns only style behavior.
const THREE_D_CSS=`<style id="ws-hero-3d-css">
html[data-style="3d"]{--accent:#625cff;--radius:18px}
html[data-style="3d"] .hero.ws-hero-3d{position:relative;isolation:isolate;overflow:hidden;background:#09101f!important;background-image:none!important;perspective:1200px}
html[data-style="3d"] .hero.ws-hero-3d::before{content:"";position:absolute;inset:-7%;z-index:0;background-image:linear-gradient(90deg,rgba(6,11,24,.84) 4%,rgba(8,13,28,.50) 50%,rgba(7,12,25,.26) 100%),var(--hero-image);background-position:center;background-size:cover;filter:saturate(1.08) contrast(1.04);transform:scale(1.06) translateZ(0)}
html[data-style="3d"] .hero.ws-hero-3d::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 78% 22%,rgba(119,104,255,.32),transparent 24%),radial-gradient(circle at 68% 76%,rgba(64,195,255,.18),transparent 29%),linear-gradient(180deg,transparent 55%,rgba(5,9,20,.34))}
html[data-style="3d"] .hero.ws-hero-3d .hero-content{position:relative;z-index:4;transform:translateZ(70px);text-shadow:0 12px 40px rgba(0,0,0,.34)}
html[data-style="3d"] .hero.ws-hero-3d .primary{box-shadow:0 14px 34px rgba(72,72,255,.33)}
.ws-hero-3d-scene{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;transform-style:preserve-3d}
.ws-hero-3d-orb{position:absolute;border-radius:50%;filter:blur(1px);opacity:.82;box-shadow:inset -22px -24px 54px rgba(0,0,0,.28),0 22px 70px rgba(69,70,255,.2);animation:wsHeroDrift 8s ease-in-out infinite alternate}
.ws-hero-3d-orb.is-a{width:clamp(92px,12vw,180px);aspect-ratio:1;right:10%;top:16%;background:radial-gradient(circle at 31% 28%,#fff 0 2%,#b9b2ff 11%,#675fff 43%,#22265f 72%,#11152d 100%);transform:translateZ(115px)}
.ws-hero-3d-orb.is-b{width:clamp(52px,7vw,102px);aspect-ratio:1;right:28%;bottom:18%;background:radial-gradient(circle at 31% 28%,#dffcff,#54d6ff 34%,#1766b5 68%,#102340);animation-delay:-3s;transform:translateZ(65px)}
.ws-hero-3d-plane{position:absolute;left:45%;right:-12%;bottom:-43%;height:72%;opacity:.36;background-image:linear-gradient(rgba(132,151,255,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(132,151,255,.28) 1px,transparent 1px);background-size:36px 36px;transform-origin:center top;transform:perspective(700px) rotateX(67deg) translateZ(-40px);mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),transparent 80%)}
@keyframes wsHeroDrift{from{translate:0 -5px;rotate:-2deg}to{translate:8px 10px;rotate:3deg}}
@media(max-width:760px){html[data-style="3d"] .hero.ws-hero-3d::before{inset:-3%;transform:scale(1.03)}.ws-hero-3d-orb.is-a{right:-8%;top:13%;opacity:.62}.ws-hero-3d-orb.is-b{right:18%;bottom:30%;opacity:.45}.ws-hero-3d-plane{left:20%;right:-30%;bottom:-35%;opacity:.24}}
@media(prefers-reduced-motion:reduce){.ws-hero-3d-orb{animation:none}}
</style>`;

const SCENE='<div class="ws-hero-3d-scene" aria-hidden="true"><span class="ws-hero-3d-orb is-a"></span><span class="ws-hero-3d-orb is-b"></span><span class="ws-hero-3d-plane"></span></div>';

export function applyHeroRenderer(html,siteConfig={}){
  const style=siteConfig?.style==='tech'?'modern':(siteConfig?.style||'modern');
  let output=siteConfig?.style==='tech'?html.replace('data-style="tech"','data-style="modern"'):html;
  if(style!=='3d')return output;
  if(output.includes('id="ws-hero-3d-css"'))return output;
  let found=false;
  output=output.replace(/<section class="hero([^"]*)"([^>]*)>/,(_,classes,attrs)=>{
    found=true;
    const className=['hero',String(classes||'').trim(),'ws-hero-3d'].filter(Boolean).join(' ');
    return `<section class="${className}"${attrs}>${SCENE}`;
  });
  if(!found)return output;
  return output.replace('</head>',THREE_D_CSS+'</head>');
}
