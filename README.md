# Neon Alchemy VR

A mystical potion-crafting VR arcade game built with IWSDK 0.5.1. Step into an enchanted alchemist's workshop, gather magical ingredients, and brew potions to fill incoming orders before time runs out.

**[Play Now](https://ellyz2426.github.io/neon-alchemy/)**

## Gameplay

- **Gather Ingredients** — Click or point at 11 ingredient shelves to add ingredients to your cauldron (up to 3 at a time)
- **Brew Potions** — Hit the BREW button to combine ingredients. Match recipes to fulfill orders for points
- **Fill Orders** — Patron spirits request specific potions with time limits. Fulfill them quickly for time bonuses
- **Combo System** — Chain successful brews for escalating combo multipliers (3+: cauldron glow, 5+: particle speed, 7+: rune intensity)
- **Wave-Based Difficulty** — Survive increasingly challenging waves with tighter timers, harder recipes, and darkening atmosphere
- **Power-Ups** — Random drops after successful orders: Time Freeze (pauses timers), Double Points (2x score), Extra Life
- **Star Rating** — Earn 1-3 stars per wave based on potions brewed, perfect brews, and combo streaks
- **11 Potion Recipes** — From simple Health Potions to the legendary Void Walker

## Ingredients

| Ingredient | Visual | Color |
|---|---|---|
| Moon Herb | Leafy cluster | Green |
| Aether Crystal | Crystalline shard | Blue |
| Glowcap | Mushroom cap | Orange |
| Starlight Essence | Glowing orb | Yellow |
| Dragon Scale | Flat diamond | Red |
| Shadow Fang | Sharp fang | Purple |
| Phoenix Feather | Elongated feather | Orange |
| Abyssal Pearl | Perfect sphere | Cyan |
| Void Shard | Dark cube | Deep violet |
| Frost Lily | Icy crystal | Ice blue |
| Sun Stone | Warm sphere | Golden |

## Recipes

| Potion | Ingredients | Points |
|---|---|---|
| Health Potion | Moon Herb + Aether Crystal | 100 |
| Mana Potion | Aether Crystal + Starlight Essence | 100 |
| Speed Potion | Moon Herb + Glowcap | 120 |
| Shield Potion | Aether Crystal + Dragon Scale | 150 |
| Poison Vial | Glowcap + Shadow Fang | 130 |
| Thunderbolt Tonic | Sun Stone + Dragon Scale | 170 |
| Invisibility Draught | Void Shard + Frost Lily | 180 |
| Phoenix Elixir | Phoenix Feather + Moon Herb + Aether Crystal | 200 |
| Abyssal Draught | Abyssal Pearl + Shadow Fang + Starlight Essence | 220 |
| Elixir of Wisdom | Frost Lily + Aether Crystal + Starlight Essence | 240 |
| Void Walker | Void Shard + Shadow Fang + Abyssal Pearl | 260 |

## Controls

- **Browser**: Click ingredients to add to cauldron. Use BREW/CLEAR buttons on the cauldron panel
- **VR (Quest)**: Point controller ray at ingredients and panels, trigger to interact
- **Movement**: WASD + mouse (browser), teleport/thumbstick (VR)

## Features

- Mystical workshop environment with stone walls, magic circle, wall torches, crystal formations, cobwebs, glowing floor mushrooms
- Cauldron with bubbling particles, liquid stirring animation, smoke wisps, ember particles
- Mystical arch/portal with pulsing glow on back wall
- 3 patron spirits that animate on order fulfillment/expiration
- Ingredient fly-to-cauldron animation, hover highlighting, cooldown system
- Completed potions shelf tracking last 5 brewed potions
- Wave transition effects (magic circle flash, rune speed boost, ascending tone SFX)
- Combo glow escalation, life orbs, camera shake, tutorial hints
- Recipe hint system showing possible potions from current ingredients

## Tech

- IWSDK 0.5.1 (`@iwsdk/core`)
- 7 UIKitMLAsset spatial UI panels
- Procedural environment with 50+ meshes and particle systems
- Web Audio API procedural SFX (15+ sound types)
- ECS architecture (4 systems: Environment, Audio, Game, Input)
- Dual runtime: VR (offer: once) + browser controls
- High score persistence via localStorage

## Development

```sh
npm install
npm run dev
```
