# Stoneshard Build Calculator

An unofficial, fan-made character build calculator for [Stoneshard](https://stoneshard.com/) (v0.9.4 "Rags to Riches").

**[Try it here](https://ricardoianelli.github.io/stoneshard-calculator/)** *(update this link after deploying)*

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
