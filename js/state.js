/* PokeRaid — Global app state and tab switching */
'use strict';

// ─── GLOBAL STATE ────────────────────────────────────────────
var S = {
  user:         '',
  team:         '',
  group:        'GLOBAL',
  ably:         null,
  channel:      null,
  mapObj:       null,
  userMarker:   null,
  lat:          null,
  lng:          null,
  raidBosses:   [],
  shinies:      {},
  dittos:       {},
  nests:        {},
  onlineMembers: {},
  lastSender:   '',
  rbOpen:       false,
  isFloat:      false,
  activeGuide:  'shinies',
  raidFilter:   'all',
  raidSearch:   '',
  wxCode:       null,
  activeTab:    'chat'
};

// ─── TAB SWITCHING ───────────────────────────────────────────
function goTab(tab) {
  ['chat','map','raids','guide','me'].forEach(function(t) {
    $('tab-'  + t).classList.toggle('on',  t === tab);
    $('pane-' + t).classList.toggle('vis', t === tab);
  });
  S.activeTab = tab;
  if (tab === 'map'   && !S.mapObj)           initMap();
  if (tab === 'raids' && !S.raidBosses.length) renderRaidBosses();
  if (tab === 'guide') renderGuideSection(S.activeGuide);
  if (tab === 'me')    renderProfile();
}
