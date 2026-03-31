/* ============================================================
PokeRaid — Complete App JavaScript
APIs: pogoapi.net · pokemon-go-api GitHub · pokeapi.co
OpenWeatherMap · Overpass/OSM · Ably
Personal play project — not for commercial use
============================================================ */
‘use strict’;

// ─── CONFIG ──────────────────────────────────────────────────
var CFG = {
ABLY_KEY:   ‘r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM’,
OWM_LS:     ‘3f6d92f188f1fb0a99d9e39114a6d37f’,
FC_LS:      ‘322714767097’,
SPRITE:     function(id) { return ‘https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/’ + id + ‘.png’; },
SHINY_SPR:  function(id) { return ‘https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/’ + id + ‘.png’; },
POGOAPI:    ‘https://pogoapi.net/api/v1/’,
POGO_GH:    ‘https://pokemon-go-api.github.io/pokemon-go-api/api/’
};

// ─── POGO WEATHER MAPPING ────────────────────────────────────
// OWM condition codes → PoGo in-game weather → boosted types
var POGO_WX = {
SUNNY:         { label:‘Sunny / Clear’,  icon:‘☀️’,  boost:[‘Fire’,‘Grass’,‘Ground’] },
RAINY:         { label:‘Rainy’,          icon:‘🌧️’,  boost:[‘Water’,‘Electric’,‘Bug’] },
PARTLY_CLOUDY: { label:‘Partly Cloudy’,  icon:‘⛅’,  boost:[‘Normal’,‘Rock’] },
CLOUDY:        { label:‘Cloudy’,         icon:‘☁️’,  boost:[‘Fairy’,‘Fighting’,‘Poison’] },
WINDY:         { label:‘Windy’,          icon:‘🌬️’,  boost:[‘Dragon’,‘Flying’,‘Psychic’] },
SNOW:          { label:‘Snow’,           icon:‘❄️’,  boost:[‘Ice’,‘Steel’] },
FOG:           { label:‘Fog’,            icon:‘🌫️’,  boost:[‘Dark’,‘Ghost’] }
};

function owmToPoGo(code, isDay, windMs) {
var pg;
if      (code >= 200 && code < 600) pg = ‘RAINY’;
else if (code >= 600 && code < 700) pg = ‘SNOW’;
else if (code === 701 || code === 741) pg = ‘FOG’;
else if (code >= 700 && code < 800) pg = ‘PARTLY_CLOUDY’;
else if (code === 800) pg = isDay ? ‘SUNNY’ : ‘PARTLY_CLOUDY’;
else if (code <= 802) pg = ‘PARTLY_CLOUDY’;
else pg = ‘CLOUDY’;
if (windMs >= 10) pg = ‘WINDY’;
return pg;
}

// ─── TYPE SYSTEM ─────────────────────────────────────────────
var TYPE_BG = {
Normal:’#A8A878’, Fire:’#F08030’, Water:’#6890F0’, Electric:’#F8D030’,
Grass:’#78C850’,  Ice:’#98D8D8’,  Fighting:’#C03028’, Poison:’#A040A0’,
Ground:’#E0C068’, Flying:’#A890F0’, Psychic:’#F85888’, Bug:’#A8B820’,
Rock:’#B8A038’,   Ghost:’#705898’, Dragon:’#7038F8’,  Dark:’#705848’,
Steel:’#B8B8D0’,  Fairy:’#EE99AC’
};
var TYPE_DARK_TEXT = { Electric:1, Ice:1, Ground:1, Steel:1, Fairy:1, Normal:1 };

// Full damage multiplier table (attacker type → defender type → multiplier)
// PoGo: SE=1.6, NE=0.625, immune=0.390625 (approx)
var TYPE_CHART = {
Normal:   { Rock:0.625, Ghost:0.39, Steel:0.625 },
Fire:     { Fire:0.625, Water:0.625, Grass:1.6, Ice:1.6, Bug:1.6, Rock:0.625, Dragon:0.625, Steel:1.6 },
Water:    { Fire:1.6, Water:0.625, Grass:0.625, Ground:1.6, Rock:1.6, Dragon:0.625 },
Electric: { Water:1.6, Electric:0.625, Grass:0.625, Ground:0.39, Flying:1.6, Dragon:0.625 },
Grass:    { Fire:0.625, Water:1.6, Grass:0.625, Poison:0.625, Ground:1.6, Flying:0.625, Bug:0.625, Rock:1.6, Dragon:0.625, Steel:0.625 },
Ice:      { Water:0.625, Grass:1.6, Ice:0.625, Ground:1.6, Flying:1.6, Dragon:1.6, Steel:0.625 },
Fighting: { Normal:1.6, Ice:1.6, Rock:1.6, Dark:1.6, Steel:1.6, Poison:0.625, Bug:0.625, Psychic:0.625, Flying:0.625, Ghost:0.39, Fairy:0.625 },
Poison:   { Grass:1.6, Fairy:1.6, Poison:0.625, Ground:0.625, Rock:0.625, Ghost:0.625, Steel:0.39 },
Ground:   { Fire:1.6, Electric:1.6, Grass:0.625, Poison:1.6, Rock:1.6, Steel:1.6, Bug:0.625, Flying:0.39 },
Flying:   { Electric:0.625, Grass:1.6, Fighting:1.6, Bug:1.6, Rock:0.625, Steel:0.625 },
Psychic:  { Fighting:1.6, Poison:1.6, Psychic:0.625, Dark:0.39, Steel:0.625 },
Bug:      { Fire:0.625, Grass:1.6, Fighting:0.625, Poison:0.625, Flying:0.625, Psychic:1.6, Ghost:0.625, Dark:1.6, Steel:0.625, Fairy:0.625 },
Rock:     { Fire:1.6, Ice:1.6, Fighting:0.625, Ground:0.625, Flying:1.6, Bug:1.6, Steel:0.625 },
Ghost:    { Normal:0.39, Psychic:1.6, Ghost:1.6, Dark:0.625 },
Dragon:   { Dragon:1.6, Steel:0.625, Fairy:0.39 },
Dark:     { Fighting:0.625, Psychic:1.6, Ghost:1.6, Dark:0.625, Fairy:0.625 },
Steel:    { Fire:0.625, Water:0.625, Electric:0.625, Ice:1.6, Rock:1.6, Steel:0.625, Fairy:1.6 },
Fairy:    { Fighting:1.6, Dragon:1.6, Dark:1.6, Fire:0.625, Poison:0.625, Steel:0.625 }
};

// Get attacking types that are super-effective vs defender types
function getWeaknesses(defenderTypes) {
var result = {};
Object.keys(TYPE_CHART).forEach(function(atk) {
var mult = 1;
defenderTypes.forEach(function(def) {
mult *= (TYPE_CHART[atk][def] || 1);
});
if (mult > 1.5) result[atk] = mult;
});
return result;
}

// ─── STATE ───────────────────────────────────────────────────
var S = {
user:    ‘’, team:  ‘’, group: ‘GLOBAL’,
ably:    null, channel: null,
mapObj:  null, userMarker: null,
lat:     null, lng: null,
raidBosses:  [],
shinies:     {},
dittos:      {},
nests:       {},
onlineMembers: {},
lastSender:  ‘’,
rbOpen:      false,
isFloat:     false,
activeGuide: ‘shinies’,
raidFilter:  ‘all’,
raidSearch:  ‘’,
wxCode:      null,
};

// ─── UTILS ───────────────────────────────────────────────────
function esc(s) {
return String(s || ‘’)
.replace(/&/g,’&’).replace(/</g,’<’)
.replace(/>/g,’>’).replace(/”/g,’"’);
}
function $(id) { return document.getElementById(id); }
function typePill(type) {
var bg = TYPE_BG[type] || ‘#888’;
var col = TYPE_DARK_TEXT[type] ? ‘#000’ : ‘#fff’;
return ‘<span class="tpill" style="background:' + bg + ';color:' + col + ';">’ + type + ‘</span>’;
}
function weakPill(type, mult) {
var bg = TYPE_BG[type] || ‘#888’;
var col = TYPE_DARK_TEXT[type] ? ‘#000’ : ‘#fff’;
var badge = mult >= 2.5 ? ‘<span class="t2x">2×</span>’ : ‘’;
return ‘<span class="wpill" style="background:' + bg + ';color:' + col + ';">’ + type + badge + ‘</span>’;
}
function stars(n) {
var s = ‘’;
for (var i = 0; i < Math.min(n, 5); i++) s += ‘⭐’;
return s;
}
function tierColor(t) {
if (t === 1) return ‘#00e676’;
if (t === 3) return ‘#ffcb05’;
if (t === 5 || t === 6) return ‘#9c40ff’;
if (t === 7) return ‘#00e5ff’; // mega
return ‘#ff4b4b’; // shadow
}
function tierLabel(t) {
if (t === 7) return ‘Mega’;
if (t === 8) return ‘Shadow’;
return ‘T’ + t;
}

// ─── LOGIN ───────────────────────────────────────────────────
function selectTeam(team) {
S.team = team;
[‘mystic’,‘valor’,‘instinct’].forEach(function(t) {
var btn = $(‘btn-’ + t);
if (!btn) return;
btn.classList.toggle(‘sel’, t === team);
});
}

function joinChat() {
var nameEl = $(‘loginName’), groupEl = $(‘loginGroup’);
var name = nameEl ? nameEl.value.trim() : ‘’;
var grp  = groupEl ? groupEl.value.trim().toUpperCase() : ‘’;
if (!name)    { alert(‘Trainer name required!’); return; }
if (!S.team)  { alert(‘Select your team first!’); return; }
S.user  = name;
S.group = grp || ‘GLOBAL’;

$(‘loginScreen’).classList.add(‘gone’);
$(‘app’).classList.add(‘vis’);

var lbl = S.group === ‘GLOBAL’ ? ‘Raid’ : S.group;
$(‘appTitle’).innerHTML = ‘Poke<em>’ + esc(lbl) + ‘</em>’;

// Load saved settings
var fc = localStorage.getItem(CFG.FC_LS) || ‘’;
var owm = localStorage.getItem(CFG.OWM_LS) || ‘’;
if ($(‘fcInput’))  $(‘fcInput’).value  = fc;
if ($(‘owmInput’)) $(‘owmInput’).value = owm;

refreshOnlineRow();
renderProfile();
fetchAllData();
connectAbly();

sysMsg(‘Welcome <strong>’ + esc(S.user) + ’</strong> — Team ’ + cap(S.team));
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ‘’; }

// ─── ABLY ────────────────────────────────────────────────────
function connectAbly() {
try {
S.ably = new Ably.Realtime({ key: CFG.ABLY_KEY, clientId: S.user });
S.ably.connection.on(‘connecting’,   function() { setSt(‘Connecting…’); });
S.ably.connection.on(‘connected’,    function() { setSt(‘Live’); syncPresence(); });
S.ably.connection.on(‘failed’,       function() { setSt(‘Demo mode — no live chat’); });
S.ably.connection.on(‘disconnected’, function() { setSt(‘Reconnecting…’); });

S.ably.connection.once(‘connected’, function() {
S.channel = S.ably.channels.get(‘poke-raid-’ + S.group);
S.channel.subscribe(‘msg’, function(m) { renderMsg(m.data); });
S.channel.presence.subscribe(syncPresence);
S.channel.presence.enter({ user: S.user, team: S.team });
});

} catch(e) { setSt(‘Demo mode’); }
}

function syncPresence() {
if (!S.channel) return;
S.channel.presence.get(function(err, members) {
if (err || !members) return;
S.onlineMembers = {};
members.forEach(function(m) { S.onlineMembers[m.clientId] = m.data; });
setSt(members.length + ’ online’);
refreshOnlineRow();
});
}

function setSt(t) { var e = $(‘statTxt’); if (e) e.textContent = t; }

function refreshOnlineRow() {
var row = $(‘onlineRow’); if (!row) return;
var h = ‘<span class="ochip"><span class="odot od-' + (S.team||'none') + '"></span>’ + esc(S.user) + ’ (you)</span>’;
Object.keys(S.onlineMembers).forEach(function(id) {
if (id === S.user) return;
var d = S.onlineMembers[id] || {};
h += ‘<span class="ochip"><span class="odot od-' + (d.team||'none') + '"></span>’ + esc(d.user||id) + ‘</span>’;
});
row.innerHTML = h;
}

// ─── CHAT ────────────────────────────────────────────────────
function renderMsg(data) {
var feed = $(‘msgFeed’); if (!feed) return;

if (data.type === ‘raid’) {
S.lastSender = ‘’;
addRaidPin(data);
feed.insertAdjacentHTML(‘beforeend’, buildRaidMsgCard(data));
feed.scrollTop = feed.scrollHeight;
return;
}

var mine = (data.user === S.user);
var cont = (data.user === S.lastSender) && !mine;
S.lastSender = data.user;

var t = new Date(data.ts).toLocaleTimeString([], { hour:‘2-digit’, minute:‘2-digit’ });
var avCls = ‘mav av-’ + (data.team||‘none’) + (cont ? ’ hide’ : ‘’);
var init  = (data.user||’?’).charAt(0).toUpperCase();
var badge = data.team
? ‘<span class="tbadge b' + data.team.charAt(0) + '">’ + data.team.toUpperCase() + ‘</span>’ : ‘’;

var rowCls = ‘mrow’ + (mine?’ mine’:’’) + (cont&&!mine?’ cont’:’’);
var av     = mine ? ‘’ : ‘<div class="' + avCls + '">’ + (cont?’’:init) + ‘</div>’;
var meta   = (!mine && !cont) ? ‘<div class="mmeta">’ + badge + esc(data.user) + ‘</div>’ : ‘’;

feed.insertAdjacentHTML(‘beforeend’,
‘<div class="' + rowCls + '">’ + av +
‘<div class="mbwrap">’ + meta +
‘<div class="mbub">’ + esc(data.text) + ‘</div>’ +
‘<div class="mtime">’ + t + ‘</div>’ +
‘</div></div>’
);
feed.scrollTop = feed.scrollHeight;
}

function buildRaidMsgCard(d) {
var boss = findBoss(d.boss);
var tier = boss ? boss.tier : (d.tier || 5);
var pid  = boss ? boss.pid  : (d.pid  || 25);
var tc   = tierColor(tier);

return ‘<div class="raid-card-msg">’ +
‘<div class="rcm-head">’ +
‘<img src="' + CFG.SPRITE(pid) + '" width="52" height="52">’ +
‘<div><div class="rcm-lbl">⚔️ Raid Alert</div>’ +
‘<div class="rcm-boss">’ + esc(d.boss) + ‘</div></div></div>’ +
‘<div class="rcm-body">’ +
‘<div class="rcm-tier" style="border-color:' + tc + ';color:' + tc + '">’ + tierLabel(tier) + ’ ’ + stars(tier) + ‘</div>’ +
‘<div class="rcm-row"><i class="fas fa-map-marker-alt"></i><strong>’ + esc(d.location||’’) + ‘</strong></div>’ +
‘<div class="rcm-row"><i class="fas fa-clock"></i><strong>’ + esc(d.time||’’) + ‘</strong></div>’ +
‘<div class="rcm-row"><i class="fas fa-users"></i><strong>’ + esc(d.players||’’) + ’ needed</strong></div>’ +
‘<button class="rcm-join" onclick="joinRaidBtn(this)">✊ Join Raid</button>’ +
‘</div></div>’;
}

function joinRaidBtn(btn) { btn.textContent = ‘✅ Joined!’; btn.disabled = true; }

function addRaidPin(d) {
var boss = findBoss(d.boss);
var pid = boss ? boss.pid : 25;
var strip = $(‘raidStrip’); if (!strip) return;
strip.classList.add(‘show’);
strip.insertAdjacentHTML(‘beforeend’,
‘<span class="rpin"><img src="' + CFG.SPRITE(pid) + '" width="24" height="24">’ +
‘<span><div class="rpin-name">’ + esc(d.boss) + ‘</div>’ +
‘<div class="rpin-sub">’ + esc(d.location||’’) + ’ · ’ + esc(d.time||’’) + ‘</div></span></span>’
);
}

function sysMsg(html) {
var feed = $(‘msgFeed’); if (!feed) return;
feed.insertAdjacentHTML(‘beforeend’, ‘<div class="sys-msg"><span>’ + html + ‘</span></div>’);
feed.scrollTop = feed.scrollHeight;
S.lastSender = ‘’;
}

function sendMsg() {
var inp = $(‘msgIn’); if (!inp) return;
var txt = inp.value.trim(); if (!txt) return;
inp.value = ‘’;
var data = { type:‘chat’, user:S.user, team:S.team, text:txt, ts:Date.now() };
renderMsg(data);
if (S.channel) S.channel.publish(‘msg’, data);
}

// ─── RAID MODAL ──────────────────────────────────────────────
function openRaidModal()  { $(‘raidModal’).classList.add(‘open’); }
function closeRaidModal() { $(‘raidModal’).classList.remove(‘open’); }
function closeBg(e, id)   { if (e.target.id === id) document.getElementById(id).classList.remove(‘open’); }

function postRaid() {
var boss    = $(‘mRaidBoss’).value.trim();
var loc     = $(‘mRaidLoc’).value.trim();
var time    = $(‘mRaidTime’).value;
var players = $(‘mRaidPlayers’).value;
if (!boss || !loc || !time) { alert(‘Fill all fields!’); return; }

var b    = findBoss(boss);
var data = {
type:‘raid’, user:S.user, team:S.team,
boss:boss, location:loc, time:time, players:players,
pid:  b ? b.pid  : 25,
tier: b ? b.tier : 5,
ts:   Date.now()
};
renderMsg(data);
if (S.channel) S.channel.publish(‘msg’, data);

closeRaidModal();
goTab(‘chat’);
$(‘mRaidBoss’).value = ‘’;
$(‘mRaidLoc’).value  = ‘’;
}

function findBoss(name) {
if (!name) return null;
var nl = name.toLowerCase();
for (var i = 0; i < S.raidBosses.length; i++) {
if (S.raidBosses[i].name.toLowerCase() === nl) return S.raidBosses[i];
}
return null;
}

// ─── TABS ────────────────────────────────────────────────────
function goTab(tab) {
[‘chat’,‘map’,‘raids’,‘guide’,‘me’].forEach(function(t) {
$(‘tab-’ + t).classList.toggle(‘on’, t === tab);
$(‘pane-’ + t).classList.toggle(‘vis’, t === tab);
});
S.activeTab = tab;
if (tab === ‘map’   && !S.mapObj) initMap();
if (tab === ‘raids’ && !S.raidBosses.length) renderRaidBosses();
if (tab === ‘guide’) renderGuideSection(S.activeGuide);
if (tab === ‘me’)    renderProfile();
}

// ─── MAP TAB ─────────────────────────────────────────────────
function initMap() {
if (S.mapObj) return;

S.mapObj = L.map(‘map’, { zoomControl:false, attributionControl:false })
.setView([40.7128, -74.006], 14);

L.tileLayer(‘https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png’, {
maxZoom: 19, subdomains: ‘abcd’
}).addTo(S.mapObj);

L.control.zoom({ position:‘topright’ }).addTo(S.mapObj);

if (navigator.geolocation) {
navigator.geolocation.getCurrentPosition(
function(pos) {
S.lat = pos.coords.latitude;
S.lng = pos.coords.longitude;
S.mapObj.setView([S.lat, S.lng], 16);
addUserDot();
fetchOSMBiomes();
fetchWeather();
},
function() {
$(‘wLoad’).textContent = ‘📍 Enable location for live weather’;
fetchOSMBiomes();
}
);
navigator.geolocation.watchPosition(function(pos) {
S.lat = pos.coords.latitude;
S.lng = pos.coords.longitude;
if (S.userMarker) S.userMarker.setLatLng([S.lat, S.lng]);
}, null, { enableHighAccuracy:true, maximumAge:15000 });
} else {
$(‘wLoad’).textContent = ‘Location not supported’;
fetchOSMBiomes();
}
}

function addUserDot() {
var icon = L.divIcon({ html:’<div class="user-dot"></div>’, iconSize:[20,20], iconAnchor:[10,10], className:’’ });
S.userMarker = L.marker([S.lat, S.lng], { icon:icon, zIndexOffset:2000 }).addTo(S.mapObj);
}

function centerMap() {
if (!navigator.geolocation) return;
navigator.geolocation.getCurrentPosition(function(pos) {
S.lat = pos.coords.latitude; S.lng = pos.coords.longitude;
if (S.mapObj) S.mapObj.setView([S.lat, S.lng], 16);
if (S.userMarker) S.userMarker.setLatLng([S.lat, S.lng]);
});
}

// OSM Overpass — real park & water biomes
function fetchOSMBiomes() {
var lat = S.lat || 40.7128, lng = S.lng || -74.006, R = 0.016;
var bb  = (lat-R)+’,’+(lng-R)+’,’+(lat+R)+’,’+(lng+R);
var q   = ‘[out:json][timeout:25];(’ +
‘way[“leisure”=“park”]('+bb+');’ +
‘way[“landuse”=“park”]('+bb+');’ +
‘way[“landuse”=“grass”]('+bb+');’ +
‘way[“landuse”=“forest”]('+bb+');’ +
‘way[“natural”=“wood”]('+bb+');’ +
‘way[“natural”=“water”]('+bb+');’ +
‘way[“water”]('+bb+');’ +
‘way[“waterway”=“river”]('+bb+');’ +
‘);(._;>;);out body;’;

fetch(‘https://overpass-api.de/api/interpreter’, { method:‘POST’, body:‘data=’+encodeURIComponent(q) })
.then(function(r) { return r.json(); })
.then(renderBiomes)
.catch(function(e) { console.warn(‘OSM load failed:’, e); });
}

function renderBiomes(data) {
var nodes = {};
data.elements.forEach(function(el) { if (el.type===‘node’) nodes[el.id]=[el.lat,el.lon]; });

var parks = 0, water = 0;
data.elements.forEach(function(el) {
if (el.type!==‘way’||!el.nodes) return;
var coords = el.nodes.map(function(n) { return nodes[n]; }).filter(Boolean);
if (coords.length < 3) return;
var t = el.tags || {};
var isW = t.natural===‘water’ || !!t.waterway || !!t.water;
var isP = t.leisure===’park’ || t.landuse===’park’ || t.landuse===’grass’ ||
t.landuse===’forest’ || t.natural===’wood’;

if (isW) {
L.polygon(coords, { color:’rgba(104,144,240,0.65)’, weight:1.5, fillColor:’rgba(104,144,240,0.18)’, fillOpacity:1 })
.addTo(S.mapObj)
.bindPopup(biomePopup(‘water’, t.name), { className:’dk-popup’ });
water++;
} else if (isP) {
L.polygon(coords, { color:’rgba(0,230,118,0.55)’, weight:1.5, fillColor:’rgba(0,230,118,0.12)’, fillOpacity:1 })
.addTo(S.mapObj)
.bindPopup(biomePopup(‘park’, t.name), { className:’dk-popup’ });
parks++;
}

});
updateBiomePanel(parks, water);
}

function biomePopup(type, name) {
var w = type === ‘water’;
var lbl   = w ? ‘💧 Water Zone’ : ‘🌿 Park / Nature’;
var cls   = w ? ‘lbl-water’ : ‘lbl-park’;
var types = w ? [‘Water’,‘Ice’,‘Electric’] : [‘Grass’,‘Bug’,‘Normal’,‘Poison’];
return ‘<div class="mpop">’ +
‘<div class="mpop-lbl ' + cls + '">’ + lbl + ‘</div>’ +
‘<div class="mpop-name">’ + esc(name || (w?‘Water Body’:‘Park’)) + ‘</div>’ +
‘<div class="mpop-sub">Expect more ’ + types.slice(0,2).join(’ & ‘) + ’ types here</div>’ +
‘<div class="mpop-types">’ + types.map(typePill).join(’’) + ‘</div>’ +
‘</div>’;
}

function updateBiomePanel(parks, water) {
var p = $(‘biomeP’); if (!p || (!parks && !water)) return;
p.classList.add(‘vis’);
var h = ‘<div class="bp-title">Nearby Biomes</div>’;
if (parks) h += ‘<div class="bp-row"><div class="bp-dot" style="background:#00e676;"></div><div><div class="bp-name">’ + parks + ’ Park Zone’ + (parks>1?‘s’:’’) + ‘</div><div class="bp-types">Grass · Bug · Normal</div></div></div>’;
if (water) h += ‘<div class="bp-row"><div class="bp-dot" style="background:#6890F0;"></div><div><div class="bp-name">’ + water + ’ Water Zone’ + (water>1?‘s’:’’) + ‘</div><div class="bp-types">Water · Ice · Electric</div></div></div>’;
// Add nest migration
h += nestMigrationHTML(true);
p.innerHTML = h;
}

// ─── WEATHER ─────────────────────────────────────────────────
function fetchWeather() {
if (!S.lat) return;
var owm = localStorage.getItem(CFG.OWM_LS);
if (!owm || owm === ‘PASTE_YOUR_KEY_HERE’) { fallbackWeather(); return; }

fetch(‘https://api.openweathermap.org/data/2.5/weather?lat=’+S.lat+’&lon=’+S.lng+’&appid=’+owm+’&units=imperial’)
.then(function(r) { return r.json(); })
.then(function(d) {
if (d.cod !== 200) { fallbackWeather(); return; }
var code  = d.weather[0].id;
var isDay = (d.dt > d.sys.sunrise && d.dt < d.sys.sunset);
var wind  = (d.wind && d.wind.speed) || 0;
var pg    = owmToPoGo(code, isDay, wind);
showWeatherHUD(pg, Math.round(d.main.temp) + ‘°F’, d.weather[0].description);
})
.catch(fallbackWeather);
}

function fallbackWeather() {
var m  = new Date().getMonth();
var pg = ‘PARTLY_CLOUDY’;
if (m >= 11 || m <= 1) pg = ‘SNOW’;
else if (m >= 6 && m <= 8) pg = ‘SUNNY’;
showWeatherHUD(pg, ‘—’, ‘Add OWM key in ⚙️ Me tab’);
}

function showWeatherHUD(pgCode, temp, desc) {
S.wxCode = pgCode;
var wx = POGO_WX[pgCode];
$(‘wLoad’).style.display = ‘none’;
var body = $(‘wBody’); body.classList.add(‘on’);
$(‘wIcon’).textContent = wx.icon;
$(‘wCond’).textContent = desc;
$(‘wTemp’).textContent = temp;
$(‘wLabel’).textContent = wx.label + ’ in PoGo’;
$(‘wTypes’).innerHTML  = wx.boost.map(typePill).join(’’);
}

function refreshWeather() { fetchWeather(); }

// Raid board on map
function toggleRaidBoard() {
S.rbOpen = !S.rbOpen;
$(‘raidBoard’).classList.toggle(‘open’, S.rbOpen);
}

function renderRaidBoard() {
var el = $(‘rbContent’); if (!el) return;
if (!S.raidBosses.length) { el.innerHTML = ‘<div style="color:#8090a8;font-size:12px;">Loading…</div>’; return; }

var tiers = [[5,‘5-star’],[6,‘5-star+’],[7,‘Mega’],[8,‘Shadow’],[3,‘3-star’],[1,‘1-star’]];
var h = ‘’;
tiers.forEach(function(tv) {
var t = tv[0];
var bosses = S.raidBosses.filter(function(b) { return b.tier === t; });
if (!bosses.length) return;
var tc = tierColor(t);
h += ‘<div class="rb-tier-lbl" style="color:' + tc + ';">’ + stars(t) + ’ ’ + tierLabel(t) + ‘</div>’;
bosses.forEach(function(b) {
h += ‘<div class="rb-card">’ +
‘<img src="' + CFG.SPRITE(b.pid) + '" width="44" height="44">’ +
‘<div>’ +
‘<div class="rb-name">’ + esc(b.name) + (b.shiny ? ’ <span style="font-size:13px;">✨</span>’ : ‘’) + ‘</div>’ +
‘<div class="rb-meta" style="color:' + tc + ';">’ + tierLabel(t) + ’ ’ + stars(t) + ‘</div>’ +
‘<div class="rb-types">’ + (b.types || []).map(typePill).join(’’) + ‘</div>’ +
‘</div></div>’;
});
});
el.innerHTML = h || ‘<div style="color:#8090a8;font-size:12px;">No bosses loaded</div>’;
}

// ─── RAIDS PANE ──────────────────────────────────────────────
function setRaidFilter(f) {
S.raidFilter = f;
document.querySelectorAll(’.fpill’).forEach(function(p) {
p.classList.toggle(‘on’,  p.dataset.f === f);
p.classList.toggle(‘off’, p.dataset.f !== f);
});
renderRaidBosses();
}

function renderRaidBosses() {
var el = $(‘bossGrid’); if (!el) return;

if (!S.raidBosses.length) {
el.innerHTML = ‘<div class="empty-state"><div class="em-icon">⏳</div><p>Fetching live raid bosses…</p></div>’;
return;
}

var search = S.raidSearch.toLowerCase();
var bosses = S.raidBosses.filter(function(b) {
// Filter by tier
var ok = true;
if (S.raidFilter === ‘t1’)     ok = (b.tier === 1);
if (S.raidFilter === ‘t3’)     ok = (b.tier === 3);
if (S.raidFilter === ‘t5’)     ok = (b.tier === 5 || b.tier === 6);
if (S.raidFilter === ‘mega’)   ok = (b.tier === 7);
if (S.raidFilter === ‘shadow’) ok = (b.tier === 8);
// Search
if (search && ok) ok = b.name.toLowerCase().indexOf(search) >= 0;
return ok;
});

if (!bosses.length) {
el.innerHTML = ‘<div class="empty-state"><div class="em-icon">🔍</div><p>No bosses match your filter.</p></div>’;
return;
}

var h = ‘’;
bosses.forEach(function(b) {
var tc      = tierColor(b.tier);
var weak    = getWeaknesses(b.types || []);
var weakArr = Object.keys(weak).sort(function(a,d) { return weak[d]-weak[a]; });
var typeStr = (b.types||[]).map(typePill).join(’’);
var weakStr = weakArr.slice(0,6).map(function(t) { return weakPill(t, weak[t]); }).join(‘’);

h += ‘<div class="boss-card">’ +
‘<div class="boss-img-wrap">’ +
‘<img src="’ + CFG.SPRITE(b.pid) + ‘" width="64" height="64">’ +
(b.shiny ? ‘<span class="shiny-star">&#x2728;</span>’ : ‘’) +
‘</div>’ +
‘<div class="boss-info">’ +
‘<div class="boss-name">’ + esc(b.name) + ‘</div>’ +
‘<div class="boss-tier" style="color:’ + tc + ‘;">’ + tierLabel(b.tier) + ‘ ‘ + stars(b.tier) + ‘</div>’ +
‘<div class="boss-types">’ + typeStr + ‘</div>’ +
‘<div class="boss-weak-label">Weak to</div>’ +
‘<div class="boss-weak">’ + weakStr + ‘</div>’ +
(b.cp100 ? ‘<div class="boss-cp">100% CP: ‘ + b.cp100 + ‘</div>’ : ‘’) +
‘</div></div>’;

});
el.innerHTML = h;
}

// ─── GUIDE PANE ──────────────────────────────────────────────
function switchGuide(section) {
S.activeGuide = section;
document.querySelectorAll(’.gtab’).forEach(function(g) {
g.classList.toggle(‘on’, g.dataset.g === section);
});
renderGuideSection(section);
}

function renderGuideSection(section) {
document.querySelectorAll(’.guide-section’).forEach(function(s) {
s.classList.toggle(‘vis’, s.id === ‘guide-’ + section);
});

if (section === ‘shinies’) renderShinies();
if (section === ‘dittos’)  renderDittos();
if (section === ‘nests’)   renderNests();
if (section === ‘weather’) renderWeatherGuide();
if (section === ‘migrate’) renderMigration();
}

function renderShinies(filter) {
var el = $(‘shinyList’); if (!el) return;
var keys = Object.keys(S.shinies);
if (!keys.length) { el.innerHTML = ‘<div class="empty-state"><div class="em-icon">⏳</div><p>Loading shiny data…</p></div>’; return; }

var search = (filter || ‘’).toLowerCase();
var h = ‘’;
keys.forEach(function(k) {
var p = S.shinies[k];
if (search && p.name.toLowerCase().indexOf(search) < 0) return;

var tags = '';
if (p.found_wild)     tags += '<span class="guide-tag tag-wild">Wild</span>';
if (p.found_raid)     tags += '<span class="guide-tag tag-raid">Raid</span>';
if (p.found_egg)      tags += '<span class="guide-tag tag-egg">Egg</span>';
if (p.found_evolution)tags += '<span class="guide-tag tag-evo">Evolve</span>';
if (p.found_research) tags += '<span class="guide-tag tag-research">Research</span>';

h += '<div class="guide-item">' +
'<img src="' + CFG.SHINY_SPR(p.id) + '" width="40" height="40" loading="lazy">' +
'<div class="guide-item-name">' + esc(p.name) + '</div>' +
'<div class="guide-item-tags">' + tags + '</div>' +
'</div>';

});
el.innerHTML = h || ‘<div class="empty-state"><p>No results.</p></div>’;
}

function renderDittos() {
var el = $(‘dittoList’); if (!el) return;
var keys = Object.keys(S.dittos);
if (!keys.length) { el.innerHTML = ‘<div class="empty-state"><div class="em-icon">⏳</div><p>Loading…</p></div>’; return; }
var h = ‘<p style="font-size:12px;color:#8090a8;margin-bottom:12px;">These Pokémon can be a Ditto in disguise. It will reveal itself once caught!</p>’;
keys.forEach(function(k) {
var p = S.dittos[k];
h += ‘<div class="guide-item">’ +
‘<img src="' + CFG.SPRITE(p.id) + '" width="40" height="40" loading="lazy">’ +
‘<div class="guide-item-name">’ + esc(p.name) + ‘</div>’ +
‘<span class="guide-tag tag-ditto">Ditto?</span>’ +
‘</div>’;
});
el.innerHTML = h;
}

function renderNests() {
var el = $(‘nestList’); if (!el) return;
var keys = Object.keys(S.nests);
if (!keys.length) { el.innerHTML = ‘<div class="empty-state"><div class="em-icon">⏳</div><p>Loading…</p></div>’; return; }
var h = nestMigrationHTML(false) +
‘<p style="font-size:12px;color:#8090a8;margin-bottom:12px;">These species can appear at nests (parks/natural areas). Nests migrate every 2 weeks on Thursdays 01:00 UTC.</p>’;
keys.forEach(function(k) {
var p = S.nests[k];
h += ‘<div class="guide-item">’ +
‘<img src="' + CFG.SPRITE(p.id) + '" width="40" height="40" loading="lazy">’ +
‘<div class="guide-item-name">’ + esc(p.name) + ‘</div>’ +
‘<span class="guide-tag tag-nest">Nesting</span>’ +
‘</div>’;
});
el.innerHTML = h;
}

function renderWeatherGuide() {
var el = $(‘wxGuide’); if (!el) return;
var h = ‘<table class="wx-table"><thead><tr><th>Weather</th><th>PoGo Condition</th><th>Boosted Types</th></tr></thead><tbody>’;
Object.keys(POGO_WX).forEach(function(k) {
var wx = POGO_WX[k];
var active = (k === S.wxCode);
h += ‘<tr’ + (active?’ class=“active-wx”’:’’) + ‘>’ +
‘<td>’ + wx.icon + ‘</td>’ +
‘<td>’ + wx.label + (active ? ’ <span class="wx-now">Now</span>’ : ‘’) + ‘</td>’ +
‘<td>’ + wx.boost.map(typePill).join(’ ’) + ‘</td>’ +
‘</tr>’;
});
h += ‘</tbody></table>’;
h += ‘<p style="font-size:12px;color:#8090a8;margin-top:12px;line-height:1.6;">Boosted Pokémon spawn more frequently, at up to Lv35 in the wild, and deal +20% damage in battles.</p>’;
el.innerHTML = h;
}

function renderMigration() {
var el = $(‘migrateSection’); if (!el) return;
el.innerHTML = nestMigrationHTML(false) +
‘<p style="font-size:12px;color:#8090a8;line-height:1.6;margin-top:10px;">Nest migrations happen every 2 weeks on Thursday at 01:00 UTC. All nests worldwide switch to a different species simultaneously.</p>’;
}

// Nest migration countdown
function nestMigrationHTML(compact) {
var now = new Date();
// Find next Thursday 01:00 UTC, on a 2-week cycle
// Epoch of a known migration: Jan 2 2025 01:00 UTC (Thursday)
var epoch = new Date(‘2025-01-02T01:00:00Z’).getTime();
var cycle = 14 * 24 * 60 * 60 * 1000; // 2 weeks ms
var elapsed = now.getTime() - epoch;
var next = new Date(epoch + (Math.floor(elapsed / cycle) + 1) * cycle);
var diff = next - now;

var d = Math.floor(diff / 86400000);
var h = Math.floor((diff % 86400000) / 3600000);
var m = Math.floor((diff % 3600000) / 60000);
var timeStr = d + ’d ’ + h + ’h ’ + m + ‘m’;

if (compact) {
return ‘<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);">’ +
‘<div style="font-size:10px;font-weight:700;color:#8090a8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Next Nest Migration</div>’ +
‘<div style="font-size:14px;font-weight:800;color:#00e676;font-family:\'JetBrains Mono\',monospace;">’ + timeStr + ‘</div>’ +
‘</div>’;
}

return ‘<div class="migration-card">’ +
‘<div class="migration-icon">🏠</div>’ +
‘<div><div class="migration-title">Next Nest Migration</div>’ +
‘<div class="migration-time">’ + timeStr + ‘</div>’ +
‘<div class="migration-sub">’ + next.toUTCString() + ‘</div>’ +
‘</div></div>’;
}

// ─── ME PANE ─────────────────────────────────────────────────
function renderProfile() {
var tc = $(‘trainerCard’); if (!tc) return;
tc.className = ’trainer-card ’ + (S.team || ‘none’);
$(‘trainerName’).textContent = S.user || ‘—’;
$(‘trainerTeam’).textContent = S.team ? (’Team ’ + cap(S.team)) : ‘No team’;
$(‘groupDisplay’).textContent = S.group;

renderDataSources();
renderMigration();
}

function renderDataSources() {
var el = $(‘dataSources’); if (!el) return;
el.innerHTML = [
{ dot:‘ds-live’, label:‘Raid Bosses’,     src:‘pogoapi.net’,   ok: S.raidBosses.length > 0 },
{ dot:‘ds-live’, label:‘Shiny List’,      src:‘pogoapi.net’,   ok: Object.keys(S.shinies).length > 0 },
{ dot:‘ds-live’, label:‘Ditto Disguises’, src:‘pogoapi.net’,   ok: Object.keys(S.dittos).length > 0 },
{ dot:‘ds-live’, label:‘Nest Species’,    src:‘pogoapi.net’,   ok: Object.keys(S.nests).length > 0 },
{ dot:‘ds-real’, label:‘Biome Zones’,     src:‘OpenStreetMap’, ok: true },
{ dot:‘ds-real’, label:‘Weather Boosts’,  src:‘OpenWeatherMap’,ok: !!S.wxCode },
{ dot:‘ds-no’,   label:‘Live Spawns’,     src:‘Not available’, ok: false },
].map(function(r) {
return ‘<div class="data-source">’ +
‘<div class="ds-dot ' + r.dot + '"></div>’ +
‘<div class="ds-label">’ + r.label + ’ <span style="color:#5a6a82;font-size:11px;">— ’ + r.src + ‘</span></div>’ +
‘<div class="ds-status" style="color:' + (r.ok?'#00e676':'#ff4b4b') + ';">’ + (r.ok?‘✓’:’—’) + ‘</div>’ +
‘</div>’;
}).join(’’);
}

function saveFriendCode() {
var fc = $(‘fcInput’) ? $(‘fcInput’).value.trim() : ‘’;
localStorage.setItem(CFG.FC_LS, fc);
showToast(‘Friend code saved!’);
}

function copyFriendCode() {
var fc = $(‘fcInput’) ? $(‘fcInput’).value.trim() : ‘’;
if (!fc) { showToast(‘Enter your friend code first’); return; }
navigator.clipboard.writeText(fc).then(function() { showToast(‘Copied!’); });
}

function saveOWMKey() {
var key = $(‘owmInput’) ? $(‘owmInput’).value.trim() : ‘’;
localStorage.setItem(CFG.OWM_LS, key);
showToast(‘OWM key saved! Refresh weather on Map tab.’);
}

function leaveGroup() {
if (confirm(‘Leave this group and return to Global chat?’)) {
S.group = ‘GLOBAL’;
$(‘groupDisplay’).textContent = ‘GLOBAL’;
if (S.ably) S.ably.close();
connectAbly();
showToast(‘Rejoined Global chat’);
}
}

// ─── API FETCH LAYER ─────────────────────────────────────────
function fetchAllData() {
fetchRaidBosses();
fetchShinies();
fetchDittos();
fetchNestingPokemon();
}

function fetchRaidBosses() {
fetch(CFG.POGOAPI + ‘current_raid_bosses.json’)
.then(function(r) { return r.json(); })
.then(function(data) {
S.raidBosses = [];
var tierMap = { ‘1’:1, ‘3’:3, ‘5’:5, ‘6’:6, ‘mega’:7, ‘shadow’:8 };
Object.keys(data).forEach(function(key) {
var tier = tierMap[key] || parseInt(key) || 5;
(data[key] || []).forEach(function(b) {
S.raidBosses.push({
pid:   b.pokemon_id || 25,
name:  b.name || ‘?’,
tier:  tier,
shiny: !!b.shiny_available,
types: b.types ? b.types.map(function(t){ return typeof t===‘string’?t:(t.type||t); }) : [],
cp100: b.perfect_cp || null
});
});
});
// Also fetch type data for bosses without types using pokemon-go-api GitHub
enrichBossTypes().then(function() {
renderRaidBosses();
renderRaidBoard();
populateBossAutocomplete();
});
})
.catch(function() {
// Hardcoded fallback
S.raidBosses = [
{pid:382,name:‘Kyogre’,    tier:5,shiny:true, types:[‘Water’]},
{pid:384,name:‘Rayquaza’,  tier:5,shiny:true, types:[‘Dragon’,‘Flying’]},
{pid:249,name:‘Lugia’,     tier:5,shiny:true, types:[‘Psychic’,‘Flying’]},
{pid:248,name:‘Tyranitar’, tier:4,shiny:true, types:[‘Rock’,‘Dark’]},
{pid:373,name:‘Salamence’, tier:4,shiny:true, types:[‘Dragon’,‘Flying’]},
{pid:131,name:‘Lapras’,    tier:3,shiny:true, types:[‘Water’,‘Ice’]},
{pid:143,name:‘Snorlax’,   tier:3,shiny:true, types:[‘Normal’]},
{pid:35, name:‘Clefairy’,  tier:1,shiny:true, types:[‘Fairy’]},
{pid:129,name:‘Magikarp’,  tier:1,shiny:true, types:[‘Water’]},
];
renderRaidBosses();
renderRaidBoard();
populateBossAutocomplete();
});
}

// Enrich boss type data from pokemon-go-api GitHub (has more complete type info)
function enrichBossTypes() {
return fetch(CFG.POGO_GH + ‘raidboss.json’)
.then(function(r) { return r.json(); })
.then(function(data) {
var list = data.currentList || data;
if (!Array.isArray(list)) return;
list.forEach(function(entry) {
var pkm = entry.pokemon || entry;
var dex = pkm.dexNr || pkm.id;
if (!dex) return;
var types = [];
var tList = (pkm.primaryType ? [pkm.primaryType] : []).concat(pkm.secondaryType ? [pkm.secondaryType] : []);
if (pkm.types) tList = pkm.types;
tList.forEach(function(t) {
var tname = (t && t.names && t.names.English) || (t && t.type && t.type.names && t.type.names.English) || (typeof t === ‘string’ ? t : null);
if (tname) types.push(tname);
});
if (types.length) {
S.raidBosses.forEach(function(b) {
if (b.pid === dex && !b.types.length) b.types = types;
});
}
});
})
.catch(function() {/* ignore - already have fallback types */});
}

function populateBossAutocomplete() {
var dl = $(‘bossDL’); if (!dl) return;
dl.innerHTML = ‘’;
S.raidBosses.forEach(function(b) {
var o = document.createElement(‘option’); o.value = b.name; dl.appendChild(o);
});
}

function fetchShinies() {
fetch(CFG.POGOAPI + ‘shiny_pokemon.json’)
.then(function(r) { return r.json(); })
.then(function(data) {
S.shinies = data;
if (S.activeTab === ‘guide’ && S.activeGuide === ‘shinies’) renderShinies();
})
.catch(function() {});
}

function fetchDittos() {
fetch(CFG.POGOAPI + ‘possible_ditto_pokemon.json’)
.then(function(r) { return r.json(); })
.then(function(data) {
S.dittos = data;
if (S.activeTab === ‘guide’ && S.activeGuide === ‘dittos’) renderDittos();
})
.catch(function() {});
}

function fetchNestingPokemon() {
fetch(CFG.POGOAPI + ‘nesting_pokemon.json’)
.then(function(r) { return r.json(); })
.then(function(data) {
S.nests = data;
if (S.activeTab === ‘guide’ && S.activeGuide === ‘nests’) renderNests();
})
.catch(function() {});
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg) {
var t = document.createElement(‘div’);
t.style.cssText = ‘position:fixed;bottom:90px;left:50%;transform:translateX(-50%);’ +
‘background:#0c1220;border:1px solid rgba(255,255,255,0.15);color:#e8edf5;’ +
‘padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;’ +
‘z-index:99999;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.5);’ +
‘animation:popIn .3s ease;’;
t.textContent = msg;
document.body.appendChild(t);
setTimeout(function() { t.remove(); }, 2200);
}

// ─── FLOAT MODE ──────────────────────────────────────────────
function toggleFloat() {
var app = $(‘app’), btn = $(‘floatBtn’);
S.isFloat = !S.isFloat;
app.classList.toggle(‘float-mode’, S.isFloat);
btn.classList.toggle(‘vis’, S.isFloat);
if (S.mapObj) setTimeout(function() { S.mapObj.invalidateSize(); }, 200);
}

// ─── SHARE ───────────────────────────────────────────────────
function shareGroup() {
var txt = S.group === ‘GLOBAL’
? ‘Join me on PokeRaid! pogo-gc.vercel.app’
: ’PokeRaid group code: ’ + S.group;
if (navigator.share) {
navigator.share({ text:txt, url:‘https://pogo-gc.vercel.app’ }).catch(function() {});
} else {
navigator.clipboard.writeText(txt).then(function() { showToast(‘Copied!’); });
}
}

function leaveChat() {
if (confirm(‘Leave PokeRaid?’)) {
if (S.ably) S.ably.close();
location.reload();
}
}

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener(‘DOMContentLoaded’, function() {
// Enter key on login name
var ni = $(‘loginName’);
if (ni) ni.addEventListener(‘keydown’, function(e) { if (e.key === ‘Enter’) joinChat(); });

// Enter key on chat
var mi = $(‘msgIn’);
if (mi) mi.addEventListener(‘keydown’, function(e) { if (e.key === ‘Enter’) sendMsg(); });

// Raid search
var rs = $(‘raidSearch’);
if (rs) rs.addEventListener(‘input’, function() { S.raidSearch = this.value; renderRaidBosses(); });

// Shiny search
var ss = $(‘shinySearch’);
if (ss) ss.addEventListener(‘input’, function() { renderShinies(this.value); });

// Start on chat tab
goTab(‘chat’);
});