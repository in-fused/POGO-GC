/* PokeRaid — UI helpers: toast, float mode */
'use strict';

function showToast(msg) {
  var t = document.createElement('div');
  t.style.cssText =
    'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
    'background:#0c1220;border:1px solid rgba(255,255,255,0.15);color:#e8edf5;' +
    'padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;' +
    'z-index:99999;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
}

function toggleFloat() {
  var app = $('app');
  var btn = $('floatBtn');
  S.isFloat = !S.isFloat;
  app.classList.toggle('float-mode', S.isFloat);
  btn.classList.toggle('vis', S.isFloat);
  if (S.mapObj) setTimeout(function() { S.mapObj.invalidateSize(); }, 200);
}
