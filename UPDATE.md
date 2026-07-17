# Stoneshard Calculator — data update guide

> **Note for extractors:** `build-engine.js` (Build Finder) scores skills by parsing their `dyn`/`desc` text with regex patterns (stat phrases like "+X% Crit Chance", trigger clauses "each strike/upon kill", state words stagger/daze/stun, "stacks up to N", "delivers two strikes", energy-replenish clauses). When extracting new skills, keep wiki wording VERBATIM in `dyn`/`desc` — paraphrasing breaks scoring. Fields used: `n`, `t`, `type`, `dyn`/`desc`, `free`.

All game data is baked into `data/*.json`, extracted from the official wiki (https://stoneshard.com/wiki).
Images are **hotlinked** from `https://stoneshard.com/wiki/images/...` — nothing hosted here.

## To update after a patch
Re-extract the data from the wiki pages listed below, diffing against `$meta.game_version` in each file. Each JSON file records its source pages and schema, so any contributor (or tooling) can refresh a single file at a time.

## Data files & their source pages
| File | Source wiki pages |
|---|---|
| `data/mechanics.json` | Strength, Agility, Perception, Vitality, Willpower, Level, Attributes_&_Stats, Combat_Formulas, Health, Energy, Experience |
| `data/characters.json` | Velmir, Jorgrim, Arna, Dirwin, Jonna, Verren, Mahir, Leosthenes, Hilda, Traits |
| `data/weapons.json` | Weapons + per-type list pages (Swords, Axes, Maces, Daggers, Two-Handed_*, Spears, Bows, Crossbows, Staves) |
| `data/armor.json` | Armor + per-slot list pages (Helmets, Chestpieces, Gloves, Boots, Shields, Cloaks, Belts) |
| `data/jewelry.json` | Jewelry (Rings, Amulets) |
| `data/skills.json` | All 22 `*_(skill_tree)` pages |
| `data/enchantments.json` | Enchantments |
| `data/consumables.json` | Potions, Food, Beverages, Drugs (stat-affecting only) |
| `data/enemies.json` | Enemies + individual enemy pages (curated set) |
| `data/status_effects.json` | Status_Effects + individual condition `/Tooltip` pages (verbatim `mods`; `unverified:true` marks unconfirmed) |

## Offline icons (optional, recommended for a public site)
By default images hotlink from stoneshard.com. To self-host them instead:
1. `node mirror-icons.mjs` (Node 18+; downloads every icon referenced in `data/` into `images/`, ~150ms apart)
2. Commit the `images/` folder (including the `images/.mirrored` marker file) and push.
The calculator detects `images/.mirrored` on load and switches to local icons automatically; without it, it hotlinks the wiki as before. Re-run the script after any data update.

## Conventions
- Item stat keys use the same snake_case vocabulary as `mechanics.json` (e.g. `weapon_damage_pct`, `crit_chance_pct`, `protection`).
- Every item carries `img`: absolute wiki image URL, and `url`: its wiki page.
- `$meta.game_version` records the wiki's "Current Version" at extraction time.
- Fields prefixed `_verify` are unconfirmed and must be resolved before relying on them.
- `data/mechanics.json → calibration` holds baseline constants (base HP/Energy at lvl 1, per-level growth, base accuracy/crit/fumble/etc). The wiki does not publish these; they are community-consensus values applied **relative to the all-10s creation baseline**. If in-game numbers differ after a patch, correct them here — the calculator reads them at load.

## Update procedure (per patch)
1. Check `https://stoneshard.com/wiki/Version_History` for the new version number.
2. For each data file whose source pages changed, re-extract the tables and overwrite the file, bumping `$meta.game_version`.
3. Item stat tables live on the list pages (Swords, Helmets, …) — one table per weapon family/armor class, columns map 1:1 to schema keys.
4. Skill data: each `{Tree}_(skill_tree)` page has full tooltip tables; the pages also have a hidden "Show formulas" mode with exact attribute-scaling formulas if deeper accuracy is wanted.
5. Verify calibration constants in-game (create a character, read the character sheet at level 1, level once).
6. Reload `Stoneshard Calculator.dc.html` — no code changes needed unless new slots/mechanics were added.

## Extraction ledger (full-coverage roadmap)
Goal: every enemy, consumable, and item on the wiki, verbatim.

**Enemies — done (275, verbatim 0.9.4.x):** Full official Enemies-navbox roster extracted verbatim, covering every page that publishes a stat block:
- Wildlife/beasts (fauna incl. huntable game & birds): Deer, Saiga, Horse, Pig, Sheep, Cow, Fox, Rabbit, Squirrel, Hedgehog, Cat, Dog, Chicken, Rooster, Tit, Bunting, Raven, Pigeon, Sparrow, Swallow, Thrush, Wren, Jay, Seagull, Mallard, Owl, Bat Swarm, Bear, Boar, Bison, Spiderling, Crawler (+ Broodmother/Burrow), Deathstinger Swarm/Hive, Rat Swarm, Harpy (+ Harpies Nest), Moose, Wolf, Feral Dog, Gulon, Young Troll, Manticore, Ancient Troll.
- Brigands (~90 incl. weapon variants): Goon/Enforcer/Thug/Henchman/Slinger/Heavy Slinger/Bonebreaker/Marauder/Turncoat/Deserter/Magistrate Deserter/Renegade/Robber Baron/Ringleader ×N variants, Brute, Madman, Rebel, Miner, Scout, Overseer, Poacher, Firestarter, Rabble-Rouser, Mancatcher, Raider, War Dog, Crook, Outlaw, Cutthroat, Prospector, Spelunker, Brigand Warlock/Geomancer/Electromancer/Pyromancer/Arcanist, Torturer, Hired Sorcerer ×2, Drummer, Ambusher, Beast Trapper, Rogue Knight, Banneret, Marksman, Magehunter, Paymaster, Wolfhound, Rogue Witchfinder, Duelist, Heavy Crossbowman.
- Undead (~70 incl. variants): Occultist, Wraith + Wraith Squire/Monk/Warrior/Sergeant/Cleric/Templar/Seer/Commander/Wraithbinder, Restless (+ Peasant/Guard/Brigand/Soldier/Hero variants), Necromancer, Archivist, Ghoul/Small/Large, Ghast/Accursed/Ancient, Risen (Recruit/Watchman/Archer/Bowman/Crossbowman/Monk/Priest/Squire/Sariant/Companion/Sergeant/Marshal/Chaplain/Knight-Brother/Guardsman ×N), Husk, Undertaker, Ritualist, Crypt Keeper, Mortician, Putrid Restless Soldier ×3, Spectral Herald.
- Proselytes / Vampire cult (~55): Matriarch, Zealot ×2, Ascended Archon, Flagellant, Cultist, Martyr/Dead Martyr, Sanguimage, Chosen, Juggernaut, Immolated, Abomination, Apostate, Reject, Harbinger, Outcast, Neophyte ×3, Disciple ×3, Seer, Toller, Adept ×2, Tormentor ×2, Blood Golem, Stone-Thrower, Brander, Fury, Executioner ×2, Amalgam ×2, Admonisher, Supplicant, Liturgist, Flesh Chunk/Mound, Wormbearer, Anmarrak, Fiend ×2, Saggul, Impaler, Girrud, Murkstalker, Thrall, Ecclesiarch, Chainbound, Unchained, Leech/Spitter/Bloodgorger Worm, Tentacle Arm, Apostle, Nakkatar, Cherub ×2, Anointed, Templar (Sword), Cursed Bell, Desecrator, Ritual Restless, Risen Axonian.
- The Hive (4): Rockeater Queen/Worker/Soldier/Hunter. Dummies: Straw Dummy (Medium/Armored). Bosses: Ascended Archon, Ancient Troll, Manticore.

Extraction was automated by fetching each official page and parsing the infobox with a schema-faithful parser (validated to reproduce existing curated entries exactly on all damage-relevant fields). Passive fauna carry Tier 0 and minimal stat blocks (still verbatim).

**Enemies — remaining (13 wiki stubs, cannot extract):** These pages exist but show **"Data does not exist"** with no stat block: Forest Viper, Aldor, Soul Well, Mana Crystal, Straw Dummy (base), and quest uniques Kromm, Barm, Will, Revon, Vyr, Halmar, Venn, Sverk. Skip until the wiki publishes their data.

Method: web_fetch the official `stoneshard.com/wiki/<Name>` page (NOT Fandom) — it returns the full block (HP, per-bodypart Protection, all resistances, defensive/offensive stats, attributes, XP). Extract into data/enemies.json with the existing schema.



**Status Effects / buffs & conditions:** data/status_effects.json holds the full 130-effect roster + 15 injuries (verbatim names from the Status_Effects index). Each detailed entry carries a verbatim wiki-sourced `mods` object; entries whose exact modifier values could not be confirmed verbatim carry `"unverified": true` and a note (kept for completeness, but their numbers must be confirmed against the effect's /Tooltip page before the calculator relies on them).

VERIFIED verbatim (33): Bleeding, Poisoning, Burning, Stun, Daze, Stagger, Confusion, Immobilization, Weakness, Pain, Battle Rage, Blood Oath, Vampiric Blood, Mark of the Feast, Seized Initiative, Initiative Loss, Mighty Swing, Fencer's Stance, Seal of Power, Seal of Pyromancy, Seal of Geomancy, Seal of Electromancy, Thirst for Battle, Starvation, Adrenaline Rush, Taking Aim, Blessing, Blood Craze, Offensive Tactic, Rampage, Hammer and Anvil, Suppression, Painful Stabs.

UNVERIFIED / documented but no published values (18): Satiety, Hunger, Terrible Hunger, Thirst, Terrible Thirst, Tiredness, Exhaustion, Weariness, Drunkenness, Hangover, Vomiting, Elusiveness, Massacre, Unwavering Stance, Apathy, Anxiety, Despair (+ Striker/Pikeman Stance requeued to roster). These are real effects whose exact modifier values are NOT published on the wiki (stub pages / old devlogs) — notes are descriptive only.

Finding: the ~82 remaining roster effects are overwhelmingly wiki STUBS with no published modifier values (psyche states, magical conditions like Stone Skin/Stone Armor, drug Aftermaths, injury tiers). All combat-relevant effects with published values are now extracted verbatim. Further verbatim gains require in-game datamining, not wiki fetches.

**Skills — second-pass audit (2026-07, vs current wiki tooltips):** Re-verified all 21 tree files against the live `*_(skill_tree)` pages by extracting each skill's Values tooltip (en/cd/range/type/modified-by/tier) and comparing to the JSON. Findings & fixes:
- **Electromancy fully re-extracted** — the tree was reworked since the 0.9.4.14 capture; the file had only 12 skills (2 unnamed placeholders). Restored the full current 14-skill roster verbatim (added Residual Charge, Short Circuit, Potential Difference, Unlimited Power; dropped obsolete Cellular Excitation/Superconductivity), with correct tiers/headers. `dyn` omitted (wiki no longer publishes per-skill formulas — no scaling invented; desc holds exact values).
- **Magic spell `dyn` base damage re-synced** (pyromancy, geomancy, arcanistics): the `dyn` formulas were stale while `desc` already matched current wiki. Corrected coefficients (e.g. Fire Barrage 7→6, Ring of Fire 14→12, Runic Boulder 6→4, Boulder Toss 14/7→12/6, Wormhole 10→8, Schism 9→11, Phantasm 26→22).
- **Weapon/utility value fixes:** maces Concussion (trigger + −6/−8/−10, 6t, ×3), ranged Hunter's Mark (+10/+3/+10, −10s), dual_wielding Berserk Tradition (−0.3/+4/+1/+3/+10 & fx), swords2h Parry (+20% BP Recovery)/Feast of Steel (+2.5% Crit)/Heroic Charge (trimmed removed clauses), shields Retaliation (−10% WD), armored_combat Brace for Impact! (−25% CD; dropped removed Control/Move Res).
- Header (en/cd/range), `dyn` base-damage, and `fx` applied-mod audits all pass clean afterward. Only residual: ranged Taking Aim shows +59% vs +60% Accuracy — a mechanic that scales with learned abilities (left as-is; both desc and dyn note the scaling).

**Consumables:** data/consumables.json currently holds stat-affecting potions/food/beverages/drugs + psyche states. Remaining: full Food, Beverages, Potions, Drugs, Medicine, Scrolls list pages (including non-stat items) if full coverage is desired.

**Items:** weapons (12 classes), armor (7 slots incl. cloaks), rings, amulets are complete from list pages. Remaining: Ammunition, Tools & Traps, Artifacts.
