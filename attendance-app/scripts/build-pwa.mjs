import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const root=path.resolve("dist/client");
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(dir,item.name)):[path.join(dir,item.name)]); }
const paths=files(root).filter(file=>!file.endsWith("sw.js"));
// Cache only the application shell and build assets, never API responses or user records.
const assets=paths.map(file=>"/"+path.relative(root,file).replaceAll("\\","/"));
const hash=createHash("sha256");paths.forEach(file=>{hash.update(file.slice(root.length));hash.update(readFileSync(file));});
const version="roco-shell-"+hash.digest("hex").slice(0,16);
writeFileSync(path.join(root,"sw.js"),`
const CACHE=${JSON.stringify(version)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith('roco-shell-')&&key!==CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).catch(async()=>{
      const response=await (await caches.open(CACHE)).match('/index.html');
      return response||Response.error();
    }));
  } else if(ASSETS.includes(url.pathname)&&!url.search) {
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
  }
});
`);
console.log(`PWA shell prepared: ${assets.length} assets, ${version}`);
