import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const root = 'dist';
const manifest = JSON.parse(readFileSync(`${root}/manifest.webmanifest`));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/');
for (const size of [192, 512]) {
  const icon = manifest.icons.find(i => i.sizes === `${size}x${size}`);
  assert.ok(icon && existsSync(root + icon.src), `Missing ${size}px icon`);
}
assert.equal(readFileSync(`${root}/CNAME`, 'utf8').trim(), 'beat.animeshj9.com');
const html = readFileSync(`${root}/index.html`, 'utf8');
assert.equal((html.match(/rel="manifest"/g) || []).length, 1);
assert.equal((html.match(/src="\/install.js"/g) || []).length, 1);
new vm.Script(readFileSync(`${root}/install.js`, 'utf8'));
const handlers = {};
let cachedFiles;
const offline = { cachedShell: true };
vm.runInNewContext(readFileSync(`${root}/sw.js`, 'utf8'), {
  URL,
  self: {
    location: { origin: 'https://beat.animeshj9.com' },
    addEventListener: (name, fn) => { handlers[name] = fn; },
  },
  caches: {
    open: async () => ({ addAll: async files => { cachedFiles = files; } }),
    match: async path => path === '/index.html' ? offline : undefined,
  },
  fetch: async () => { throw new Error('Network unavailable'); },
});
let pending;
handlers.install({ waitUntil: p => { pending = p; } });
await pending;
for (const path of cachedFiles) assert.ok(existsSync(root + path), `Missing offline asset ${path}`);
assert.ok(cachedFiles.includes('/index.html'));
assert.ok(cachedFiles.includes('/install.js'));
handlers.fetch({
  request: { url: 'https://beat.animeshj9.com/', method: 'GET', mode: 'navigate' },
  respondWith: p => { pending = p; },
});
assert.equal(await pending, offline, 'Offline navigation must return the cached app shell');
let intercepted = false;
handlers.fetch({
  request: { url: 'https://www.openstreetmap.org/', method: 'GET' },
  respondWith: () => { intercepted = true; },
});
assert.equal(intercepted, false, 'External map requests must remain outside the app cache');
console.log('PWA manifest, domain, assets, offline navigation and external-request isolation passed.');
