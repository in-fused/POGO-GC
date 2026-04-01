/* PokeRaid — Raid post modal (bottom sheet) */
'use strict';

function openRaidModal()  { $('raidModal').classList.add('open'); }
function closeRaidModal() { $('raidModal').classList.remove('open'); }

function closeBg(e, id) {
  if (e.target.id === id) document.getElementById(id).classList.remove('open');
}

function postRaid() {
  var boss    = $('mRaidBoss').value.trim();
  var loc     = $('mRaidLoc').value.trim();
  var time    = $('mRaidTime').value;
  var players = $('mRaidPlayers').value;

  if (!boss || !loc || !time) { alert('Fill all fields!'); return; }

  var b    = findBoss(boss);
  var data = {
    type:     'raid',
    user:     S.user,
    team:     S.team,
    boss:     boss,
    location: loc,
    time:     time,
    players:  players,
    pid:      b ? b.pid  : 25,
    tier:     b ? b.tier : 5,
    ts:       Date.now()
  };

  renderMsg(data);
  if (S.channel) S.channel.publish('msg', data);

  closeRaidModal();
  goTab('chat');
  $('mRaidBoss').value = '';
  $('mRaidLoc').value  = '';
}

function findBoss(name) {
  if (!name) return null;
  var nl = name.toLowerCase();
  for (var i = 0; i < S.raidBosses.length; i++) {
    if (S.raidBosses[i].name.toLowerCase() === nl) return S.raidBosses[i];
  }
  return null;
}
