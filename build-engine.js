// Build Finder engine — deterministic scoring + beam search over VERBATIM wiki data.
// No invented numbers: skill value comes from parsing the skill's own (formula-evaluated) text;
// item value comes from the item's own stat block. Eligibility follows the wiki rule:
// weapon-tree skills (actives AND passives) require that weapon type equipped;
// utility-tree and magic-tree passives/spells are global; Dual Wielding requires dual wielding;
// Shields requires a shield.

const CLS2TREE = { sword: 'swords', axe: 'axes', mace: 'maces', dagger: 'daggers', spear: 'spears', staff: 'staves', sword2h: 'swords2h', axe2h: 'axes2h', mace2h: 'maces2h', bow: 'ranged', crossbow: 'ranged', sling: 'ranged' };
const CLS2FILE = { sword: 'swords', axe: 'axes', mace: 'maces', dagger: 'daggers', spear: 'spears', staff: 'staves', sword2h: 'swords2h', axe2h: 'axes2h', mace2h: 'maces2h', bow: 'bows', crossbow: 'crossbows', sling: 'slings' };

export const GOALS = [
  { id: 'damage', label: 'Damage', attrW: { str: 3, prc: 1.5, agi: 0.5 }, statW: { wd: 3, bpd: 1, ad: 0.5, ap: 1.5, acc: 1, mhe: 1, ohd: 1, mhd: 1 }, dmgW: 2.5 },
  { id: 'crit', label: 'Crit', attrW: { prc: 3, str: 1 }, statW: { cc: 3, ce: 2 } },
  { id: 'evasion', label: 'Dodge & Evasion', attrW: { agi: 3 }, statW: { dg: 3, fum: -1.5, co: 1, mvr: 0.5 } },
  { id: 'tank', label: 'Tankiness', attrW: { vit: 2.5, str: 1 }, statW: { bc: 1.5, bp: 1, bpr: 0.5, dt: -2, hp: 0.15, fort: 0.5, ctr: 0.5, phr: 1, slr: 0.4, pir: 0.4, crr: 0.4, rer: 0.4, blr: 0.4, pnr: 0.3 }, protW: 1.2 },
  { id: 'bleed', label: 'Bleed', attrW: { agi: 1.5, prc: 1.5, str: 1 }, statW: { bl: 3 } },
  { id: 'stun', label: 'Stun', attrW: { str: 2, prc: 1.5 }, statW: { st: 3 } },
  { id: 'daze', label: 'Daze', attrW: { str: 2, prc: 1.5 }, statW: { dz: 3 } },
  { id: 'stagger', label: 'Stagger', attrW: { str: 2, prc: 1.5 }, statW: { sg: 3 } },
  { id: 'knockback', label: 'Knockback', attrW: { str: 2, agi: 1 }, statW: { kb: 3 } },
  { id: 'immobilize', label: 'Immobilize', attrW: { prc: 2, str: 1 }, statW: { im: 3 } },
  { id: 'control', label: 'Control (all CC)', attrW: { str: 2, prc: 1.5 }, statW: { st: 1.5, dz: 1.5, sg: 1.5, kb: 1, im: 1.5 } },
  { id: 'block', label: 'Block', attrW: { str: 2.5, vit: 1 }, statW: { bc: 3, bp: 1.5, bpr: 1 } },
  { id: 'counter', label: 'Counter', attrW: { agi: 2.5, prc: 1 }, statW: { co: 3, dg: 1 } },
  { id: 'onhit', label: 'On-Hit Bonus Damage', attrW: { wil: 2, prc: 1.5 }, statW: { ed: 0.8, ld: 0.8 }, xdW: 7 },
  { id: 'energy', label: 'Energy Sustain', attrW: { wil: 2.5, vit: 1.5 }, statW: { en: 0.12, er: 1.5, sec: -1.5, spec: -1.5, ed: 1.5 } },
  { id: 'lifedrain', label: 'Life Drain', attrW: { wil: 2, vit: 1 }, statW: { ld: 3 } },
  { id: 'magic', label: 'Magic Power', attrW: { wil: 3 }, statW: { mp: 2.5, pyr: 1.5, geo: 1.5, ele: 1.5, arc: 1.5, mic: 0.5, mip: 0.5, bfc: -1, spec: -1 } },
  { id: 'cooldowns', label: 'Cooldowns', attrW: { wil: 3 }, statW: { cd: -2.5, sec: -0.8, spec: -0.8 } }
];

// text patterns per stat key — magnitudes read from the skill's own wording
const TXTPAT = {
  wd: /Weapon Damage/i, bpd: /Bodypart Damage/i, ad: /Armor Damage/i, ap: /Armor Penetration/i, acc: /Accuracy/i,
  cc: /Crit(?:ical)? Chance/i, ce: /Crit(?:ical)? Efficiency/i, dg: /Dodge Chance/i, fum: /Fumble Chance/i, co: /Counter(?:\s*Attack)? Chance/i,
  bc: /Block Chance/i, bp: /Block Power(?! Recovery)/i, bpr: /Block Power Recovery/i, dt: /Damage Taken/i, fort: /Fortitude/i,
  ctr: /Control Resistance/i, mvr: /Move Resistance/i, hp: /Max(?:imum)? Health/i, en: /Max(?:imum)? Energy/i,
  er: /Energy Restoration/i, hr: /Health Restoration/i, sec: /Skills Energy Cost/i, spec: /Spells Energy Cost/i,
  cd: /Cooldowns? Duration|ability tree's cooldowns/i, ed: /Energy Drain/i, ld: /Life Drain/i,
  bl: /Bleed Chance/i, dz: /Daze Chance/i, st: /Stun Chance/i, sg: /Stagger Chance/i, kb: /Knockback Chance/i, im: /Immobili[sz]ation Chance/i,
  mp: /Magic Power/i, pyr: /Pyromantic Power/i, geo: /Geomantic Power/i, ele: /Electromantic Power/i, arc: /Arcanistic Power/i,
  bfc: /Backfire Chance/i, mic: /Miracle Chance/i, mip: /Miracle Potency/i,
  phr: /Physical Resistance/i, mgr: /Magic Resistance/i
};
// keys where a NEGATIVE number in text is the good direction
const INVGOOD = { fum: 1, dt: 1, sec: 1, spec: 1, cd: 1, bfc: 1 };

const STATE_APPLY = {
  stagger: /stagger(?!\w*\s*resist)/i, daze: /daz(?:e|es|ing)(?!\w*\s*resist)/i, stun: /stun(?!\w*\s*resist)/i, bleed: /(?<!stops all )bleed(?!\w*\s*resist)/i,
  knockback: /knock(?:s|ed|ing)?\s?back(?!\w*\s*resist)|knockback(?!\s*resist)/i, immobilize: /immobili[sz](?!\w*\s*resist)/i, knockdown: /knock(?:s|ed|ing)?\s?down/i,
  // damage-type trigger chains: a skill granting elemental damage to strikes fuels passives
  // that condition on "Dealing X Damage"
  'arcane dmg': /arcane damage to (?:strikes|shots|attacks)|deals? (?:additional )?arcane damage/i,
  'fire dmg': /fire damage to (?:strikes|shots|attacks)|deals? (?:additional )?fire damage/i,
  'shock dmg': /shock damage to (?:strikes|shots|attacks)|deals? (?:additional )?shock damage/i
};
const STATE_COND = {
  stagger: /staggered/i, daze: /dazed/i, stun: /stunned/i, bleed: /(?<!stops all )bleeding/i,
  knockback: /knocked\s?back/i, immobilize: /immobilized/i, knockdown: /knocked\s?down|prone/i,
  'arcane dmg': /dealing (?:repeated )?arcane damage/i,
  'fire dmg': /dealing (?:repeated )?fire damage/i,
  'shock dmg': /dealing (?:repeated )?shock damage/i
};
const GOAL2STATE = { stun: 'stun', daze: 'daze', stagger: 'stagger', knockback: 'knockback', bleed: 'bleed', immobilize: 'immobilize' };
const XD_GRANT = /(fire|frost|shock|poison|caustic|arcane|unholy|sacred|psionic)\s+damage\s+to\s+(?:strikes|shots|attacks|basic)/ig;
const PHYS_D = { sl: 1, pi: 1, cr: 1, re: 1 };

function evalDyn(sk, attrs, evalExpr) {
  const raw = (sk.dyn || sk.desc || '');
  return raw.replace(/\{([^}]+)\}/g, (m, ex) => { const v = evalExpr(ex, attrs); return isNaN(v) ? m : String(Math.round(v * 10) / 10); });
}

// Armor-class-conditional text: only keep bonuses whose condition matches the build's
// recommended chestpiece class (light/medium/heavy). Paragraph- and clause-level.
const ARMOR_COND = /(?:if\s+(?:the\s+character\s+is\s+)?equipped\s+with\s+an?\s+|^\s*)(light|medium|heavy)\s*(?:chestpiece|chest|armor)\b/i;
function filterArmorConds(text, chestCls) {
  return text.split(/\n\s*\n/).filter(par => {
    const m = par.match(ARMOR_COND);
    // unknown chest class: drop conditional clauses rather than credit all of them
    return !m || (chestCls && m[1].toLowerCase() === chestCls);
  }).join('\n\n');
}

function extractMods(text) {
  // returns {statKey: summed magnitude} from "+X% <Stat>" phrases in the skill's own text
  const out = {};
  const numRe = /([+\-\u2212])\s*(\d+(?:\.\d+)?)\s*%?\s*(of\s+)?([A-Za-z][A-Za-z' ]{2,40})/g;
  let m;
  while ((m = numRe.exec(text))) {
    if (m[3]) continue; // "+33% of Dodge Chance as Weapon Damage" is a conversion, not a flat mod
    const sign = m[1] === '+' ? 1 : -1;
    const val = sign * parseFloat(m[2]);
    const phrase = m[4];
    for (const k in TXTPAT) { if (TXTPAT[k].test(phrase)) { out[k] = (out[k] || 0) + val; break; } }
  }
  return out;
}

function recommendAttrs(goals, ch, level) {
  const attrs = Object.assign({}, ch.stats);
  const w = { str: 0, agi: 0, prc: 0, vit: 0.9, wil: 0 }; // baseline VIT weight: survivability matters, but no hard floor
  goals.forEach(g => { for (const k in (g.attrW || {})) w[k] += g.attrW[k]; });
  let pts = level - 1;
  const order = [];
  // landmark-aware allocation: attribute bonuses land every 5 points (15/20/25/30),
  // so points are spent in blocks that reach the next landmark instead of stranding at 21-24
  const LM_BONUS = 4; // extra value (in point-equivalents) for crossing a landmark
  while (pts > 0) {
    let best = null, bestRatio = 0, bestCost = 0;
    for (const k in w) {
      if (attrs[k] >= 30 || w[k] <= 0) continue;
      const stop = Math.min(30, Math.ceil((attrs[k] + 1) / 5) * 5);
      const cost = stop - attrs[k];
      if (cost > pts) continue;
      const ratio = (w[k] * (cost + LM_BONUS)) / cost;
      if (ratio > bestRatio) { bestRatio = ratio; best = k; bestCost = cost; }
    }
    if (!best) {
      // leftover points too few for any landmark: dump into highest-weight attr
      let k0 = null, w0 = -1;
      for (const k in w) { if (attrs[k] < 30 && w[k] > w0) { w0 = w[k]; k0 = k; } }
      if (!k0) break;
      attrs[k0] += 1; order.push(k0); pts--;
      continue;
    }
    for (let i = 0; i < bestCost; i++) { attrs[best] += 1; order.push(best); }
    pts -= bestCost;
    w[best] *= Math.pow(0.965, bestCost); // gentle diminishing so secondary attrs get landmarks too
  }
  return { attrs, order };
}

function scoreMods(mods, goals) {
  let s = 0; const why = [];
  goals.forEach(g => {
    for (const k in (g.statW || {})) {
      const v = mods[k]; if (!v) continue;
      const contrib = v * g.statW[k];
      s += contrib;
      if (contrib > 0) why.push({ k, v, contrib });
    }
  });
  return { s, why };
}

// hand/off-hand-conditional clauses: "One-handed melee with empty off-hand: …" and variants
const HAND_COND = /one-?handed[^.\n]*?(?:empty\s+off-?hand|second\s+weapon\s+slot\s+is\s+empty|other\s+hand\s+is\s+(?:free|empty)|nothing\s+in\s+the\s+other)|(?:empty|free)\s+off-?hand/i;
function filterHandConds(text, weaponCls, offMode) {
  const oneHandEmpty = offMode === 'none' && ['sword','axe','mace','dagger'].includes(weaponCls);
  if (oneHandEmpty) return text;
  return text.split(/\n\s*\n/).map(par => {
    const m = par.match(HAND_COND);
    return m ? par.slice(0, m.index) : par;
  }).filter(Boolean).join('\n\n');
}

// faction/target-conditional bonuses ("against animals", "against the Undead") — situational,
// must not score toward general goals
const TARGET_COND = /against\s+(?:the\s+)?(animals?|beasts?|undead|humans?|vampires?)\b/i;
function filterTargetConds(text) {
  return text.split(/\n\s*\n/).filter(par => !TARGET_COND.test(par)).join('\n\n');
}

// bonuses granted to something other than the character (summons, other skills): "grants it +25% Damage",
// "grants +4% Crit Chance to \"Vigor\"" — not character stats, must not score
const OTHER_TARGET = /grants?\s+(?:it|them|the\s+(?:summon|crystal|entity|totem|boulder|spike)s?|boulders?|spikes?|crystals?|totems?|minions?|clones?)\s|\bto\s+"[^"]+"/i;
function filterOtherTargets(text) {
  return text.split(/\n\s*\n/).filter(par => !OTHER_TARGET.test(par)).join('\n\n');
}

// clauses that put a stat mod on the ENEMY ("applies the target with -20% Weapon Damage") —
// must not read as self-mods; they score separately, inverted at half weight
const APPLY_ENEMY = /appl(?:y|ies|ied|ying)\s+(?:it|them|him|her|the\s+target|their\s+targets?|the\s+attacker|all\s+(?:visible\s+|adjacent\s+)?enemies|enemies|(?:hit\s+)?targets?)\b/i;
function splitEnemyClauses(text) {
  const self = [], enemy = [];
  let lastEnemy = false; // persists across paragraphs: a standalone "The effect stacks…" paragraph follows its predecessor
  text.split(/\n\s*\n/).forEach(par => {
    par.split(/(?<=\.)\s+/).forEach(sen => {
      // continuation sentences ("The effect stacks up to N…", "The effect doesn't stack")
      // belong to whichever clause they follow
      const cont = /^\s*(?:the\s+effect|it|this\s+effect)\b/i.test(sen);
      const isEnemy = cont ? lastEnemy : APPLY_ENEMY.test(sen);
      (isEnemy ? enemy : self).push(sen);
      lastEnemy = isEnemy;
    });
  });
  return { selfText: self.join(' '), enemyText: enemy.join(' ') };
}

function skillEntry(sk, tid, tree, goals, attrs, evalExpr, chestCls, weaponCls, offMode) {
  const condText = filterTargetConds(filterHandConds(filterArmorConds(evalDyn(sk, attrs, evalExpr), chestCls), weaponCls, offMode));
  // spell-triggered clauses ("Using spells grants …") only pay off if the build casts spells;
  // scored conditionally in the beam search
  const parts = filterOtherTargets(condText).split(/\n\s*\n/);
  const spellTrig = parts.filter(p => /^\s*(?:using|casting)\s+(?:the\s+)?spells?\b/i.test(p)).join('\n\n');
  const { selfText, enemyText } = splitEnemyClauses(parts.filter(p => !/^\s*(?:using|casting)\s+(?:the\s+)?spells?\b/i.test(p)).join('\n\n'));
  const text = selfText;
  const stateText = condText; // state application/consumption detection sees enemy clauses too
  // trigger-frequency weighting: a bonus that fires on every strike is worth more than one
  // that needs a crit, a dodge, or a kill — weight each paragraph by how often it triggers
  const FREQW = [
    [/once\s+per|only\s+once|per\s+combat/i, 0.5],
    [/(?:upon|when|after|each|every|for\s+each)[^.\n]{0,24}kill|killing\s+an?\s+enem/i, 0.55],
    [/(?:upon|when|after|each|every)\s+(?:a\s+)?crit/i, 0.85],
    [/(?:when|upon|after|each|every)[^.\n]{0,30}(?:dodg|block|counter|parry)/i, 0.9],
    [/(?:each|every|per|upon|when|after)\s+(?:a\s+|an\s+)?(?:successful\s+)?(?:strike|hit|shot|attack)/i, 1.25]
  ];
  const mods = {};
  // clauses conditioned on a summoned entity being present ("for each adjacent runic boulder",
  // "while affected by <buff another skill activates>") — their value is paid only when the build
  // includes the summoner/buff source (resolved in the beam search)
  const SUMMON_COND = /(?:for\s+each|per|adjacent(?:\s+to)?|while|near|next\s+to)[^.\n]{0,50}\b(boulder|crystal|totem|spike|clone)s?\b|\b(boulder|crystal|totem|spike|clone)s?\b[^.\n]{0,30}adjacent/i;
  const needBonus = [];
  text.split(/\n\s*\n/).forEach(par => {
    let f = 1;
    for (const [re, w] of FREQW) { if (re.test(par)) { f = w; break; } }
    const pm = extractMods(par);
    const sc = par.match(SUMMON_COND);
    const bm = par.match(/while\s+affected\s+by\s+"([^"]+)"/i);
    if (sc && !/summons?\s/i.test(par)) {
      const val = scoreMods(pm, goals).s * f;
      if (val > 0) needBonus.push({ key: 'summon:' + (sc[1] || sc[2]).toLowerCase(), val: Math.round(val * 10) / 10 });
      return; // conditional — not unconditional self mods
    }
    if (bm) {
      const val = scoreMods(pm, goals).s * f;
      if (val > 0) needBonus.push({ key: 'buff:' + bm[1].toLowerCase(), val: Math.round(val * 10) / 10 });
      return;
    }
    for (const k in pm) mods[k] = (mods[k] || 0) + pm[k] * f;
  });
  let score0 = 0;
  // multi-strike/multi-projectile attacks: per-strike WD malus must not sum; value = hits × (1 + avg/100) per action
  let strikes = 1;
  const W2N = { two: 2, three: 3, four: 4, five: 5 };
  let mm = stateText.match(/(?:delivers?|performs?)\s+(?:up to\s+)?(two|three)\s+(dual\s+)?strikes/i);
  if (mm) strikes = W2N[mm[1].toLowerCase()] * (mm[2] ? 2 : 1); // dual strike = both weapons hit
  mm = stateText.match(/(?:shoots?|launches?|fires?)\s+(two|three|four|five)\s+(?:fire\s*)?(?:bolts?|firebolts?|projectiles?)/i);
  if (mm) strikes = Math.max(strikes, W2N[mm[1].toLowerCase()]);
  // AoE cleaves (strike to 2-3 adjacent tiles) hit each enemy ONCE — they proc on-hit effects
  // per enemy but are NOT repeated strikes on one target: no WD compounding, no "N hits" label
  const isAoE = /strikes?\s+to\s+(?:two|three)\s+adjacent\s+tiles/i.test(stateText);
  if (/additional\s+(dual\s+)?strike/i.test(stateText)) strikes += /additional\s+dual/i.test(stateText) ? 2 : 1;
  if (strikes > 1 && !/Spell/i.test(sk.type || '')) {
    // per-strike efficiency maluses (Hands/Main-Hand Efficiency) reduce each hit's damage
    const hem = text.match(/([+\-\u2212])\s*(\d+)%\s*(?:Hands|Main[- ]Hand|Off[- ]Hand)\s+Efficiency/i);
    const he = hem ? (hem[1] === '+' ? 1 : -1) * parseInt(hem[2]) : 0;
    const perStrike = (mods.wd || 0) / strikes + he;
    mods.wd = ((strikes * (1 + perStrike / 100)) - 1) * 100 * 0.25; // 0.25: it's an active on cooldown, not every turn
    var convWD = true;
  } else if (strikes > 1) {
    // multi-projectile spells: worth more casts-per-cast only for magic-focused goals
    goals.forEach(g => { if (g.id === 'magic') score0 += 10 * (strikes - 1); });
  }
  // stack accumulation: "stacks up to N" / "extra stack (up to IV)" — sustained combat sits near max;
  // credit expected stacks at half value per extra stack (not applied to multi-strike actives)
  // stack accumulation — detected in SELF text only: enemy-debuff stack counts ("applies … stacks
  // up to N") must not multiply the character's own mods
  let stackN = 1, fullStacks = false;
  const sm = text.match(/stacks?\s*(?:up\s+to|\(up\s+to)\s*(\d+|two|three|four|five|six|VI|IV|V|III|II)/i);
  const am = text.match(/activates\s+(\d+|two|three|four|five|six)\s+stacks/i);
  let xm = text.match(/stacks?[^.\n]{0,45}\(up\s+to\s+(\d+|VI|IV|V|III|II)\)/i);
  if (!sm && !am && !xm) {
    // self-buff stacked via a mixed enemy-applying sentence: "grants an extra stack of "X" (up to N)"
    // counts only when "X" is a buff the skill activates on the character
    const nm = condText.match(/extra\s+stack\s+of\s+"([^"]+)"[^.\n]{0,25}\(up\s+to\s+(\d+|VI|IV|V|III|II)\)/i);
    if (nm && new RegExp('activates\\s+"' + nm[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'i').test(text)) xm = [nm[0], nm[2]];
  }
  const R2N = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
  const toN = raw => parseInt(raw) || W2N[raw.toLowerCase()] || R2N[raw.toLowerCase()] || 1;
  if (am) { stackN = toN(am[1]); fullStacks = true; } // starts at max stacks — full credit
  else if (sm) stackN = toN(sm[1]);
  else if (xm) stackN = toN(xm[1]);
  if (stackN > 1 && strikes === 1) {
    const mult = fullStacks ? Math.min(stackN, 5) : Math.min(1 + 0.5 * (stackN - 1), 3);
    for (const k in mods) mods[k] *= mult;
  }
  const { s: base, why } = scoreMods(mods, goals);
  let score = base + score0;
  // enemy debuffs: inverted sign, half weight, capped ±12 per stat — they're temporary and single-target
  // (summon-conditioned enemy debuffs pay only when the build has the summoner)
  const enemyParts = { free: [], cond: [] };
  enemyText.split(/(?<=\.)\s+/).forEach(sen => { (SUMMON_COND.test(sen) ? enemyParts.cond : enemyParts.free).push(sen); });
  const eMods = extractMods(enemyParts.free.join(' '));
  if (enemyParts.cond.length) {
    const cm = extractMods(enemyParts.cond.join(' '));
    let cv = 0;
    goals.forEach(g => { for (const k in (g.statW || {})) { if (cm[k]) cv += Math.max(-12, Math.min(12, -cm[k] * g.statW[k] * 0.5)); } });
    const ent = (enemyParts.cond.join(' ').match(/\b(boulder|crystal|totem|spike|clone)s?\b/i) || [, 'boulder'])[1].toLowerCase();
    if (cv > 0) needBonus.push({ key: 'summon:' + ent, val: Math.round(cv * 10) / 10 });
  }
  goals.forEach(g => {
    for (const k in (g.statW || {})) {
      const v = eMods[k]; if (!v) continue;
      const contrib = Math.max(-12, Math.min(12, -v * g.statW[k] * 0.5));
      score += contrib;
      if (contrib > 0) why.push({ k, v, contrib, enemy: true });
    }
  });
  const isPassive = /Passive/i.test(sk.type || '');
  // ranged builds: melee-delivery actives (charges into the target, adjacent-tile strikes) are
  // counterproductive — a ranged character keeps distance. Detected from the skill's own delivery text.
  if (!isPassive && ['bow', 'crossbow', 'sling'].includes(weaponCls) && tree.cat !== 'weapon') {
    const meleeDelivery = /performs?\s+a\s+charge|charge\s+towards|delivers?\s+a\s+strike|adjacent\s+targets?|strikes?\s+to\s+(?:two|three)\s+adjacent\s+tiles/i.test(stateText);
    if (meleeDelivery) return { n: sk.n, tid, treeLabel: tree.label, t: sk.t || 0, type: sk.type || '', score: 0, spellBonus: 0, isSpell: false, isActive: true, hasSustain: false, defLayers: [], applies: [], consumes: [], why: 'melee delivery — excluded for ranged', isStance: false, isTactic: false };
  }
  if (isPassive) score *= 1.15; // always-on, no energy/slot cost
  // multi-strike attacks: 2-3 strikes per action ≈ action-economy multiplier + proc engine
  if (strikes > 1 && !/Spell/i.test(sk.type || '')) {
    goals.forEach(g => {
      if (g.id === 'crit') score += 8 * (strikes - 1); // more rolls = more crit fishing (spells crit via Miracle, not Crit Chance)
    });
  }
  // keyword credit for goal states the skill applies without an explicit % (e.g. "Stuns the target")
  const applies = [], consumes = [];
  for (const st in STATE_APPLY) {
    if (STATE_APPLY[st].test(stateText)) applies.push(st);
    if (STATE_COND[st].test(stateText)) consumes.push(st);
  }
  if (strikes > 1) applies.push('multi-hit');
  else if (typeof isAoE !== 'undefined' && isAoE) applies.push('multi-hit'); // AoE procs on-hit passives per enemy
  // summoners and buff activators satisfy other skills' conditions
  const smm = stateText.match(/summons?\s[^.\n]{0,60}\b(boulder|crystal|totem|spike|clone)s?\b/i);
  if (smm) applies.push('summon:' + smm[1].toLowerCase());
  let bam; const bre = /activates\s+"([^"]+)"/ig;
  while ((bam = bre.exec(stateText))) applies.push('buff:' + bam[1].toLowerCase());
  // on-strike stacking passives (Arcane Might, Body and Spirit…) charge faster off multi-hits
  if (/stacks?\s+up\s+to/i.test(stateText) && /(strikes|shots|dealing|each\s+hit)/i.test(stateText)) consumes.push('multi-hit');
  const CC_STATES = ['stun', 'daze', 'stagger', 'knockback', 'immobilize', 'knockdown'];
  goals.forEach(g => {
    const st = GOAL2STATE[g.id];
    if (st && applies.includes(st) && !mods[{ stun: 'st', daze: 'dz', stagger: 'sg', knockback: 'kb', bleed: 'bl', immobilize: 'im' }[g.id]]) score += 10;
    if (g.id === 'control') score += 5 * applies.filter(a => CC_STATES.includes(a)).length;
    if (g.id === 'onhit') {
      const types = new Set();
      let xm2; XD_GRANT.lastIndex = 0;
      while ((xm2 = XD_GRANT.exec(stateText))) types.add(xm2[1].toLowerCase());
      score += 16 * types.size; // grants elemental damage to every strike — the core of the archetype
      if (sk.fx && sk.fx.xdmg) score += 10 * Object.keys(sk.fx.xdmg).length;
      if (/stacks?\s+up\s+to/i.test(stateText) && types.size) score += 8; // stacking on-hit → snowball
    }
  });
  const whyTop = why.sort((a, b) => b.contrib - a.contrib).slice(0, 2)
    .map(w => (w.enemy ? 'enemy ' : '') + (w.v > 0 ? '+' : '') + Math.round(w.v * 10) / 10 + '% ' + (w.k === 'wd' && typeof convWD !== 'undefined' && convWD ? 'dmg/action (multi-hit equiv)' : ({ wd: 'Weapon Dmg', cc: 'Crit Chance', ce: 'Crit Eff', dg: 'Dodge', sg: 'Stagger', dz: 'Daze', st: 'Stun', kb: 'Knockback', bl: 'Bleed', im: 'Immobilize', dt: 'Dmg Taken', bc: 'Block', mp: 'Magic Power', cd: 'Cooldowns', ed: 'Energy Drain', ld: 'Life Drain', er: 'Energy Resto', acc: 'Accuracy', ap: 'Armor Pen', ad: 'Armor Dmg', fum: 'Fumble', co: 'Counter', bpd: 'Bodypart Dmg' }[w.k] || w.k)));
  // sustain loops (community-verified as what makes top builds work): event-driven energy
  // replenishment and cooldown reduction — valuable for EVERY build, scaled by trigger frequency
  const SUSTAIN = /replenish(?:es)?\s+[\d{]+.*?energy|restores?\s+[\d{]+%?\s*(?:of\s+)?(?:max(?:imum)?\s+)?energy|reduces?\s+(?:the\s+ability\s+tree'?s?\s+|all\s+|its\s+)?cooldowns?\s+(?:of|by|duration)/i;
  if (SUSTAIN.test(text) && !(/Spell/i.test(sk.type || '') && !goals.some(g => g.id === 'magic'))) {
    const freq = /(?:each|every|per)\s+(?:strike|hit|shot|attack|blocked|dodge|counter)|strikes?\s+grant/i.test(text) ? 1.5
      : /kill|dying|death/i.test(text) ? 0.7 : 1;
    score += 9 * freq;
    whyTop.push('sustain loop');
  }
  let spellBonus = 0;
  if (spellTrig) { const sm2 = extractMods(spellTrig); spellBonus = scoreMods(sm2, goals).s; if (isPassive) spellBonus *= 1.15; }
  // defensive layers this skill contributes to (dodge / block / armor / CC-resist) — used by the
  // search to reward complementary coverage and diminish same-layer stacking
  const DEFL = { dg: 'dodge', bc: 'block', bp: 'block', bpr: 'block', dt: 'armor', phr: 'armor', ctr: 'ccres', fort: 'ccres' };
  const defLayers = [];
  for (const k in mods) { if (DEFL[k] && (INVGOOD[k] ? mods[k] < 0 : mods[k] > 0) && !defLayers.includes(DEFL[k])) defLayers.push(DEFL[k]); }
  const whyArr = whyTop;
  if (strikes > 1) whyArr.unshift(strikes + ' hits per action');
  else if (stackN > 1) whyArr.push('×' + stackN + ' stacks');
  return { n: sk.n, tid, treeLabel: tree.label, t: sk.t || 0, type: sk.type || '', score: Math.round(score * 10) / 10, spellBonus: Math.round(Math.max(0, spellBonus) * 10) / 10, needBonus, isSpell: /Spell/i.test(sk.type || ''), isActive: !isPassive, hasSustain: SUSTAIN.test(text), defLayers, applies, consumes, why: whyArr.join(' · '), isStance: /Stance/i.test(sk.type || ''), isTactic: /Tactic/i.test(sk.type || '') };
}

function eligibleTreeIds(D, weaponCls, offMode) {
  const ids = [];
  const wTree = CLS2TREE[weaponCls];
  for (const tid of D.treeOrder) {
    const tr = D.trees[tid]; if (!tr || !tr.skills.length) continue;
    if (tr.cat === 'weapon') {
      if (tid === wTree) ids.push(tid);
      else if (tid === 'shields' && offMode === 'shield') ids.push(tid);
      else if (tid === 'dual_wielding' && offMode === 'dual') ids.push(tid);
      // other weapon trees excluded: wiki-verified — weapon-tree passives require that weapon equipped
    } else ids.push(tid); // utility + magic: global passives/spells
  }
  return ids;
}

function synergyBonus(picked) {
  let bonus = 0; const notes = [];
  const states = {};
  picked.forEach(p => p.applies.forEach(st => { (states[st] = states[st] || { a: [], c: [] }).a.push(p.n); }));
  picked.forEach(p => p.consumes.forEach(st => { (states[st] = states[st] || { a: [], c: [] }).c.push(p.n); }));
  for (const st in states) {
    const { a, c } = states[st];
    const validC = c.filter(n => a.some(x => x !== n));
    if (a.length && validC.length) {
      bonus += 12 * Math.min(a.length, validC.length, 3);
      notes.push(validC[0] + ' feeds on ' + st + ' from ' + a.filter(x => x !== validC[0]).slice(0, 2).join(', '));
    }
  }
  // only one Stance / one Tactic can be active at a time — penalize hoarding
  const nSt = picked.filter(p => p.isStance).length, nTa = picked.filter(p => p.isTactic).length;
  if (nSt > 1) bonus -= 25 * (nSt - 1);
  if (nTa > 1) bonus -= 25 * (nTa - 1);
  return { bonus, notes };
}

function beamSearch(pool, poolAll, budget, synW, freeTiers, maxSpells) {
  if (!pool.length || budget <= 0) return { picks: [], notes: [] };
  if (maxSpells === undefined) maxSpells = Infinity;
  const W = 24;
  pool = pool.slice(0, 48);
  pool.forEach((e, i) => { e._id = i; });
  // best-first enabler candidates per tree+tier (chain rule: tier T needs every tier below)
  const enab = {};
  poolAll.forEach(e => { ((enab[e.tid] = enab[e.tid] || {})[e.t] = enab[e.tid][e.t] || []).push(e); });
  const scoreSum = arr => {
    const hasSpell = arr.some(p => p.isSpell);
    const states = new Set();
    arr.forEach(p => p.applies.forEach(a => states.add(a)));
    return arr.reduce((a, p) => {
      let s = p.score + (hasSpell ? (p.spellBonus || 0) : 0);
      (p.needBonus || []).forEach(nb => { if (states.has(nb.key)) s += nb.val; });
      return a + s;
    }, 0);
  };
  const synOf = picks => {
    let bonus = 0; const st = {};
    picks.forEach(p => { p.applies.forEach(x => (st[x] = st[x] || [[], []])[0].push(p.n)); p.consumes.forEach(x => (st[x] = st[x] || [[], []])[1].push(p.n)); });
    for (const k in st) {
      const [a, c] = st[k];
      // a consumer needs an applier that is a DIFFERENT skill
      const validC = c.filter(n => a.some(x => x !== n)).length;
      if (validC) bonus += 12 * Math.min(a.length, validC, 3);
    }
    let nSt = 0, nTa = 0;
    picks.forEach(p => { if (p.isStance) nSt++; if (p.isTactic) nTa++; });
    if (nSt > 1) bonus -= 25 * (nSt - 1);
    if (nTa > 1) bonus -= 25 * (nTa - 1);
    // energy economy: a rotation of many actives needs event-driven sustain to keep running
    const act = picks.filter(p => p.isActive).length;
    const sus = picks.filter(p => p.hasSustain).length;
    bonus -= Math.max(0, act - 5 - 2 * sus) * 7;
    // defensive layering: complementary layers compound, stacking one layer has diminishing returns
    const layers = {};
    picks.forEach(p => (p.defLayers || []).forEach(l => { layers[l] = (layers[l] || 0) + 1; }));
    const lk = Object.keys(layers);
    lk.forEach(l => { if (layers[l] > 2) bonus -= 7 * (layers[l] - 2); });
    if (lk.length >= 2) bonus += 6 * (lk.length - 1);
    // proc-loop depth: consumer that itself applies another consumed state compounds (A→B→C)
    for (const k in st) {
      const [, c] = st[k];
      c.forEach(cn => {
        const p = picks.find(x => x.n === cn);
        if (!p) return;
        p.applies.forEach(y => { if (y !== k && st[y] && st[y][1].some(n2 => n2 !== cn)) bonus += 8; });
      });
    }
    return bonus;
  };
  const enablersFor = (c, names, tiersHave) => {
    const ens = [];
    for (let t = 1; t < c.t; t++) {
      if (tiersHave[c.tid] && tiersHave[c.tid][t]) continue;
      const list = (enab[c.tid] || {})[t] || [];
      let en = null;
      for (const e of list) { if (e.n !== c.n && !names.has(e.n) && !ens.some(x => x.n === e.n)) { en = e; break; } }
      if (!en) return null;
      ens.push(en);
    }
    return ens;
  };
  const tiers0 = {};
  for (const tid in freeTiers) { tiers0[tid] = {}; freeTiers[tid].forEach(t => { tiers0[tid][t] = 1; }); }
  let beam = [{ picks: [], names: new Set(), tiers: tiers0, used: 0, sp: 0, total: 0 }];
  for (let step = 0; step < budget; step++) {
    const next = [];
    const seen = new Set();
    for (const st of beam) {
      next.push(st);
      if (st.used >= budget) continue;
      for (const c of pool) {
        if (st.names.has(c.n)) continue;
        const ens = enablersFor(c, st.names, st.tiers);
        if (ens === null) continue;
        const cost = 1 + ens.length;
        if (st.used + cost > budget) continue;
        const spAdd = ens.concat([c]).filter(e => e.isSpell).length;
        if (st.sp + spAdd > maxSpells) continue;
        const picks = st.picks.concat(ens, [c]);
        const key = picks.map(p => p.n).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const names = new Set(st.names);
        const tiers = {};
        for (const k in st.tiers) tiers[k] = Object.assign({}, st.tiers[k]);
        ens.concat([c]).forEach(e => { names.add(e.n); (tiers[e.tid] = tiers[e.tid] || {})[e.t] = 1; });
        next.push({ picks, names, tiers, used: st.used + cost, sp: st.sp + spAdd, total: scoreSum(picks) + synOf(picks) * synW });
      }
    }
    next.sort((a, b) => b.total - a.total);
    beam = next.slice(0, W);
  }
  const best = beam[0];
  const syn = synergyBonus(best.picks);
  return { picks: best.picks, notes: syn.notes, total: best.total };
}

function itemList(D, slot, weaponCls, offMode) {
  if (slot === 'main') { const f = CLS2FILE[weaponCls]; return D.weapons[f].items.map(i => Object.assign({ _cls: weaponCls }, i)); }
  if (slot === 'off') {
    if (offMode === 'shield') return D.armor.shields.items.map(i => Object.assign({ _cls: 'shield' }, i));
    if (offMode === 'dual') { const f = CLS2FILE[weaponCls]; return D.weapons[f].items.map(i => Object.assign({ _cls: weaponCls }, i)); }
    return [];
  }
  const map = { head: 'headgear', chest: 'chestpieces', gloves: 'gloves', belt: 'belts', boots: 'boots', cloak: 'cloaks' };
  if (map[slot]) return D.armor[map[slot]].items;
  if (slot === 'amulet') return D.amulets;
  if (slot === 'ring') return D.rings;
  if (slot === 'ammo') { const m = { bow: 'arrows', crossbow: 'bolts', sling: 'bullets' }[weaponCls]; return m ? D.ammo[m] : []; }
  return [];
}

function scoreItem(item, goals) {
  let s = 0;
  const mods = item.s || {};
  goals.forEach(g => {
    for (const k in (g.statW || {})) { if (mods[k]) s += mods[k] * g.statW[k]; }
    if (g.dmgW && item.d) s += Object.values(item.d).reduce((a, b) => a + b, 0) * g.dmgW;
    if (g.xdW && item.d) { for (const t in item.d) { if (!PHYS_D[t]) s += item.d[t] * g.xdW; } }
    if (g.protW && item.prot) s += item.prot * g.protW;
  });
  return s;
}

function gearStages(D, goals, weaponCls, offMode, level) {
  const slots = ['main', 'off', 'head', 'chest', 'gloves', 'boots', 'belt', 'cloak', 'amulet', 'ring', 'ammo'];
  // tier availability tracks character level (merchants/loot scale): T2 by ~5, T3 by ~10, T4 by ~15, T5 by ~20+
  const tierCap = lv => lv < 5 ? 1 : lv < 10 ? 2 : lv < 15 ? 3 : lv < 20 ? 4 : 5;
  const cap = tierCap(level || 30);
  const stages = [
    { id: 'early', label: 'EARLY (Tier 1–2)', maxT: Math.min(2, cap) },
    { id: 'mid', label: 'MID (Tier 3)', maxT: Math.min(3, cap) },
    { id: 'late', label: 'LATE (Tier ' + Math.min(4, cap) + '–' + cap + ')', maxT: cap }
  ];
  return stages.map(st => {
    const picks = [];
    const gear = {};
    slots.forEach(slot => {
      const list = itemList(D, slot, weaponCls, offMode).filter(i => i.t <= st.maxT);
      if (!list.length) return;
      const ranked = list.map(i => ({ i, s: scoreItem(i, goals) })).sort((a, b) => b.s - a.s || b.i.t - a.i.t);
      // prefer items that actually contribute; fall back to best late protection/damage, not first-listed junk
      const top = ranked[0].s > 0 ? ranked : list.map(i => ({ i, s: (i.d ? Object.values(i.d).reduce((a, b) => a + b, 0) : 0) + (i.prot || 0) * 3 + (i.t || 0) * 2 })).sort((a, b) => b.s - a.s);
      const pick = top[0].i;
      picks.push({ slot, n: pick.n, t: pick.t, uniq: pick.r === 'U', cls: pick.cls });
      if (slot === 'ring') { gear.ring1 = pick.n; if (top[1]) { gear.ring2 = top[1].i.n; } }
      else gear[slot] = pick.n;
    });
    // weapon enchant: scored from the same goal weights over the enchant's own stats/damage
    let ench = null;
    const wench = (D.ench && D.ench.weapon) || [];
    if (wench.length) {
      const er = wench.map(e => ({ e, s: scoreItem(e, goals) })).sort((a, b) => b.s - a.s);
      if (er[0].s > 0) { ench = er[0].e.n; picks.push({ slot: 'enchant', n: er[0].e.n + ' (' + er[0].e.desc + ')' }); }
    }
    return { id: st.id, label: st.label, picks, gear, ench };
  });
}

function composition(picks, wTree) {
  const byTree = {};
  picks.forEach(p => { byTree[p.tid] = (byTree[p.tid] || 0) + 1; });
  const trees = Object.keys(byTree).sort((a, b) => byTree[b] - byTree[a]);
  const wPts = byTree[wTree] || 0;
  const total = picks.length || 1;
  const offMeta = trees.length >= 3 && wPts / total < 0.5;
  return { byTree, trees, offMeta };
}

export function findBuilds({ D, evalExpr, weaponCls, offMode, goalIds, level, charId }) {
  const goals = GOALS.filter(g => goalIds.includes(g.id));
  if (!goals.length) return { error: 'Pick at least one goal.' };
  const ch = D.chars.find(c => c.id === charId) || D.chars[0];
  const { attrs, order } = recommendAttrs(goals, ch, level);
  const wTree = CLS2TREE[weaponCls];
  const treeIds = eligibleTreeIds(D, weaponCls, offMode);
  const free = ((ch.trait && ch.trait.free_skills) || []).concat((((D.trees.survival || {}).skills) || []).filter(x => x.free).map(x => x.n));
  const budget = level + 1; // 2 AP at level 1, +1 per level-up
  // physical builds keep at most 2 spells (utility splash); magic-focused builds are uncapped
  const maxSpells = goals.some(g => g.id === 'magic') ? Infinity : 2;

  // gear first: the recommended late-game chest's armor class gates conditional skill bonuses
  const stages = gearStages(D, goals, weaponCls, offMode, level);
  const lateChest = (stages[2].picks.find(p => p.slot === 'chest') || {});
  const chestCls = lateChest.cls || null;

  let all = [];
  const freeTiers = {};
  treeIds.forEach(tid => {
    const tr = D.trees[tid];
    tr.skills.forEach(sk => {
      if (free.includes(sk.n) || sk.free) { (freeTiers[tid] = freeTiers[tid] || []).push(sk.t || 1); return; }
      all.push(skillEntry(sk, tid, tr, goals, attrs, evalExpr, chestCls, weaponCls, offMode));
    });
  });
  const poolAll = all.slice().sort((a, b) => b.score - a.score); // full pool for chain enablers
  all = all.filter(e => {
    const potential = e.score + (e.spellBonus || 0) + (e.needBonus || []).reduce((a, b) => a + b.val, 0);
    return e.score >= 5 || potential >= 8;
  }).sort((a, b) => (b.score + (b.spellBonus || 0)) - (a.score + (a.spellBonus || 0))).slice(0, 70);
  const attrLabels = { str: 'STR', agi: 'AGI', prc: 'PRC', vit: 'VIT', wil: 'WIL' };
  const attrLine = ['str', 'agi', 'prc', 'vit', 'wil'].filter(k => attrs[k] > ch.stats[k]).sort((a, b) => (attrs[b] - ch.stats[b]) - (attrs[a] - ch.stats[a]))
    .map(k => attrLabels[k] + ' ' + ch.stats[k] + '→' + attrs[k]).join(' · ');

  const mkVariant = (name, pool, synW, avoid) => {
    const p2 = avoid ? pool.map(e => Object.assign({}, e, { score: e.score * (avoid.has(e.n) ? 0.35 : 1) })) : pool;
    const res = beamSearch(p2, poolAll, budget, synW, freeTiers, maxSpells);
    if (!res.picks.length) return null;
    const comp = composition(res.picks, wTree);
    const ordered = res.picks.slice().sort((a, b) => (a.t - b.t) || (b.score - a.score));
    return {
      name, offMeta: comp.offMeta,
      treesLine: comp.trees.map(t => (D.trees[t] ? D.trees[t].label : t) + ' ×' + comp.byTree[t]).join(' · '),
      score: Math.round(res.total || ordered.reduce((a, p) => a + p.score, 0)),
      skills: ordered.map((p, i) => ({ ord: i + 1, n: p.n, tier: p.t, tree: p.treeLabel, type: p.type, why: p.why })),
      notes: res.notes,
      attrLine, attrs, attrOrder: order,
      stages,
      alloc: { str: attrs.str - ch.stats.str, agi: attrs.agi - ch.stats.agi, prc: attrs.prc - ch.stats.prc, vit: attrs.vit - ch.stats.vit, wil: attrs.wil - ch.stats.wil },
      skillsByTree: (() => { const o = {}; ordered.forEach(p => { (o[p.tid] = o[p.tid] || []).push(p.n); }); return o; })(),
      _key: ordered.map(p => p.n).sort().join('|')
    };
  };

  const variants = [];
  const rejected = [];
  // reject near-duplicates (≥80% shared skills) — but remember them as fallbacks
  const simTo = (v, x) => {
    const names = v._key.split('|');
    const xNames = new Set(x._key.split('|'));
    return names.filter(n => xNames.has(n)).length / Math.max(names.length, xNames.size);
  };
  const push = v => {
    if (!v) return;
    let worst = 0;
    for (const x of variants) worst = Math.max(worst, simTo(v, x));
    if (worst >= 0.8) { v._sim = worst; rejected.push(v); return; }
    variants.push(v);
  };
  push(mkVariant('OPTIMAL', all, 1));
  // classic: weapon tree first — pool restricted to weapon/dual/shield trees + utility (no magic)
  push(mkVariant('CLASSIC', all.filter(e => D.trees[e.tid].cat !== 'magic'), 1));
  // off-meta: diversity-forced — skills already used by OPTIMAL are worth less, so the search
  // must find a structurally different core (not the same build minus one skill)
  if (variants[0]) {
    const used = new Set(variants[0]._key.split('|'));
    push(mkVariant('OFF-META', all, 1, used));
  }
  // synergy-max: triple weight on state-combo chains, also avoiding the shared utility core
  const usedAll = new Set();
  variants.forEach(v => v._key.split('|').forEach(n => usedAll.add(n)));
  push(mkVariant('COMBO CHAINS', all, 3, usedAll.size ? usedAll : undefined));

  // adaptive fallback: never show a single lonely build if a merely-similar alternative exists
  if (variants.length < 2 && rejected.length) {
    rejected.sort((a, b) => a._sim - b._sim);
    if (rejected[0]._sim < 0.97) variants.push(rejected[0]);
  }

  return { variants: variants.slice(0, 4), poolSize: all.length, chestCls };
}
