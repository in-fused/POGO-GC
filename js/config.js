/* PokeRaid — Config, type data, weather mapping */
'use strict';

// ─── APP CONFIG ──────────────────────────────────────────────
var CFG = {
  ABLY_KEY:  'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM',
  OWM_LS:    'pr_owm_key',
  FC_LS:     'pr_friend_code',
  SPRITE:    function(id) { return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + id + '.png'; },
  SHINY_SPR: function(id) { return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/' + id + '.png'; },
  POGOAPI:   'https://pogoapi.net/api/v1/',
  POGO_GH:   'https://pokemon-go-api.github.io/pokemon-go-api/api/'
};

// ─── POGO WEATHER MAPPING ────────────────────────────────────
// OWM condition codes → PoGo in-game weather → boosted types
var POGO_WX = {
  SUNNY:         { label:'Sunny / Clear',  icon:'☀️',  boost:['Fire','Grass','Ground'] },
  RAINY:         { label:'Rainy',          icon:'🌧️',  boost:['Water','Electric','Bug'] },
  PARTLY_CLOUDY: { label:'Partly Cloudy',  icon:'⛅',  boost:['Normal','Rock'] },
  CLOUDY:        { label:'Cloudy',         icon:'☁️',  boost:['Fairy','Fighting','Poison'] },
  WINDY:         { label:'Windy',          icon:'🌬️',  boost:['Dragon','Flying','Psychic'] },
  SNOW:          { label:'Snow',           icon:'❄️',  boost:['Ice','Steel'] },
  FOG:           { label:'Fog',            icon:'🌫️',  boost:['Dark','Ghost'] }
};

function owmToPoGo(code, isDay, windMs) {
  var pg;
  if      (code >= 200 && code < 600) pg = 'RAINY';
  else if (code >= 600 && code < 700) pg = 'SNOW';
  else if (code === 701 || code === 741) pg = 'FOG';
  else if (code >= 700 && code < 800) pg = 'PARTLY_CLOUDY';
  else if (code === 800) pg = isDay ? 'SUNNY' : 'PARTLY_CLOUDY';
  else if (code <= 802) pg = 'PARTLY_CLOUDY';
  else pg = 'CLOUDY';
  if (windMs >= 10) pg = 'WINDY';
  return pg;
}

// ─── TYPE COLOURS ────────────────────────────────────────────
var TYPE_BG = {
  Normal:'#A8A878',   Fire:'#F08030',   Water:'#6890F0',  Electric:'#F8D030',
  Grass:'#78C850',    Ice:'#98D8D8',    Fighting:'#C03028', Poison:'#A040A0',
  Ground:'#E0C068',   Flying:'#A890F0', Psychic:'#F85888',  Bug:'#A8B820',
  Rock:'#B8A038',     Ghost:'#705898',  Dragon:'#7038F8',   Dark:'#705848',
  Steel:'#B8B8D0',    Fairy:'#EE99AC'
};
var TYPE_DARK_TEXT = { Electric:1, Ice:1, Ground:1, Steel:1, Fairy:1, Normal:1 };

// ─── TYPE CHART ──────────────────────────────────────────────
// Attacker type → defender type → PoGo multiplier (SE=1.6, NE=0.625, immune≈0.39)
var TYPE_CHART = {
  Normal:   { Rock:0.625, Ghost:0.39,  Steel:0.625 },
  Fire:     { Fire:0.625, Water:0.625, Grass:1.6,  Ice:1.6,    Bug:1.6,   Rock:0.625,  Dragon:0.625, Steel:1.6 },
  Water:    { Fire:1.6,   Water:0.625, Grass:0.625, Ground:1.6, Rock:1.6,  Dragon:0.625 },
  Electric: { Water:1.6,  Electric:0.625, Grass:0.625, Ground:0.39, Flying:1.6, Dragon:0.625 },
  Grass:    { Fire:0.625, Water:1.6,  Grass:0.625, Poison:0.625, Ground:1.6, Flying:0.625, Bug:0.625, Rock:1.6, Dragon:0.625, Steel:0.625 },
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

// Returns attacker types that are super-effective vs the given defender types
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
