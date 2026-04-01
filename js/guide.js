/* PokeRaid — Guide pane: shinies, dittos, nests, weather, migration */
'use strict';

function switchGuide(section) {
  S.activeGuide = section;
  document.querySelectorAll('.gtab').forEach(function(g) {
    g.classList.toggle('on', g.dataset.g === section);
  });
  renderGuideSection(section);
}

function renderGuideSection(section) {
  document.querySelectorAll('.guide-section').forEach(function(s) {
    s.classList.toggle('vis', s.id === 'guide-' + section);
  });
  if (section === 'shinies') renderShinies();
  if (section === 'dittos')  renderDittos();
  if (section === 'nests')   renderNests();
  if (section === 'weather') renderWeatherGuide();
  if (section === 'migrate') renderMigration();
}

function renderShinies(filter) {
  var el   = $('shinyList');
  if (!el) return;
  var keys = Object.keys(S.shinies);
  if (!keys.length) {
    el.innerHTML = '<div class="empty-state"><div class="em-icon">&#x23F3;</div><p>Loading shiny data\u2026</p></div>';
    return;
  }

  var search = (filter || '').toLowerCase();
  var h = '';
  keys.forEach(function(k) {
    var p = S.shinies[k];
    if (search && p.name.toLowerCase().indexOf(search) < 0) return;

    var tags = '';
    if (p.found_wild)      tags += '<span class="guide-tag tag-wild">Wild</span>';
    if (p.found_raid)      tags += '<span class="guide-tag tag-raid">Raid</span>';
    if (p.found_egg)       tags += '<span class="guide-tag tag-egg">Egg</span>';
    if (p.found_evolution) tags += '<span class="guide-tag tag-evo">Evolve</span>';
    if (p.found_research)  tags += '<span class="guide-tag tag-research">Research</span>';

    h += '<div class="guide-item">' +
      '<img src="' + CFG.SHINY_SPR(p.id) + '" width="40" height="40" loading="lazy">' +
      '<div>' +
      '<div class="guide-item-name">' + esc(p.name) + '</div>' +
      '<div class="guide-item-tags">' + tags + '</div>' +
      '</div></div>';
  });
  el.innerHTML = h || '<div class="empty-state"><p>No results.</p></div>';
}

function renderDittos() {
  var el   = $('dittoList');
  if (!el) return;
  var keys = Object.keys(S.dittos);
  if (!keys.length) {
    el.innerHTML = '<div class="empty-state"><div class="em-icon">&#x23F3;</div><p>Loading\u2026</p></div>';
    return;
  }
  var h = '<p style="font-size:12px;color:#8090a8;margin-bottom:12px;">These Pok\u00E9mon can be a Ditto in disguise. It will reveal itself once caught!</p>';
  keys.forEach(function(k) {
    var p = S.dittos[k];
    h += '<div class="guide-item">' +
      '<img src="' + CFG.SPRITE(p.id) + '" width="40" height="40" loading="lazy">' +
      '<div>' +
      '<div class="guide-item-name">' + esc(p.name) + '</div>' +
      '<span class="guide-tag tag-ditto">Ditto?</span>' +
      '</div></div>';
  });
  el.innerHTML = h;
}

function renderNests() {
  var el   = $('nestList');
  if (!el) return;
  var keys = Object.keys(S.nests);
  if (!keys.length) {
    el.innerHTML = '<div class="empty-state"><div class="em-icon">&#x23F3;</div><p>Loading\u2026</p></div>';
    return;
  }
  var h = nestMigrationHTML(false) +
    '<p style="font-size:12px;color:#8090a8;margin-bottom:12px;">These species can appear at nests (parks/natural areas). Nests migrate every 2 weeks on Thursdays 01:00 UTC.</p>';
  keys.forEach(function(k) {
    var p = S.nests[k];
    h += '<div class="guide-item">' +
      '<img src="' + CFG.SPRITE(p.id) + '" width="40" height="40" loading="lazy">' +
      '<div>' +
      '<div class="guide-item-name">' + esc(p.name) + '</div>' +
      '<span class="guide-tag tag-nest">Nesting</span>' +
      '</div></div>';
  });
  el.innerHTML = h;
}

function renderWeatherGuide() {
  var el = $('wxGuide');
  if (!el) return;
  var h = '<table class="wx-table"><thead><tr><th>Weather</th><th>PoGo Condition</th><th>Boosted Types</th></tr></thead><tbody>';
  Object.keys(POGO_WX).forEach(function(k) {
    var wx     = POGO_WX[k];
    var active = (k === S.wxCode);
    h += '<tr' + (active ? ' class="active-wx"' : '') + '>' +
      '<td>' + wx.icon + '</td>' +
      '<td>' + wx.label + (active ? ' <span class="wx-now">Now</span>' : '') + '</td>' +
      '<td>' + wx.boost.map(typePill).join(' ') + '</td>' +
      '</tr>';
  });
  h += '</tbody></table>';
  h += '<p style="font-size:12px;color:#8090a8;margin-top:12px;line-height:1.6;">Boosted Pok\u00E9mon spawn more frequently, at up to Lv35 in the wild, and deal +20% damage in battles.</p>';
  el.innerHTML = h;
}

function renderMigration() {
  var el = $('migrateSection');
  if (!el) return;
  el.innerHTML = nestMigrationHTML(false) +
    '<p style="font-size:12px;color:#8090a8;line-height:1.6;margin-top:10px;">Nest migrations happen every 2 weeks on Thursday at 01:00 UTC. All nests worldwide switch to a different species simultaneously.</p>';
}

// Shared nest migration countdown — compact=true for biome panel inline version
function nestMigrationHTML(compact) {
  var now   = new Date();
  var epoch = new Date('2025-01-02T01:00:00Z').getTime();
  var cycle = 14 * 24 * 60 * 60 * 1000;
  var elapsed = now.getTime() - epoch;
  var next    = new Date(epoch + (Math.floor(elapsed / cycle) + 1) * cycle);
  var diff    = next - now;

  var d = Math.floor(diff / 86400000);
  var h = Math.floor((diff % 86400000) / 3600000);
  var m = Math.floor((diff % 3600000)  / 60000);
  var timeStr = d + 'd ' + h + 'h ' + m + 'm';

  if (compact) {
    return '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);">' +
      '<div style="font-size:10px;font-weight:700;color:#8090a8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Next Nest Migration</div>' +
      '<div style="font-size:14px;font-weight:800;color:#00e676;font-family:\'JetBrains Mono\',monospace;">' + timeStr + '</div>' +
      '</div>';
  }

  return '<div class="migration-card">' +
    '<div class="migration-icon">&#x1F3E0;</div>' +
    '<div>' +
    '<div class="migration-title">Next Nest Migration</div>' +
    '<div class="migration-time">' + timeStr + '</div>' +
    '<div class="migration-sub">' + next.toUTCString() + '</div>' +
    '</div></div>';
}
