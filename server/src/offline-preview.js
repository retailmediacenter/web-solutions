// Secondary, self-contained HTML for local viewing in iPhone Files / Quick Look.
// The normal index.html and its publishable companion files remain unchanged.
const OFFLINE_NAME='PREGLED_NA_TELEFONU.html';
const MAX_ZIP_RAW=60*1024*1024; // mirrors the bounded ZIP writer

function text(data){return Buffer.isBuffer(data)?data.toString('utf8'):String(data);}
function length(data){return Buffer.isBuffer(data)?data.length:Buffer.byteLength(data);}
function getAttr(tag,key){
  const pattern=new RegExp('\\b'+key+'\\s*=\\s*(["\\\'])(.*?)\\1','i');
  const found=pattern.exec(tag);
  return found?found[2]:null;
}
function isLocalImage(name){return /^assets\/images\/curated\/[a-z0-9/_-]+\.(?:jpe?g|png|webp)$/i.test(name);}
function imageMime(name){
  if(/\.png$/i.test(name))return 'image/png';
  if(/\.webp$/i.test(name))return 'image/webp';
  return 'image/jpeg';
}
function neutralizeClosingTag(source,element){
  // A literal closing tag inside inline JS/CSS would terminate the HTML element.
  return source.replace(new RegExp('</'+element,'gi'),'<\\/'+element);
}

/** Build a second HTML document without touching the original index or assets. */
export function makeLocalPhonePreview(files){
  const byName=new Map(files.map(file=>[file.name,file]));
  if(byName.size!==files.length)throw new Error('Duplirani nazivi datoteka u ZIP-u.');
  const original=byName.get('index.html');
  if(!original)throw new Error('Nedostaje index.html.');
  let html=text(original.data);
  if(!/<!doctype\s+html/i.test(html))throw new Error('Neispravan index.html.');

  // Preserve stylesheet ordering, including inline <style> already in the HTML.
  html=html.replace(/<link\b[^>]*>/gi,tag=>{
    const rel=getAttr(tag,'rel')||'';
    if(!rel.toLowerCase().split(/\s+/).includes('stylesheet'))return tag;
    const href=getAttr(tag,'href');
    const file=href&&byName.get(href);
    if(!file){
      if(href&&!/^(https?:)?\/\//i.test(href))throw new Error('CSS nije u ZIP-u: '+href);
      return tag;
    }
    if(!/\.css$/i.test(href))throw new Error('Nedozvoljeni lokalni CSS: '+href);
    return '<style data-rmc-original="'+href+'">\n'+neutralizeClosingTag(text(file.data),'style')+'\n</style>';
  });

  // Original exported scripts use defer and follow each other near </body>.
  // Inline scripts execute in their original DOM order at that position.
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,tag=>{
    const opening=tag.slice(0,tag.indexOf('>')+1);
    const src=getAttr(opening,'src');
    if(!src)return tag; // e.g. #siteData application/json remains unchanged
    const file=byName.get(src);
    if(!file){
      if(!/^(https?:)?\/\//i.test(src))throw new Error('JS nije u ZIP-u: '+src);
      return tag;
    }
    if(!/\.js$/i.test(src))throw new Error('Nedozvoljeni lokalni JS: '+src);
    const middle=tag.slice(opening.length).replace(/<\/script\s*>$/i,'');
    if(middle.trim())throw new Error('Neocekivan sadrzaj spoljne skripte: '+src);
    return '<script data-rmc-original="'+src+'">\n'+neutralizeClosingTag(text(file.data),'script')+'\n</script>';
  });

  // Inline binary photos. This also rewrites the serialized #siteData catalog
  // (which JS uses for the product modal and cart), not just visible <img> tags.
  const images=files.filter(file=>isLocalImage(file.name)).sort((a,b)=>b.name.length-a.name.length);
  for(const file of images){
    const uri='data:'+imageMime(file.name)+';base64,'+Buffer.from(file.data).toString('base64');
    html=html.split(file.name).join(uri);
  }
  const dangling=html.match(/assets\/images\/curated\/[a-z0-9/_-]+\.(?:jpe?g|png|webp)/i);
  if(dangling)throw new Error('Nedostaje offline fotografija: '+dangling[0]);
  return html;
}

/** Add optional phone preview without compromising a valid hosting ZIP. */
export function addLocalPhonePreview(files){
  const originalSize=files.reduce((size,file)=>size+length(file.data),0);
  const imageSize=files.filter(file=>isLocalImage(file.name)).reduce((sum,file)=>sum+length(file.data),0);
  const htmlSize=length(files.find(file=>file.name==='index.html')?.data||'');
  const assetsSize=files.filter(file=>/\.(?:css|js)$/i.test(file.name)).reduce((sum,file)=>sum+length(file.data),0);
  // Base64 photos cost 4/3 inside the new HTML; avoid generating a huge file
  // when the regular export is already near its hard size/file-count limits.
  const projected=originalSize+htmlSize+assetsSize+Math.ceil(imageSize*4/3)+32768;
  if(files.length>=70 || projected>MAX_ZIP_RAW){
    console.warn('RMC: local phone preview omitted due to ZIP size/file-count limit; hosting ZIP is intact.');
    return files;
  }
  try{
    const data=makeLocalPhonePreview(files);
    if(files.reduce((size,file)=>size+length(file.data),length(data))>MAX_ZIP_RAW){
      console.warn('RMC: local phone preview omitted due to ZIP size; hosting ZIP is intact.');
      return files;
    }
    return [...files,{name:OFFLINE_NAME,data}];
  }catch(error){
    console.warn('RMC: local phone preview could not be created: '+error.message);
    return files;
  }
}
