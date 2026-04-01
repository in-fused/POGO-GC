/* PokeRaid — API data fetching layer */
'use strict';

function fetchAllData() {
  fetchRaidBosses();
  fetchShinies();
  fetchDittos();
  fetchNestingPokemon();
}

function fetchRaidBosses() {
  fetch(CFG.POGOAPI + 'current_raid_bosses.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      S.raidBosses = [];
      var tierMap = { '1':1, '3':3, '5':5, '6':6, 'mega':7, 'shadow':8 };
      Object.keys(data).forEach(function(key) {
        var tier = tierMap[key] || parseInt(key) || 5;
        (data[key] || []).forEach(function(b) {
          S.raidBosses.push({
            pid:   b.pokemon_id || 25,
            name:  b.name       || '?',
            tier:  tier,
            shiny: !!b.shiny_available,
            types: b.types
              ? b.types.map(function(t) { return typeof t === 'string' ? t : (t.type || t); })
              : [],
            cp100: b.perfect_cp || null
          });
        });
      });
      enrichBossTypes().then(function() {
        renderRaidBosses();
        renderRaidBoard();
        populateBossAutocomplete();
      });
    })
    .catch(function() {
      // Hardcoded fallback if API is unreachable
      S.raidBosses = [
        { pid:382, name:'Kyogre',    tier:5, shiny:true,  types:['Water'] },
        { pid:384, name:'Rayquaza',  tier:5, shiny:true,  types:['Dragon','Flying'] },
        { pid:249, name:'Lugia',     tier:5, shiny:true,  types:['Psychic','Flying'] },
        { pid:248, name:'Tyranitar', tier:4, shiny:true,  types:['Rock','Dark'] },
        { pid:373, name:'Salamence', tier:4, shiny:true,  types:['Dragon','Flying'] },
        { pid:131, name:'Lapras',    tier:3, shiny:true,  types:['Water','Ice'] },
        { pid:143, name:'Snorlax',   tier:3, shiny:true,  types:['Normal'] },
        { pid:35,  name:'Clefairy',  tier:1, shiny:true,  types:['Fairy'] },
        { pid:129, name:'Magikarp',  tier:1, shiny:true,  types:['Water'] }
      ];
      renderRaidBosses();
      renderRaidBoard();
      populateBossAutocomplete();
    });
}

// Cross-reference boss types with pokemon-go-api for missing type data
function enrichBossTypes() {
  return fetch(CFG.POGO_GH + 'raidboss.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var list = data.currentList || data;
      if (!Array.isArray(list)) return;
      list.forEach(function(entry) {
        var pkm   = entry.pokemon || entry;
        var dex   = pkm.dexNr    || pkm.id;
        if (!dex) return;
        var types = [];
        var tList = (pkm.primaryType ? [pkm.primaryType] : [])
                    .concat(pkm.secondaryType ? [pkm.secondaryType] : []);
        if (pkm.types) tList = pkm.types;
        tList.forEach(function(t) {
          var tname = (t && t.names && t.names.English) ||
                     (t && t.type  && t.type.names && t.type.names.English) ||
                     (typeof t === 'string' ? t : null);
          if (tname) types.push(tname);
        });
        if (types.length) {
          S.raidBosses.forEach(function(b) {
            if (b.pid === dex && !b.types.length) b.types = types;
          });
        }
      });
    })
    .catch(function() { /* fallback types already set above */ });
}

function populateBossAutocomplete() {
  var dl = $('bossDL');
  if (!dl) return;
  dl.innerHTML = '';
  S.raidBosses.forEach(function(b) {
    var o = document.createElement('option');
    o.value = b.name;
    dl.appendChild(o);
  });
}

function fetchShinies() {
  fetch(CFG.POGOAPI + 'shiny_pokemon.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      S.shinies = data;
      if (S.activeTab === 'guide' && S.activeGuide === 'shinies') renderShinies();
    })
    .catch(function() {});
}

function fetchDittos() {
  fetch(CFG.POGOAPI + 'possible_ditto_pokemon.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      S.dittos = data;
      if (S.activeTab === 'guide' && S.activeGuide === 'dittos') renderDittos();
    })
    .catch(function() {});
}

function fetchNestingPokemon() {
  fetch(CFG.POGOAPI + 'nesting_pokemon.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      S.nests = data;
      if (S.activeTab === 'guide' && S.activeGuide === 'nests') renderNests();
    })
    .catch(function() {});
}
