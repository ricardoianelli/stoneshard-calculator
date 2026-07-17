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

**Enemies — done (60, verbatim 0.9.4.x):** Goon (Club), Goon (Cleaver), Goon (Flail), Rebel, Brute, Madman, Henchman (Axe), Henchman (Mace), Henchman (Flail), War Dog, Thug (Two-Handed Axe), Thug (Two-Handed Sword), Restless Peasant (Dagger), Restless Peasant (Axe), Restless Peasant (Pitchfork), Restless Guard (Sword), Restless Brigand, Risen Watchman, Risen Recruit (Sword), Wraith Squire, Risen Guardsman (Sword), Ghoul (upgraded full-res), Ghast, Husk, Mortician, Wraith Warrior, Occultist, Undertaker, Flagellant, Cultist, Martyr, Sanguimage, Chosen, Juggernaut, Immolated, Abomination, Restless, Wraith, Wolf, Thug (Spear), Zealot (Spear), Necromancer (Staff), Matriarch, Boar, Harpy, Ghoul, Cutthroat, Deserter (Sword), Marksman, Crawler, Bear, Bison, Young Troll, Manticore, Ascended Archon, Ancient Troll (quest boss, 3000 HP), Marauder (Two-Handed Sword), Crawler Broodmother, Crawler Burrow (spawner), Crawler (full-res upgrade), Matriarch (full-res upgrade), Deserter (Sword, full block), Gulon (core stats verbatim; damage-type res pending full-page fetch).

**Enemies — remaining (official Enemies navbox, ~130+ pages):** The official navbox lists the full roster by category:
- Hostile Animals: Bat Swarm, Bear, Boar, Bison, Deathstinger Swarm, Feral Dog, Forest Viper, Gulon, Harpy, Moose, Rat Swarm, Spiderling, Wolf, Young Troll (+ Crawler/Broodmother ✓).
- Brigands (~45): Ambusher, Bonebreaker ×2, Beast Trapper, Banneret, Brigand Electromancer/Geomancer/Pyromancer/Warlock, Enforcer ×3, Crook, Cutthroat, Duelist, Deserter (Axe/Flail), Heavy Crossbowman, Hired Sorcerer ×2, Magehunter, Magistrate Deserter ×3, Mancatcher, Marauder (2H Axe/Mace), Marksman, Outlaw, Paymaster, Poacher, Renegade*, Ringleader ×4, Robber Baron ×3, Rogue Knight ×2, Turncoat ×4, Wolfhound.
- Undead (~70): Accursed/Ancient Ghast, Archivist, Crypt Keeper, Large/Small Ghoul, Putrid Restless Soldier ×3, Risen Axonian, Ritual Restless, Ritualist, Restless Soldier ×3, Risen Archer/Bowman/Crossbowman, Risen Companion ×3, Risen Guardsman (Mace/Spear/2H Axe), Risen Chaplain, Risen Knight-Brother ×3, Risen Marshal/Monk/Priest, Risen Recruit (Axe/Mace), Risen Sariant/Sergeant, Risen Squire ×3, Spectral Herald, Wraith + Wraithbinder/Cleric/Commander/Monk/Seer/Sergeant/Templar, Restless Hero, Restless Guard (Halberd/Spear), etc.
- Proselytes (~32): Adept ×2, Anmarrak, Apostate, Blood Golem, Brander, Dead Martyr, Fiend ×2, Girrud, Harbinger, Impaler, Leech Worm, Murkstalker, Outcast, Saggul, Tentacle Arm, Toller, Tormentor ×2, Wormbearer, Yagram.
- The Hive (4): Rockeater Queen/Hunter/Soldier/Worker. Spawners (4): Crawler Burrow ✓, Deathstinger Hive, Harpies Nest, Soul Well. Bosses: Manticore ✓, Ancient Troll ✓, Ascended Archon ✓. Quest uniques (~11): Barm, Desecrator, Halmar, Kromm, Revon, Sverk, Venn, Vyr, Will, etc. Summons/Dummies: Mana Crystal, Phantasm, Straw Dummy ×3.

* = pages that exist but show "Data does not exist" / stub with no stat block (e.g. Renegade) — cannot be extracted until the wiki fills them in.

Method: web_fetch the official `stoneshard.com/wiki/<Name>` page (NOT Fandom) — it returns the full block (HP, per-bodypart Protection, all 17 resistances, attributes, XP). Extract into data/enemies.json with the existing schema. Each fetch is token-heavy (navbox), so ~2-3 pages per batch.



**Status Effects / buffs & conditions:** data/status_effects.json holds the full 130-effect roster + 15 injuries (verbatim names from the Status_Effects index). Each detailed entry carries a verbatim wiki-sourced `mods` object; entries whose exact modifier values could not be confirmed verbatim carry `"unverified": true` and a note (kept for completeness, but their numbers must be confirmed against the effect's /Tooltip page before the calculator relies on them).

VERIFIED verbatim (33): Bleeding, Poisoning, Burning, Stun, Daze, Stagger, Confusion, Immobilization, Weakness, Pain, Battle Rage, Blood Oath, Vampiric Blood, Mark of the Feast, Seized Initiative, Initiative Loss, Mighty Swing, Fencer's Stance, Seal of Power, Seal of Pyromancy, Seal of Geomancy, Seal of Electromancy, Thirst for Battle, Starvation, Adrenaline Rush, Taking Aim, Blessing, Blood Craze, Offensive Tactic, Rampage, Hammer and Anvil, Suppression, Painful Stabs.

UNVERIFIED / documented but no published values (18): Satiety, Hunger, Terrible Hunger, Thirst, Terrible Thirst, Tiredness, Exhaustion, Weariness, Drunkenness, Hangover, Vomiting, Elusiveness, Massacre, Unwavering Stance, Apathy, Anxiety, Despair (+ Striker/Pikeman Stance requeued to roster). These are real effects whose exact modifier values are NOT published on the wiki (stub pages / old devlogs) — notes are descriptive only.

Finding: the ~82 remaining roster effects are overwhelmingly wiki STUBS with no published modifier values (psyche states, magical conditions like Stone Skin/Stone Armor, drug Aftermaths, injury tiers). All combat-relevant effects with published values are now extracted verbatim. Further verbatim gains require in-game datamining, not wiki fetches.

**Consumables:** data/consumables.json currently holds stat-affecting potions/food/beverages/drugs + psyche states. Remaining: full Food, Beverages, Potions, Drugs, Medicine, Scrolls list pages (including non-stat items) if full coverage is desired.

**Items:** weapons (12 classes), armor (7 slots incl. cloaks), rings, amulets are complete from list pages. Remaining: Ammunition, Tools & Traps, Artifacts.
