/* PokeRaid — Boot sequence */
'use strict';

document.addEventListener('DOMContentLoaded', function() {

  // Enter key on login name → join
  var ni = $('loginName');
  if (ni) ni.addEventListener('keydown', function(e) { if (e.key === 'Enter') joinChat(); });

  // Enter key on chat input → send
  var mi = $('msgIn');
  if (mi) mi.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMsg(); });

  // Raid boss search
  var rs = $('raidSearch');
  if (rs) rs.addEventListener('input', function() {
    S.raidSearch = this.value;
    renderRaidBosses();
  });

  // Shiny search
  var ss = $('shinySearch');
  if (ss) ss.addEventListener('input', function() { renderShinies(this.value); });

  // Start on chat tab
  goTab('chat');
});
