# Data schema (compact keys)

Item files: `data/weapons/*.json`, `data/armor/*.json`, `data/jewelry/*.json`.
Each item: `{ "n": name, "t": tier(1-5), "r": "C"|"U" (Common/Unique), "d": {damage}, "du": durability, "p": price, "s": {stat props} }`
Image URL (hotlinked, no hosting): `https://stoneshard.com/wiki/Special:FilePath/` + name with spaces→underscores + `.png`
Wiki URL: `https://stoneshard.com/wiki/` + name with spaces→underscores

## Damage type keys (`d`)
sl slashing · pi piercing · cr crushing · re rending · fi fire · fr frost · sh shock · po poison · ca caustic · ar arcane · un unholy · sa sacred · ps psionic

## Stat prop keys (`s`) — value is the number shown on the wiki (± sign preserved)
ap Armor Penetration % · ad Armor Damage % · bpd Bodypart Damage % · wd Weapon Damage %
bl Bleed Chance % · dz Daze % · st Stun % · sg Stagger % · kb Knockback % · im Immobilization %
bc Block Chance % · bp Block Power · bpr Block Power Recovery % · co Counter Chance %
acc Accuracy % · cc Crit Chance % · ce Crit Efficiency % · fum Fumble Chance %
sec Skills Energy Cost % · spec Spells Energy Cost % · cd Cooldowns Duration % · rng Bonus Range · vis Vision
mp Magic Power % · mic Miracle Chance % · mip Miracle Potency % · bfc Backfire Chance % · bfd Backfire Damage %
pyr/geo/ele/arc/ven/cry/ast/psi/chr — School Power %
hp Max Health · en Max Energy · hr Health Restoration % · er Energy Restoration % · he Healing Efficiency %
dg Dodge Chance % · ctr Control Resistance % · mvr Move Resistance % · fort Fortitude % · refl Damage Reflection %
dt Damage Taken % · ed Energy Drain % · ld Life Drain % · xp Experience Gain %
phr/slr/pir/crr/rer Physical/Slashing/Piercing/Crushing/Rending Res % · ntr Nature Res % · fir/frr/shr/por/car Fire/Frost/Shock/Poison/Caustic Res %
mgr Magic Res % · arr/unr/sar/psr Arcane/Unholy/Sacred/Psionic Res %
blr Bleed Res % · pnr Pain Res % · hgr Hunger Res % · inr Intoxication Res % · ftr Fatigue Res %
stl Stealth · noi Noise Produced % · lkp Lockpicking · mhe/ohe Main/Off-Hand Efficiency %
prot Protection (armor) · mhd/ohd flat hand damage

Armor extra fields: `slot` (head/chest/gloves/belt/boots/cloak/shield), `cls` (light/medium/heavy where wiki gives it).
Weapon extra fields: `hands` (1|2), `class` (sword/axe/.../bow/crossbow/sling/staff), `range` for ranged.

## Skill `dyn` field
Optional formula-templated description: `{expr}` holes using STR/AGL/PRC/VIT/WIL (e.g. `+{5+AGL+PRC}% Weapon Damage`). Source: each ability's wiki page, 'Show formulas'. Calculator shows the value at current attributes with the base (all-10s) in brackets.
