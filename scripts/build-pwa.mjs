import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const dir = 'dist';
writeFileSync(join(dir, 'CNAME'), 'beat.animeshj9.com\n');
writeFileSync(join(dir, '.nojekyll'), '');
mkdirSync(join(dir, 'icons'), { recursive: true });
for (const size of [192, 512]) copyFileSync(`assets/icon-${size}.png`, join(dir, `icons/icon-${size}.png`));
writeFileSync(join(dir, 'manifest.webmanifest'), JSON.stringify({ id: '/', name: 'Beat', short_name: 'Beat', description: 'Sample neighbourhood stories for your private alpha.', start_url: '/', scope: '/', display: 'standalone', background_color: '#F6F4EF', theme_color: '#F6F4EF', icons: [192,512].map(size=>({src:`/icons/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'})) }));
const install = `
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (!standalone) {
  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Install Beat');
  Object.assign(panel.style, {position:'fixed',bottom:'86px',left:'16px',right:'16px',maxWidth:'420px',margin:'auto',padding:'14px',borderRadius:'14px',background:'#28382F',color:'white',zIndex:'10000',font:'14px/1.5 system-ui',boxShadow:'0 4px 20px #0003'});
  const text = document.createElement('span');
  text.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'Install Beat: in Safari, tap Share → Add to Home Screen.' : 'Install Beat: open your browser menu → Add to Home screen or Install app.';
  const close = document.createElement('button'); close.textContent = 'Dismiss'; close.style.marginLeft='12px'; close.onclick=()=>panel.remove();
  panel.append(text,close); document.body.append(panel);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); text.textContent='Keep Beat on your home screen. ';
    const button=document.createElement('button'); button.textContent='Install Beat';
    button.onclick=async()=>{await event.prompt(); const result=await event.userChoice;if(result.outcome==='accepted')panel.remove();};
    panel.insertBefore(button,close);
  });
  window.addEventListener('appinstalled',()=>panel.remove());
}`;
writeFileSync(join(dir, 'install.js'), install);
let html = readFileSync(join(dir, 'index.html'), 'utf8');
html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#F6F4EF"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Beat"><link rel="apple-touch-icon" href="/icons/icon-192.png"></head>');
html = html.replace('</body>', '<script src="/install.js" defer></script></body>');
writeFileSync(join(dir, 'index.html'), html);
const walk = path => readdirSync(join(dir,path),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):[ '/'+join(path,e.name) ]);
const files=walk('').filter(p=>!['/sw.js','/_headers'].includes(p));
const version=createHash('sha256').update(files.map(p=>readFileSync(join(dir,p))).join('')).digest('hex').slice(0,12);
writeFileSync(join(dir,'sw.js'), `const CACHE='beat-sample-${version}';
const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('beat-sample-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return;}
e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});`);
writeFileSync(join(dir,'_headers'), '/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n');
console.log('Built installable sample PWA:', files.length, 'offline assets');
