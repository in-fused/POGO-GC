/* PokeRaid — Map, biomes, weather, raid board */
'use strict';

// ─── MAP INIT ────────────────────────────────────────────────
function initMap() {
  if (S.mapObj) return;

  S.mapObj = L.map('map', { zoomControl:false, attributionControl:false })
    .setView([40.7128, -74.006], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd'
  }).addTo(S.mapObj);

  L.control.zoom({ position:'topright' }).addTo(S.mapObj);

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
        $('wLoad').textContent = '&#x1F4CD; Enable location for live weather';
        fetchOSMBiomes();
      }
    );
    navigator.geolocation.watchPosition(
      function(pos) {
        S.lat = pos.coords.latitude;
        S.lng = pos.coords.longitude;
        if (S.userMarker) S.userMarker.setLatLng([S.lat, S.lng]);
      },
      null,
      { enableHighAccuracy:true, maximumAge:15000 }
    );
  } else {
    $('wLoad').textContent = 'Location not supported';
    fetchOSMBiomes();
  }
}

function addUserDot() {
  var icon = L.divIcon({
    html: '<div class="user-dot"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10], className: ''
  });
  S.userMarker = L.marker([S.lat, S.lng], { icon:icon, zIndexOffset:2000 }).addTo(S.mapObj);
}

function centerMap() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    S.lat = pos.coords.latitude;
    S.lng = pos.coords.longitude;
    if (S.mapObj)     S.mapObj.setView([S.lat, S.lng], 16);
    if (S.userMarker) S.userMarker.setLatLng([S.lat, S.lng]);
  });
}

// ─── OSM BIOMES ──────────────────────────────────────────────
function fetchOSMBiomes() {
  var lat = S.lat || 40.7128;
  var lng = S.lng || -74.006;
  var R   = 0.016;
  var bb  = (lat - R) + ',' + (lng - R) + ',' + (lat + R) + ',' + (lng + R);
  var q   = '[out:json][timeout:25];(' +
    'way["leisure"="park"]('         + bb + ');' +
    'way["landuse"="park"]('         + bb + ');' +
    'way["landuse"="grass"]('        + bb + ');' +
    'way["landuse"="forest"]('       + bb + ');' +
    'way["natural"="wood"]('         + bb + ');' +
    'way["natural"="water"]('        + bb + ');' +
    'way["water"]('                  + bb + ');' +
    'way["waterway"="river"]('       + bb + ');' +
    ');(._;>;);out body;';

  fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body:   'data=' + encodeURIComponent(q)
  })
    .then(function(r) { return r.json(); })
    .then(renderBiomes)
    .catch(function(e) { console.warn('OSM load failed:', e); });
}

function renderBiomes(data) {
  var nodes = {};
  data.elements.forEach(function(el) {
    if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
  });

  var parks = 0, water = 0;
  data.elements.forEach(function(el) {
    if (el.type !== 'way' || !el.nodes) return;
    var coords = el.nodes.map(function(n) { return nodes[n]; }).filter(Boolean);
    if (coords.length < 3) return;
    var t  = el.tags || {};
    var isW = t.natural === 'water' || !!t.waterway || !!t.water;
    var isP = t.leisure === 'park'  || t.landuse === 'park' || t.landuse === 'grass' ||
              t.landuse === 'forest' || t.natural === 'wood';

    if (isW) {
      L.polygon(coords, {
        color: 'rgba(104,144,240,0.65)', weight: 1.5,
        fillColor: 'rgba(104,144,240,0.18)', fillOpacity: 1
      }).addTo(S.mapObj).bindPopup(biomePopup('water', t.name), { className:'dk-popup' });
      water++;
    } else if (isP) {
      L.polygon(coords, {
        color: 'rgba(0,230,118,0.55)', weight: 1.5,
        fillColor: 'rgba(0,230,118,0.12)', fillOpacity: 1
      }).addTo(S.mapObj).bindPopup(biomePopup('park', t.name), { className:'dk-popup' });
      parks++;
    }
  });

  updateBiomePanel(parks, water);
}

function biomePopup(type, name) {
  var w     = (type === 'water');
  var lbl   = w ? '&#x1F4A7; Water Zone' : '&#x1F33F; Park / Nature';
  var cls   = w ? 'lbl-water' : 'lbl-park';
  var types = w ? ['Water','Ice','Electric'] : ['Grass','Bug','Normal','Poison'];
  return '<div class="mpop">' +
    '<div class="mpop-lbl ' + cls + '">' + lbl + '</div>' +
    '<div class="mpop-name">' + esc(name || (w ? 'Water Body' : 'Park')) + '</div>' +
    '<div class="mpop-sub">Expect more ' + types.slice(0,2).join(' &amp; ') + ' types here</div>' +
    '<div class="mpop-types">' + types.map(typePill).join('') + '</div>' +
    '</div>';
}

function updateBiomePanel(parks, water) {
  var p = $('biomeP');
  if (!p || (!parks && !water)) return;
  p.classList.add('vis');
  var h = '<div class="bp-title">Nearby Biomes</div>';
  if (parks) h += '<div class="bp-row"><div class="bp-dot" style="background:#00e676;"></div>' +
    '<div><div class="bp-name">' + parks + ' Park Zone' + (parks > 1 ? 's' : '') + '</div>' +
    '<div class="bp-types">Grass \u00B7 Bug \u00B7 Normal</div></div></div>';
  if (water) h += '<div class="bp-row"><div class="bp-dot" style="background:#6890F0;"></div>' +
    '<div><div class="bp-name">' + water + ' Water Zone' + (water > 1 ? 's' : '') + '</div>' +
    '<div class="bp-types">Water \u00B7 Ice \u00B7 Electric</div></div></div>';
  h += nestMigrationHTML(true);
  p.innerHTML = h;
}

// ─── WEATHER ─────────────────────────────────────────────────
function fetchWeather() {
  if (!S.lat) return;
  var owm = localStorage.getItem(CFG.OWM_LS);
  if (!owm || owm === 'PASTE_YOUR_KEY_HERE') { fallbackWeather(); return; }

  fetch('https://api.openweathermap.org/data/2.5/weather?lat=' + S.lat +
        '&lon=' + S.lng + '&appid=' + owm + '&units=imperial')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.cod !== 200) { fallbackWeather(); return; }
      var code  = d.weather[0].id;
      var isDay = (d.dt > d.sys.sunrise && d.dt < d.sys.sunset);
      var wind  = (d.wind && d.wind.speed) || 0;
      var pg    = owmToPoGo(code, isDay, wind);
      showWeatherHUD(pg, Math.round(d.main.temp) + '\u00B0F', d.weather[0].description);
    })
    .catch(fallbackWeather);
}

function fallbackWeather() {
  var m  = new Date().getMonth();
  var pg = 'PARTLY_CLOUDY';
  if (m >= 11 || m <= 1) pg = 'SNOW';
  else if (m >= 6 && m <= 8) pg = 'SUNNY';
  showWeatherHUD(pg, '\u2014', 'Add OWM key in Me tab');
}

function showWeatherHUD(pgCode, temp, desc) {
  S.wxCode = pgCode;
  var wx = POGO_WX[pgCode];
  $('wLoad').style.display = 'none';
  var body = $('wBody');
  body.classList.add('on');
  $('wIcon').textContent = wx.icon;
  $('wCond').textContent = desc;
  $('wTemp').textContent = temp;
  $('wLabel').textContent = wx.label + ' in PoGo';
  $('wTypes').innerHTML   = wx.boost.map(typePill).join('');
}

function refreshWeather() { fetchWeather(); }

// ─── RAID BOARD ──────────────────────────────────────────────
function toggleRaidBoard() {
  S.rbOpen = !S.rbOpen;
  $('raidBoard').classList.toggle('open', S.rbOpen);
}

function renderRaidBoard() {
  var el = $('rbContent');
  if (!el) return;
  if (!S.raidBosses.length) {
    el.innerHTML = '<div style="color:#8090a8;font-size:12px;">Loading\u2026</div>';
    return;
  }

  var tiers = [[5,'5-star'],[6,'5-star+'],[7,'Mega'],[8,'Shadow'],[3,'3-star'],[1,'1-star']];
  var h = '';
  tiers.forEach(function(tv) {
    var t      = tv[0];
    var bosses = S.raidBosses.filter(function(b) { return b.tier === t; });
    if (!bosses.length) return;
    var tc = tierColor(t);
    h += '<div class="rb-tier-lbl" style="color:' + tc + ';">' + stars(t) + ' ' + tierLabel(t) + '</div>';
    bosses.forEach(function(b) {
      h += '<div class="rb-card">' +
        '<img src="' + CFG.SPRITE(b.pid) + '" width="44" height="44">' +
        '<div>' +
        '<div class="rb-name">' + esc(b.name) + (b.shiny ? ' <span style="font-size:13px;">&#x2728;</span>' : '') + '</div>' +
        '<div class="rb-meta" style="color:' + tc + ';">' + tierLabel(t) + ' ' + stars(t) + '</div>' +
        '<div class="rb-types">' + (b.types || []).map(typePill).join('') + '</div>' +
        '</div></div>';
    });
  });
  el.innerHTML = h || '<div style="color:#8090a8;font-size:12px;">No bosses loaded</div>';
}
