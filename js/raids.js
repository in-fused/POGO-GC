/* PokeRaid — Raids pane: boss grid and filters */
'use strict';

function setRaidFilter(f) {
  S.raidFilter = f;
  document.querySelectorAll('.fpill').forEach(function(p) {
    p.classList.toggle('on',  p.dataset.f === f);
    p.classList.toggle('off', p.dataset.f !== f);
  });
  renderRaidBosses();
}

function renderRaidBosses() {
  var el = $('bossGrid');
  if (!el) return;

  if (!S.raidBosses.length) {
    el.innerHTML = '<div class="empty-state"><div class="em-icon">&#x23F3;</div><p>Fetching live raid bosses\u2026</p></div>';
    return;
  }

  var search = S.raidSearch.toLowerCase();
  var bosses = S.raidBosses.filter(function(b) {
    var ok = true;
    if (S.raidFilter === 't1')     ok = (b.tier === 1);
    if (S.raidFilter === 't3')     ok = (b.tier === 3);
    if (S.raidFilter === 't5')     ok = (b.tier === 5 || b.tier === 6);
    if (S.raidFilter === 'mega')   ok = (b.tier === 7);
    if (S.raidFilter === 'shadow') ok = (b.tier === 8);
    if (search && ok) ok = b.name.toLowerCase().indexOf(search) >= 0;
    return ok;
  });

  if (!bosses.length) {
    el.innerHTML = '<div class="empty-state"><div class="em-icon">&#x1F50D;</div><p>No bosses match your filter.</p></div>';
    return;
  }

  var h = '';
  bosses.forEach(function(b) {
    var tc      = tierColor(b.tier);
    var weak    = getWeaknesses(b.types || []);
    var weakArr = Object.keys(weak).sort(function(a, d) { return weak[d] - weak[a]; });
    var typeStr = (b.types || []).map(typePill).join('');
    var weakStr = weakArr.slice(0, 6).map(function(t) { return weakPill(t, weak[t]); }).join('');

    h += '<div class="boss-card">' +
      '<div class="boss-img-wrap">' +
      '<img src="' + CFG.SPRITE(b.pid) + '" width="64" height="64">' +
      (b.shiny ? '<span class="shiny-star">&#x2728;</span>' : '') +
      '</div>' +
      '<div class="boss-info">' +
      '<div class="boss-name">' + esc(b.name) + '</div>' +
      '<div class="boss-tier" style="color:' + tc + ';">' + tierLabel(b.tier) + ' ' + stars(b.tier) + '</div>' +
      '<div class="boss-types">' + typeStr + '</div>' +
      '<div class="boss-weak-label">Weak to</div>' +
      '<div class="boss-weak">' + weakStr + '</div>' +
      (b.cp100 ? '<div class="boss-cp">100% CP: ' + b.cp100 + '</div>' : '') +
      '</div></div>';
  });
  el.innerHTML = h;
}
