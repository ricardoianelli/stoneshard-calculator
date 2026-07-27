# Stoneshard Build Calculator

An unofficial, fan-made character build calculator for [Stoneshard](https://stoneshard.com/) (v0.9.4 "Rags to Riches").

**[Try it here](https://stoneshard-calculator.com/)** 

![Stoneshard Build Calculator](https://stoneshard.com/wiki/images/thumb/d/d2/Stoneshard.png/150px-Stoneshard.png)

## What it does

- Pick any of the 9 playable characters (base stats, traits, and starting gear included)
- Set your level (1–30) and distribute stat points exactly like in game — threshold bonuses at 15/20/25/30 included
- Equip weapons, armor, jewelry, and shields from the full item database (~700 items), with per-slot enchantments and durability
- Learn abilities across all skill trees; passives and stances feed into your stats, and ability descriptions show their real values computed from your attributes
- Full character-sheet stat panel mirroring the in-game screen (offense, defense, magic, resistances)
- Damage preview vs. a roster of enemies: per-attack normal/crit damage, effect chances (bleed, daze, stun…), hit chance, and XP for the kill
- Toggleable buffs (potions, food, drugs, psyche states), character trait counters, build pinning with stat deltas, a saved-build library, and shareable build links
- **Build Finder**: pick a weapon class, off-hand mode, level, and 1–3 focus goals (damage, crit, evasion, CC types, sustain…) — a deterministic beam search over the verbatim wiki data proposes complete builds (skills in learn order with tier-chain enablers, landmark-aware attribute allocation, early/mid/late gear per slot, synergy notes) and applies them to the calculator in one click

## Data & accuracy

All game data is extracted from the [official Stoneshard wiki](https://stoneshard.com/wiki/Stoneshard_Wiki) into plain JSON files under `data/`. Core formulas follow the wiki's Combat Formulas and attribute pages, cross-checked against real in-game character sheets. Known approximations are documented in `data/mechanics.json` and flagged `_verify`/`_xp_estimated` in the data.

Item and skill icons are loaded from the wiki. To self-host them instead, run `node mirror-icons.mjs` (see `UPDATE.md`).

## How the project works

It's a **static site with no build step**. The whole app is a single HTML file that fetches JSON data at runtime and renders with React.

| Piece | What it is |
| --- | --- |
| `Stoneshard Calculator.dc.html` | The app: UI, state, and all the stat/damage math. React + a tiny in-house template engine. |
| `support.js` | The template engine (`<sc-for>`, `<sc-if>`, `{{ expr }}`) and CDN loader for React/Babel. |
| `build-engine.js` | The **Build Finder** — a deterministic beam search that proposes complete builds from the data. |
| `save-editor.js` | Import/export of in-game save files. |
| `data/**/*.json` | All game data — characters, items, enemies, mechanics, and **skill trees**. Nothing is hard-coded in the app. |

The app loads `data/skills/index.json` first (the list of trees), then each tree file it points to. Everything the calculator knows about a skill — its stats, its unlock rule, its place in the tree, and what it depends on — lives in that tree's JSON file. **To change the game data you edit JSON; you almost never touch the HTML.**

## Skill trees — how to add or change a skill

Each tree is one file: `data/skills/<tree>.json`, registered in `data/skills/index.json`. A file has a `$meta` block (including the `grid` that defines the visual layout) and a flat `skills` array. Every skill looks like this:

```jsonc
{
  "id": "sudden_lunge",        // stable identifier — referenced by other skills' prerequisites
  "name": "Sudden Lunge",      // display name (must match the wiki, drives the icon)
  "row": 2, "col": 3,          // position in the tree grid (see below)
  "tier": 2,                   // treatise tier (1–4); 0 = innate
  "type": "Attack",            // Passive / Attack / Maneuver / Stance / Spell …
  "requires_all": ["not_this_time"],   // AND: every listed skill must be learned first
  "requires_any": [],                  // OR:  at least one of these must be learned first
  "unlock": {                          // how the skill becomes available (from its wiki page)
    "treatise": "Athletics II",
    "level": 10,                       // …or reach this level
    "pts": 8, "attrs": ["agi", "prc"]  // …or invest this many points across these attributes
  },
  "desc": "…", "dyn": "…", "fx": { … } // description text and passive stat effects
}
```

### Prerequisites (the tree links)

Prerequisites reference other skills **by their `id`**, not their name, so renaming a skill never breaks a link. There are exactly two lists:

- **`requires_all`** — an **AND**. You must have learned *every* skill in the list. Two or more entries render as a **junction diamond** (e.g. a capstone that needs both branches below it).
- **`requires_any`** — an **OR**. You must have learned *at least one* skill in the list.

You can use both together: `requires_all` for the mandatory parents *and* `requires_any` for a "one of these" group. A tier-1 skill with no prerequisites simply omits both.

Examples:

```jsonc
// OR — learnable after EITHER neighbour (Honed Edge, Swords)
{ "id": "honed_edge", "requires_any": ["gloat", "fencer_stance"] }

// AND junction — needs ALL THREE tier-1 skills (Rampage, Two-Handed Axes)
{ "id": "rampage", "requires_all": ["hooking_chop", "shieldbreaker", "dismember"] }
```

### Position (`row` / `col`) — the grid

The tree is a 4-column grid. `row` is the vertical band (1 at the top) and `col` is the horizontal slot (`1`–`4`; use half-steps like `1.5`, `2.5` to stagger a row between the columns above it). The app converts grid coordinates to pixels automatically, so you never deal with pixel positions — just say which row and column a skill sits in. `$meta.grid.rows` tells the app how many bands the tree has (it spaces them to fill the panel).

### Adding a new skill — checklist

1. Add the skill object to the tree's `skills` array with a unique `id`, its `name`, `row`/`col`, and `tier`.
2. Wire it into the tree with `requires_all` / `requires_any` (ids of the skills it branches off), and add its `id` to any *lower* skill that should branch off **it**.
3. Copy its `unlock` rule verbatim from the skill's wiki page (treatise name, level, points + attributes).
4. Fill in `desc` (and `dyn`/`fx` if it's a passive that changes stats). Reload the page — the node, its connectors, and its unlock gating all appear automatically.

> Ids are lowercase slugs of the skill name (`"Sudden Lunge"` → `sudden_lunge`). Keep them unique within a tree; other skills point at them, so treat an id as permanent once other skills reference it.

## Running locally

It's a static site — no build step. Serve the folder with any web server, e.g.:

```
python3 -m http.server
```

then open http://localhost:8000. (Opening `index.html` directly via `file://` won't work because the data files are fetched.)

## Updating after a game patch

See [`UPDATE.md`](UPDATE.md) — it maps every data file to its source wiki pages.

## Disclaimer

This is a fan project, not affiliated with Ink Stains Games or HypeTrain Digital. All game content, names, and images belong to their respective owners. Data sourced from the official Stoneshard wiki.
