/* PokeRaid — Login / auth flow */
'use strict';

function selectTeam(team) {
  S.team = team;
  ['mystic', 'valor', 'instinct'].forEach(function(t) {
    var btn = $('btn-' + t);
    if (btn) btn.classList.toggle('sel', t === team);
  });
}

function joinChat() {
  var nameEl  = $('loginName');
  var groupEl = $('loginGroup');
  var name = nameEl  ? nameEl.value.trim()                     : '';
  var grp  = groupEl ? groupEl.value.trim().toUpperCase()       : '';

  if (!name)   { alert('Trainer name required!'); return; }
  if (!S.team) { alert('Select your team first!'); return; }

  S.user  = name;
  S.group = grp || 'GLOBAL';

  $('loginScreen').classList.add('gone');
  $('app').classList.add('vis');

  var lbl = S.group === 'GLOBAL' ? 'Raid' : S.group;
  $('appTitle').innerHTML = 'Poke<em>' + esc(lbl) + '</em>';

  // Restore saved settings
  var fc  = localStorage.getItem(CFG.FC_LS)  || '';
  var owm = localStorage.getItem(CFG.OWM_LS) || '';
  if ($('fcInput'))  $('fcInput').value  = fc;
  if ($('owmInput')) $('owmInput').value = owm;

  refreshOnlineRow();
  renderProfile();
  fetchAllData();
  connectAbly();

  sysMsg('Welcome <strong>' + esc(S.user) + '</strong> — Team ' + cap(S.team));
}
