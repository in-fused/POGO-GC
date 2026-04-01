/* PokeRaid — Ably realtime connection and presence */
'use strict';

function connectAbly() {
  try {
    S.ably = new Ably.Realtime({ key: CFG.ABLY_KEY, clientId: S.user });

    S.ably.connection.on('connecting',   function() { setSt('Connecting\u2026'); });
    S.ably.connection.on('connected',    function() { setSt('Live'); syncPresence(); });
    S.ably.connection.on('failed',       function() { setSt('Demo mode \u2014 no live chat'); });
    S.ably.connection.on('disconnected', function() { setSt('Reconnecting\u2026'); });

    S.ably.connection.once('connected', function() {
      S.channel = S.ably.channels.get('poke-raid-' + S.group);
      S.channel.subscribe('msg', function(m) { renderMsg(m.data); });
      S.channel.presence.subscribe(syncPresence);
      S.channel.presence.enter({ user: S.user, team: S.team });
    });

  } catch(e) {
    setSt('Demo mode');
  }
}

function syncPresence() {
  if (!S.channel) return;
  S.channel.presence.get(function(err, members) {
    if (err || !members) return;
    S.onlineMembers = {};
    members.forEach(function(m) { S.onlineMembers[m.clientId] = m.data; });
    setSt(members.length + ' online');
    refreshOnlineRow();
  });
}

function setSt(text) {
  var el = $('statTxt');
  if (el) el.textContent = text;
}

function refreshOnlineRow() {
  var row = $('onlineRow');
  if (!row) return;
  var h = '<span class="ochip"><span class="odot od-' + (S.team || 'none') + '"></span>' +
          esc(S.user) + ' (you)</span>';
  Object.keys(S.onlineMembers).forEach(function(id) {
    if (id === S.user) return;
    var d = S.onlineMembers[id] || {};
    h += '<span class="ochip"><span class="odot od-' + (d.team || 'none') + '"></span>' +
         esc(d.user || id) + '</span>';
  });
  row.innerHTML = h;
}
