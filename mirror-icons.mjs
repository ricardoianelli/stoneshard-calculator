#!/usr/bin/env node
// Mirrors all wiki icons used by the calculator into ./images/ so the site
// works even if stoneshard.com is down or blocks hotlinking.
// Usage:  node mirror-icons.mjs     (re-run after any data update; safe to re-run, skips existing)
// Then commit the images/ folder. The calculator auto-detects images/.mirrored and switches to local icons.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const names = new Set();
const walk = dir => readdirSync(dir, { withFileTypes: true }).forEach(e => {
  const p = join(dir, e.name);
  if (e.isDirectory()) return walk(p);
  if (!e.name.endsWith('.json')) return;
  const scan = o => {
    if (Array.isArray(o)) return o.forEach(scan);
    if (o && typeof o === 'object') {
      if (typeof o.n === 'string') names.add(o.n);
      if (typeof o.name === 'string') names.add(o.name);
      Object.values(o).forEach(scan);
    }
  };
  scan(JSON.parse(readFileSync(p, 'utf8')));
});
walk('data');
// aliases used by the app (keep in sync with img() in the DC)
['Optimism', 'Heroism', 'Second_Wind', 'Vigor', 'Brigand'].forEach(n => names.add(n));

mkdirSync('images', { recursive: true });
let ok = 0, miss = 0, skip = 0;
for (const n of names) {
  const file = n.replace(/ /g, '_') + '.png';
  const dest = join('images', file);
  if (existsSync(dest)) { skip++; continue; }
  const url = 'https://stoneshard.com/wiki/Special:FilePath/' + encodeURIComponent(file);
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) { miss++; continue; }
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
    await new Promise(res => setTimeout(res, 150)); // be polite to the wiki
  } catch (e) { miss++; }
}
writeFileSync('images/.mirrored', new Date().toISOString());
console.log(`done: ${ok} downloaded, ${skip} already present, ${miss} not found on wiki (fine — app hides missing icons)`);
