/* PokeRaid — Me/profile pane */
'use strict';

function renderProfile() {
  var tc = $('trainerCard');
  if (!tc) return;
  tc.className = 'trainer-card ' + (S.team || 'none');
  $('trainerName').textContent = S.user  || '\u2014';
  $('trainerTeam').textContent = S.team  ? ('Team ' + cap(S.team)) : 'No team';
  $('groupDisplay').textContent = S.group;
  renderDataSources();
  renderMigration();
}

function renderDataSources() {
  var el = $('dataSources');
  if (!el) return;
  var rows = [
    { dot:'ds-live', label:'Raid Bosses',     src:'pogoapi.net',   ok: S.raidBosses.length > 0 },
    { dot:'ds-live', label:'Shiny List',      src:'pogoapi.net',   ok: Object.keys(S.shinies).length > 0 },
    { dot:'ds-live', label:'Ditto Disguises', src:'pogoapi.net',   ok: Object.keys(S.dittos).length > 0 },
    { dot:'ds-live', label:'Nest Species',    src:'pogoapi.net',   ok: Object.keys(S.nests).length > 0 },
    { dot:'ds-real', label:'Biome Zones',     src:'OpenStreetMap', ok: true },
    { dot:'ds-real', label:'Weather Boosts',  src:'OpenWeatherMap',ok: !!S.wxCode },
    { dot:'ds-no',   label:'Live Spawns',     src:'Not available', ok: false }
  ];
  el.innerHTML = rows.map(function(r) {
    return '<div class="data-source">' +
      '<div class="ds-dot ' + r.dot + '"></div>' +
      '<div class="ds-label">' + r.label +
        ' <span style="color:#5a6a82;font-size:11px;">\u2014 ' + r.src + '</span></div>' +
      '<div class="ds-status" style="color:' + (r.ok ? '#00e676' : '#ff4b4b') + ';">' +
        (r.ok ? '\u2713' : '\u2014') +
      '</div></div>';
  }).join('');
}

function saveFriendCode() {
  var fc = $('fcInput') ? $('fcInput').value.trim() : '';
  localStorage.setItem(CFG.FC_LS, fc);
  showToast('Friend code saved!');
}

function copyFriendCode() {
  var fc = $('fcInput') ? $('fcInput').value.trim() : '';
  if (!fc) { showToast('Enter your friend code first'); return; }
  navigator.clipboard.writeText(fc).then(function() { showToast('Copied!'); });
}

function saveOWMKey() {
  var key = $('owmInput') ? $('owmInput').value.trim() : '';
  localStorage.setItem(CFG.OWM_LS, key);
  showToast('OWM key saved! Refresh weather on Map tab.');
}

function leaveGroup() {
  if (confirm('Leave this group and return to Global chat?')) {
    S.group = 'GLOBAL';
    $('groupDisplay').textContent = 'GLOBAL';
    if (S.ably) S.ably.close();
    connectAbly();
    showToast('Rejoined Global chat');
  }
}

function shareGroup() {
  var txt = S.group === 'GLOBAL'
    ? 'Join me on PokeRaid! pogo-gc.vercel.app'
    : 'PokeRaid group code: ' + S.group;
  if (navigator.share) {
    navigator.share({ text:txt, url:'https://pogo-gc.vercel.app' }).catch(function() {});
  } else {
    navigator.clipboard.writeText(txt).then(function() { showToast('Copied!'); });
  }
}

function leaveChat() {
  if (confirm('Leave PokeRaid?')) {
    if (S.ably) S.ably.close();
    location.reload();
  }
}
