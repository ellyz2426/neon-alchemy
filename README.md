# Neon Alchemy VR

A mystical potion-crafting VR arcade game built with IWSDK 0.5.1. Step into an enchanted alchemist's workshop, gather magical ingredients, and brew potions to fill incoming orders before time runs out.

## Gameplay

- **Gather Ingredients** — Click or point at ingredient shelves around the workshop to add ingredients to your cauldron (up to 3 at a time)
- **Brew Potions** — Hit the BREW button to combine ingredients. Match recipes to fulfill orders for points
- **Fill Orders** — Customers request specific potions with time limits. Fulfill them quickly for time bonuses
- **Combo System** — Chain successful brews for escalating combo multipliers
- **Wave-Based Difficulty** — Survive increasingly challenging waves with tighter timers and harder recipes
- **7 Potion Recipes** — From simple Health Potions to complex Phoenix Elixirs and Abyssal Draughts

## Ingredients

| Ingredient | Visual |
|---|---|
| Moon Herb | Green leafy cluster |
| Aether Crystal | Blue crystalline shard |
| Glowcap | Orange mushroom cap |
| Starlight Essence | Yellow glowing orb |
| Dragon Scale | Red flat diamond |
| Shadow Fang | Purple sharp fang |
| Phoenix Feather | Orange elongated feather |
| Abyssal Pearl | Cyan perfect sphere |

## Recipes

| Potion | Ingredients | Points |
|---|---|---|
| Health Potion | Moon Herb + Aether Crystal | 100 |
| Mana Potion | Aether Crystal + Starlight Essence | 100 |
| Speed Potion | Moon Herb + Glowcap | 120 |
| Shield Potion | Aether Crystal + Dragon Scale | 150 |
| Poison Vial | Glowcap + Shadow Fang | 130 |
| Phoenix Elixir | Phoenix Feather + Moon Herb + Aether Crystal | 200 |
| Abyssal Draught | Abyssal Pearl + Shadow Fang + Starlight Essence | 220 |

## Controls

- **Browser**: Click ingredients to add to cauldron. Use BREW/CLEAR buttons on the cauldron panel
- **VR (Quest)**: Point controller ray at ingredients and panels, trigger to interact
- **Movement**: WASD + mouse (browser), teleport/thumbstick (VR)

## Tech

- IWSDK 0.5.1 (`@iwsdk/core`)
- UIKitMLAsset spatial UI panels (7 panels)
- Procedural environment with particle effects
- Web Audio API procedural SFX (10+ sound types)
- ECS architecture (4 systems: Environment, Audio, Game, Input)
- Dual runtime: VR (offer: once) + browser controls
- High score persistence via localStorage

## Development

```sh
npm install
npm run dev
```
