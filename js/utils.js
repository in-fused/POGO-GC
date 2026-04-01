/* PokeRaid — Shared utility functions */
'use strict';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function $(id) { return document.getElementById(id); }

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function typePill(type) {
  var bg  = TYPE_BG[type] || '#888';
  var col = TYPE_DARK_TEXT[type] ? '#000' : '#fff';
  return '<span class="tpill" style="background:' + bg + ';color:' + col + ';">' + type + '</span>';
}

function weakPill(type, mult) {
  var bg    = TYPE_BG[type] || '#888';
  var col   = TYPE_DARK_TEXT[type] ? '#000' : '#fff';
  var badge = mult >= 2.5 ? '<span class="t2x">2x</span>' : '';
  return '<span class="wpill" style="background:' + bg + ';color:' + col + ';">' + type + badge + '</span>';
}

function stars(n) {
  var s = '';
  for (var i = 0; i < Math.min(n, 5); i++) s += '&#x2B50;';
  return s;
}

function tierColor(t) {
  if (t === 1) return '#00e676';
  if (t === 3) return '#ffcb05';
  if (t === 5 || t === 6) return '#9c40ff';
  if (t === 7) return '#00e5ff';  // Mega
  return '#ff4b4b';               // Shadow / T4+
}

function tierLabel(t) {
  if (t === 7) return 'Mega';
  if (t === 8) return 'Shadow';
  return 'T' + t;
}
