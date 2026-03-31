# POGO-GC — PokeRaid App

## Project Overview
Personal Pokemon GO raid coordination PWA. Live at pogo-gc.vercel.app.
Deployed via Vercel from GitHub main branch. No build step — pure HTML/CSS/JS.

## File Structure
index.html          ← App shell, all HTML, loads css/app.css + js/app.js
css/app.css         ← All styles (737 lines). Dark theme, Sora font, mobile-first
js/app.js           ← All logic (1002 lines). No frameworks, ES5-safe
manifest.json       ← PWA manifest
CLAUDE.md           ← This file (project context for Claude Code)

## Design System
- Background: #060a14
- Surface layers: #0c1220 → #111827 → #1a2535
- Accent cyan: #00e5ff
- Gold: #ffcb05 | Green: #00e676 | Red: #ff4b4b | Purple: #9c40ff
- Teams: Mystic #2979ff | Valor #ff3d3d | Instinct #ffca28
- Fonts: Sora (UI) + JetBrains Mono (data/stats)
- All buttons: -webkit-appearance:none, no CSS vars in critical properties
- No ES6 template literals (WKWebView iOS compat)
- No backticks anywhere in JS

## Live APIs (all free, no auth except OWM)
- Raid bosses:    https://pogoapi.net/api/v1/current_raid_bosses.json
- Shinies:        https://pogoapi.net/api/v1/shiny_pokemon.json
- Ditto list:     https://pogoapi.net/api/v1/possible_ditto_pokemon.json
- Nesting mons:   https://pogoapi.net/api/v1/nesting_pokemon.json
- Type data:      https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json
- Sprites:        https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
- Biomes:         https://overpass-api.de/api/interpreter (POST, OSM Overpass)
- Weather:        https://api.openweathermap.org/data/2.5/weather (user provides key, stored in localStorage key 'pr_owm_key')
- Realtime chat:  Ably SDK — key in js/app.js CFG.ABLY_KEY

## App State (global object S in js/app.js)
S.user, S.team, S.group, S.ably, S.channel, S.mapObj, S.userMarker,
S.lat, S.lng, S.raidBosses[], S.shinies{}, S.dittos{}, S.nests{},
S.onlineMembers{}, S.lastSender, S.rbOpen, S.isFloat,
S.activeGuide, S.raidFilter, S.raidSearch, S.wxCode, S.activeTab

## 5 Tabs + Their Pane IDs
- Chat:   #tab-chat  → #pane-chat
- Map:    #tab-map   → #pane-map
- Raids:  #tab-raids → #pane-raids
- Guide:  #tab-guide → #pane-guide  
- Me:     #tab-me    → #pane-me

## Pane Visibility Pattern
CSS: `.pane { display:none }` | `.pane.vis { display:flex }`
JS: goTab(tab) toggles .vis class, called from DOMContentLoaded with 'chat'

## Known Bugs To Fix
1. **CSS not loading** — verify <link href="css/app.css"> path resolves on Vercel
2. **All panes visible** — caused by CSS not loading (display:none not applied)
3. **goTab initial call** — must fire AFTER #app exists in DOM

## Nest Migration Timer
Next Thursday 01:00 UTC on 2-week cycle from epoch 2025-01-02T01:00:00Z

## Ably Channel Naming
'poke-raid-' + S.group  (e.g. 'poke-raid-GLOBAL')

## localStorage Keys
- 'pr_owm_key'    → OpenWeatherMap API key
- 'pr_friend_code' → trainer friend code

## Current Status
PR #16 merged. Foundation wired. Next: post-merge verification pass complete. App should render 5-tab UI at pogo-gc.vercel.app.

## Do Not
- Add fake spawn markers to map (removed intentionally)
- Use CSS custom properties (var(--x)) in button backgrounds (iOS compat)
- Use ES6 template literals / backticks
- Use arrow functions in onclick attributes
- Minify JS (causes quote collision bugs)
