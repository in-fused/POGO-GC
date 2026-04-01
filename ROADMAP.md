# POGO-GC — PokeRaid App Roadmap

> Living document. Updated after every push. Claude Code owns planning and PR review.

---

## Architecture

```
index.html          ← App shell HTML only. No inline CSS or JS.
css/app.css         ← Single complete stylesheet. 286 lines. No framework.
js/
  config.js         ← CFG object, POGO_WX, TYPE_BG, TYPE_CHART
  state.js          ← Global S object, goTab()
  utils.js          ← esc(), $(), typePill(), weakPill(), tierColor(), stars()
  login.js          ← selectTeam(), joinChat()
  realtime.js       ← connectAbly(), syncPresence(), refreshOnlineRow()
  chat.js           ← renderMsg(), buildRaidMsgCard(), sendMsg(), addRaidPin()
  modal.js          ← openRaidModal(), closeRaidModal(), closeBg(), postRaid()
  map.js            ← initMap(), addUserDot(), centerMap(), fetchOSMBiomes(),
                       fetchWeather(), showWeatherHUD(), toggleRaidBoard()
  raids.js          ← renderRaidBosses(), setRaidFilter(), renderRaidBoard()
  guide.js          ← switchGuide(), renderShinies(), renderDittos(),
                       renderNests(), renderWeatherGuide(), renderMigration()
  me.js             ← renderProfile(), saveFriendCode(), saveOWMKey(),
                       leaveGroup(), leaveChat(), shareGroup()
  data.js           ← fetchAllData(), fetchRaidBosses(), enrichBossTypes(),
                       fetchShinies(), fetchDittos(), fetchNestingPokemon()
  ui.js             ← showToast(), toggleFloat(), refreshWeather()
  init.js           ← DOMContentLoaded boot, key bindings
manifest.json
CLAUDE.md           ← Project rules, design tokens, API list
ROADMAP.md          ← This file
```

**Script load order in index.html (strict):**
config → state → utils → login → realtime → chat → modal → map → raids → guide → me → data → ui → init

---

## Phases

### Phase 1 — Foundation (DONE)
- [x] Clean HTML shell (index.html, 404 lines, no inline style/script)
- [x] Complete CSS rewrite (css/app.css, 286 lines, no Tailwind/Grok remnants)
- [x] Monolithic app.js working (1005 lines, 5 tabs functional)
- [x] All 5 panes wired: chat, map, raids, guide, me
- [x] Live API integration: pogoapi.net, pokemon-go-api, OWM, Ably, Leaflet/OSM

### Phase 2 — Modularisation (IN PROGRESS)
Split app.js (1005 lines) into 14 focused files. No build step. ES5 globals.
Estimated output: ~1100 lines total across modules (cleaner per-file).

- [x] Delete orphaned legacy files (js/config.js, map.js, utils.js, ably.js, css/style.css)
- [ ] js/config.js — CFG, type constants (~90 lines)
- [ ] js/state.js — S object, goTab (~30 lines)
- [ ] js/utils.js — helper functions (~40 lines)
- [ ] js/login.js — auth flow (~45 lines)
- [ ] js/realtime.js — Ably connection (~50 lines)
- [ ] js/chat.js — messaging (~95 lines)
- [ ] js/modal.js — raid bottom sheet (~35 lines)
- [ ] js/map.js — Leaflet + weather + biomes (~195 lines)
- [ ] js/raids.js — raid boss grid (~100 lines)
- [ ] js/guide.js — guide sections (~140 lines)
- [ ] js/me.js — profile pane (~65 lines)
- [ ] js/data.js — API fetch orchestration (~95 lines)
- [ ] js/ui.js — toasts, float mode, share (~50 lines)
- [ ] js/init.js — boot sequence (~25 lines)
- [ ] Update index.html to load all 14 scripts
- [ ] Smoke test all 5 tabs post-split

### Phase 3 — Feature Enhancements (PLANNED)
- [ ] **Raid egg timer** — countdown to hatch + time-since-hatch on raid cards
- [ ] **Boss CP ranges** — display catch/weather-boost CP range on boss cards
- [ ] **Group QR / invite link** — share button generates shareable URL with group code
- [ ] **Push notifications (PWA)** — alert when group member posts a raid
- [ ] **Gym search on map** — text search for nearby Pokéstops/Gyms via OSM
- [ ] **Type quick-filter on raids** — tap a type chip to filter bosses by type
- [ ] **Raid history** — local rolling log of last 20 raids posted in group
- [ ] **IV/CP estimator** — enter dust/candy cost, get IV floor from raid tier
- [ ] **Remote raid flag** — let members tag themselves as remote when joining
- [ ] **Improved offline mode** — cache boss list + sprites in Service Worker
- [ ] **Dark/light theme toggle** — system preference + manual toggle

### Phase 4 — Polish (FUTURE)
- [ ] Animated tab transitions
- [ ] Haptic feedback on button presses (iOS)
- [ ] Map clustering for dense raid pins
- [ ] Accessibility (ARIA labels, focus management)
- [ ] Localisation (date/time formats, metric/imperial)

---

## PR Review Log

### PR — fix: complete css rewrite, strip all Grok/Tailwind remnants
**Branch:** claude/fix-css-corruption-yuwVh → main
**Files changed:** css/app.css (−738 +286), CLAUDE.md (+4)
**Impact:** Fixes unstyled rendering on Vercel. Removes all framework remnants.
**Critical rules verified:**
- `#app { display:none }` / `#app.vis { display:flex }` ✓
- `#loginScreen.gone { display:none }` ✓
- `.pane { display:none }` / `.pane.vis { display:flex }` ✓
- No CSS vars in button backgrounds ✓
- All 5 panes styled ✓
**Status:** Merged to main ✓

---

## Constraints (never violate)
- No ES6 template literals or backticks (WKWebView iOS compat)
- No arrow functions in onclick= attributes
- No CSS custom properties (var(--x)) in button/background critical paths
- No build step — plain `<script src="">` tags only
- No fake map markers
- No Tailwind
