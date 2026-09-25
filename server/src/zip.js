import {deflateRawSync} from 'node:zlib';
// ZIP writer for bounded, validated pilot exports; no native tools required on Render.
const crcTable=Uint32Array.from({length:256},(_,i)=>{
  let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function crc32(b){let c=0xffffffff;for(const n of b)c=crcTable[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function zipFiles(files){
  if(!Array.isArray(files)||files.length<1||files.length>70)throw new Error('Neispravan broj fajlova.');
  const locals=[],central=[];let offset=0;let total=0;
  for(const file of files){
    const name=file.name;
    if(typeof name!=='string'||!name||name.startsWith('/')||name.includes('..')||name.includes('\\')||/[\u0000-\u001f]/.test(name))throw new Error('Neispravna putanja u ZIP-u.');
    const data=Buffer.isBuffer(file.data)?file.data:Buffer.from(file.data);
    total+=data.length;
    if(total>60*1024*1024)throw new Error('ZIP za besplatan sajt je prevelik.');
    const fileName=Buffer.from(name,'utf8'),compressed= /\.(jpg|jpeg|png|webp)$/i.test(name)?data:deflateRawSync(data);
    const useDeflate=compressed!==data&&compressed.length<data.length;
    const payload=useDeflate?compressed:data;
    const method=useDeflate?8:0,c=crc32(data);
    const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(method,8);
    local.writeUInt32LE(c,14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(fileName.length,26);
    locals.push(local,fileName,payload);
    const dir=Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(0x0314,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);dir.writeUInt16LE(method,10);
    dir.writeUInt32LE(c,16);dir.writeUInt32LE(payload.length,20);dir.writeUInt32LE(data.length,24);
    dir.writeUInt16LE(fileName.length,28);dir.writeUInt32LE(offset,42);
    central.push(dir,fileName);
    offset+=local.length+fileName.length+payload.length;
  }
  const centralLength=central.reduce((n,b)=>n+b.length,0);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(centralLength,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,...central,end]);
}
