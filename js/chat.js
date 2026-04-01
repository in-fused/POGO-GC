/* PokeRaid — Chat messaging and raid card rendering */
'use strict';

function renderMsg(data) {
  var feed = $('msgFeed');
  if (!feed) return;

  if (data.type === 'raid') {
    S.lastSender = '';
    addRaidPin(data);
    feed.insertAdjacentHTML('beforeend', buildRaidMsgCard(data));
    feed.scrollTop = feed.scrollHeight;
    return;
  }

  var mine = (data.user === S.user);
  var cont = (data.user === S.lastSender) && !mine;
  S.lastSender = data.user;

  var t      = new Date(data.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  var avCls  = 'mav av-' + (data.team || 'none') + (cont ? ' hide' : '');
  var init   = (data.user || '?').charAt(0).toUpperCase();
  var badge  = data.team
    ? '<span class="tbadge b' + data.team.charAt(0) + '">' + data.team.toUpperCase() + '</span>'
    : '';

  var rowCls = 'mrow' + (mine ? ' mine' : '') + (cont && !mine ? ' cont' : '');
  var av     = mine ? '' : '<div class="' + avCls + '">' + (cont ? '' : init) + '</div>';
  var meta   = (!mine && !cont) ? '<div class="mmeta">' + badge + esc(data.user) + '</div>' : '';

  feed.insertAdjacentHTML('beforeend',
    '<div class="' + rowCls + '">' + av +
    '<div class="mbwrap">' + meta +
    '<div class="mbub">' + esc(data.text) + '</div>' +
    '<div class="mtime">' + t + '</div>' +
    '</div></div>'
  );
  feed.scrollTop = feed.scrollHeight;
}

function buildRaidMsgCard(d) {
  var boss = findBoss(d.boss);
  var tier = boss ? boss.tier : (d.tier || 5);
  var pid  = boss ? boss.pid  : (d.pid  || 25);
  var tc   = tierColor(tier);

  return '<div class="raid-card-msg">' +
    '<div class="rcm-head">' +
    '<img src="' + CFG.SPRITE(pid) + '" width="52" height="52">' +
    '<div><div class="rcm-lbl">&#x2694;&#xFE0F; Raid Alert</div>' +
    '<div class="rcm-boss">' + esc(d.boss) + '</div></div></div>' +
    '<div class="rcm-body">' +
    '<div class="rcm-tier" style="border-color:' + tc + ';color:' + tc + ';">' +
    tierLabel(tier) + ' ' + stars(tier) + '</div>' +
    '<div class="rcm-row"><i class="fas fa-map-marker-alt"></i><strong>' + esc(d.location || '') + '</strong></div>' +
    '<div class="rcm-row"><i class="fas fa-clock"></i><strong>' + esc(d.time || '') + '</strong></div>' +
    '<div class="rcm-row"><i class="fas fa-users"></i><strong>' + esc(d.players || '') + ' needed</strong></div>' +
    '<button class="rcm-join" onclick="joinRaidBtn(this)">&#x270A; Join Raid</button>' +
    '</div></div>';
}

function joinRaidBtn(btn) {
  btn.textContent = '&#x2705; Joined!';
  btn.disabled = true;
}

function addRaidPin(d) {
  var boss  = findBoss(d.boss);
  var pid   = boss ? boss.pid : 25;
  var strip = $('raidStrip');
  if (!strip) return;
  strip.classList.add('show');
  strip.insertAdjacentHTML('beforeend',
    '<span class="rpin">' +
    '<img src="' + CFG.SPRITE(pid) + '" width="24" height="24">' +
    '<span><div class="rpin-name">' + esc(d.boss) + '</div>' +
    '<div class="rpin-sub">' + esc(d.location || '') + ' \u00B7 ' + esc(d.time || '') + '</div>' +
    '</span></span>'
  );
}

function sysMsg(html) {
  var feed = $('msgFeed');
  if (!feed) return;
  feed.insertAdjacentHTML('beforeend', '<div class="sys-msg"><span>' + html + '</span></div>');
  feed.scrollTop = feed.scrollHeight;
  S.lastSender = '';
}

function sendMsg() {
  var inp = $('msgIn');
  if (!inp) return;
  var txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';
  var data = { type:'chat', user:S.user, team:S.team, text:txt, ts:Date.now() };
  renderMsg(data);
  if (S.channel) S.channel.publish('msg', data);
}
