// Stoneshard .sav editor — verified format (community-documented, checksum verified against real save):
//   file = zlib_deflate( gm_json_text + md5_hex(gm_json_text + salt) + "\0" )
//   salt = "stOne!characters_v1!" + <parent dir e.g. character_4> + "!" + <dir e.g. exitsave_1> + "!shArd"
//   Salt dirs are recoverable by brute force against the file's own checksum.
// GM JSON quirks: "{ ", spaces after commas/colons, integers as N.0, "/" escaped as "\/", "[ ]"/"{ }" empties.

function md5Core(state, dv, from, to) {
  const K = md5Core.K || (md5Core.K = (() => { const k = []; for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296); return k; })());
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const add = (p, q) => (p + q) | 0;
  let [A, B, C, D] = state;
  const X = new Int32Array(16);
  for (let i = from; i < to; i += 64) {
    for (let j = 0; j < 16; j++) X[j] = dv.getInt32(i + j * 4, true);
    let aa = A, bb = B, cc = C, dd = D;
    for (let j = 0; j < 64; j++) {
      let F, g;
      if (j < 16) { F = bb & cc | ~bb & dd; g = j; }
      else if (j < 32) { F = dd & bb | ~dd & cc; g = (5 * j + 1) % 16; }
      else if (j < 48) { F = bb ^ cc ^ dd; g = (3 * j + 5) % 16; }
      else { F = cc ^ (bb | ~dd); g = 7 * j % 16; }
      const tmp = dd; dd = cc; cc = bb;
      const x = add(add(aa, F), add(K[j], X[g]));
      bb = add(bb, x << S[j] | x >>> 32 - S[j]); aa = tmp;
    }
    A = add(A, aa); B = add(B, bb); C = add(C, cc); D = add(D, dd);
  }
  return [A, B, C, D];
}
const md5Hex = st => st.map(n => { let s = ''; for (let i = 0; i < 4; i++) s += (n >>> i * 8 & 0xff).toString(16).padStart(2, '0'); return s; }).join('');

export function md5Salted(jsonBytes, salt) {
  const enc = new TextEncoder();
  const sb = enc.encode(salt);
  const total = new Uint8Array(jsonBytes.length + sb.length);
  total.set(jsonBytes); total.set(sb, jsonBytes.length);
  const len = total.length;
  const padded = ((len + 8 >> 6) + 1) << 6;
  const M = new Uint8Array(padded);
  M.set(total); M[len] = 0x80;
  const dv = new DataView(M.buffer);
  dv.setUint32(padded - 8, len * 8, true);
  dv.setUint32(padded - 4, Math.floor(len / 536870912), true);
  return md5Hex(md5Core([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476], dv, 0, padded));
}

export async function parseSav(arrayBuffer) {
  const raw = new Uint8Array(arrayBuffer);
  const out = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const jsonBytes = out.subarray(0, out.length - 33);
  const fileHash = new TextDecoder().decode(out.subarray(out.length - 33, out.length - 1));
  const jsonText = new TextDecoder().decode(jsonBytes);
  const obj = JSON.parse(jsonText);
  // brute-force the salt dirs against the file's own checksum (prefix state computed once)
  const prefLen = Math.floor(jsonBytes.length / 64) * 64;
  const dvPref = new DataView(out.buffer, out.byteOffset, prefLen);
  const st0 = md5Core([0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476], dvPref, 0, prefLen);
  const rem = jsonBytes.subarray(prefLen);
  const enc = new TextEncoder();
  const tryTail = salt => {
    const sb = enc.encode(salt);
    const totalLen = jsonBytes.length + sb.length;
    const tailLen = rem.length + sb.length;
    const padded = ((tailLen + 8 >> 6) + 1) << 6;
    const M = new Uint8Array(padded);
    M.set(rem); M.set(sb, rem.length); M[tailLen] = 0x80;
    const dv = new DataView(M.buffer);
    dv.setUint32(padded - 8, totalLen * 8, true);
    dv.setUint32(padded - 4, Math.floor(totalLen / 536870912), true);
    return md5Hex(md5Core(st0.slice(), dv, 0, padded));
  };
  let salt = null, dirs = null;
  const d2s = [];
  for (let i = 0; i <= 9; i++) d2s.push('exitsave_' + i, 'save_' + i, 'autosave_' + i, 'bedsave_' + i);
  outer:
  for (let n = 1; n <= 40; n++) {
    for (const d2 of d2s) {
      const s = 'stOne!characters_v1!character_' + n + '!' + d2 + '!shArd';
      if (tryTail(s) === fileHash) { salt = s; dirs = ['character_' + n, d2]; break outer; }
    }
  }
  return { obj, jsonText, fileHash, salt, dirs };
}

const gmStr = s => JSON.stringify(s).replace(/\//g, '\\/');
const numStr = v => {
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return v + '.0';
  const s = String(v);
  if (!/e/i.test(s)) return s;
  return v.toFixed(20).replace(/0+$/, '').replace(/\.$/, '.0'); // avoid exponent notation GameMaker may not parse
};
export function gmStringify(v) {
  if (v === null) return 'null';
  if (typeof v === 'number') return numStr(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return gmStr(v);
  if (Array.isArray(v)) return v.length ? '[ ' + v.map(gmStringify).join(', ') + ' ]' : '[ ]';
  const keys = Object.keys(v);
  return keys.length ? '{ ' + keys.map(k => gmStr(k) + ': ' + gmStringify(v[k])).join(', ') + ' }' : '{ }';
}

export async function buildSav(obj, salt) {
  const jsonText = gmStringify(obj);
  const enc = new TextEncoder();
  const jsonBytes = enc.encode(jsonText);
  const hash = md5Salted(jsonBytes, salt);
  const payload = new Uint8Array(jsonBytes.length + 33);
  payload.set(jsonBytes);
  payload.set(enc.encode(hash), jsonBytes.length);
  payload[payload.length - 1] = 0;
  const compressed = new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  return compressed;
}

// ---- domain helpers ----
export function prettySkill(id) {
  return id.replace(/^o_pass_skill_/, '').replace(/^o_skill_/, '').replace(/_ico$/, '')
    .split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
export function learnedSkills(obj) {
  const sl = obj.skillsDataMap.skillsAllDataList;
  const rows = [];
  for (let i = 0; i < sl.length; i += 5) { if (sl[i + 1] === 1 || sl[i + 1] === true) rows.push({ id: sl[i], idx: i, name: prettySkill(sl[i]) }); }
  return rows;
}
export function unlearnSkills(obj, ids) {
  const sl = obj.skillsDataMap.skillsAllDataList;
  const set = new Set(ids);
  let n = 0;
  for (let i = 0; i < sl.length; i += 5) { if (set.has(sl[i]) && (sl[i + 1] === 1 || sl[i + 1] === true)) { sl[i + 1] = sl[i + 1] === true ? false : 0; n++; } }
  obj.characterDataMap.AP = (obj.characterDataMap.AP || 0) + n;
  // also clear them from the quickbar panels so the game doesn't reference unlearned skills
  const panels = obj.skillsDataMap.skillsPanelDataList;
  const bare = new Set(ids.map(x => x.replace(/_ico$/, '')));
  if (Array.isArray(panels)) panels.forEach(row => { if (Array.isArray(row)) row.forEach((cell, i2) => { if (typeof cell === 'string' && (bare.has(cell) || set.has(cell))) row[i2] = '0'; }); });
  return n;
}
export function resetAttributes(obj, base) {
  // base: {STR, AGL, PRC, Vitality, WIL}; refunds the difference into SP
  const c = obj.characterDataMap;
  let refund = 0;
  for (const k of ['STR', 'AGL', 'PRC', 'Vitality', 'WIL']) {
    const cur = c[k] || 0, b = base[k];
    if (cur > b) { refund += cur - b; c[k] = b; }
  }
  c.SP = (c.SP || 0) + refund;
  return refund;
}
export function listItems(obj) {
  return obj.inventoryDataList.map((e, i) => {
    const p = e[1] || {};
    return {
      i, id: e[0], name: prettySkill(e[0].replace(/^o_inv_/, 'o_skill_')),
      cursed: !!p.is_cursed,
      dur: typeof p.Duration === 'number' ? p.Duration : null,
      maxDur: typeof p.MaxDuration === 'number' ? p.MaxDuration : 0
    };
  });
}
export function repairItem(obj, idx) { const e = obj.inventoryDataList[idx]; if (e && e[1] && e[1].MaxDuration > 0) e[1].Duration = e[1].MaxDuration; }
export function repairAll(obj) { let n = 0; obj.inventoryDataList.forEach(e => { const p = e[1]; if (p && p.MaxDuration > 0 && p.Duration < p.MaxDuration) { p.Duration = p.MaxDuration; n++; } }); return n; }
