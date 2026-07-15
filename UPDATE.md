# Stoneshard Calculator — data update guide

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
