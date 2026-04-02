'use strict';

// CONFIG
var ABLY_KEY = 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';
var OWM_KEY_LS = 'pr_owm_key';
var FC_LS = 'pr_fc';
function spr(id){return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png';}
function sspr(id){return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/'+id+'.png';}

// POGO WEATHER
var POGO_WX = {
  SUNNY:         {label:'Sunny / Clear',   icon:'☀️',  boost:['Fire','Grass','Ground']},
  RAINY:         {label:'Rainy',           icon:'🌧️',  boost:['Water','Electric','Bug']},
  PARTLY_CLOUDY: {label:'Partly Cloudy',   icon:'⛅',  boost:['Normal','Rock']},
  CLOUDY:        {label:'Cloudy',          icon:'☁️',  boost:['Fairy','Fighting','Poison']},
  WINDY:         {label:'Windy',           icon:'🌬️',  boost:['Dragon','Flying','Psychic']},
  SNOW:          {label:'Snow',            icon:'❄️',  boost:['Ice','Steel']},
  FOG:           {label:'Fog',             icon:'🌫️',  boost:['Dark','Ghost']}
};
var TYPE_BG = {
  Normal:'#A8A878',Fire:'#F08030',Water:'#6890F0',Electric:'#F8D030',
  Grass:'#78C850',Ice:'#98D8D8',Fighting:'#C03028',Poison:'#A040A0',
  Ground:'#E0C068',Flying:'#A890F0',Psychic:'#F85888',Bug:'#A8B820',
  Rock:'#B8A038',Ghost:'#705898',Dragon:'#7038F8',Dark:'#705848',
  Steel:'#B8B8D0',Fairy:'#EE99AC'
};
var TYPE_DARK = {Electric:1,Ice:1,Ground:1,Steel:1,Fairy:1,Normal:1};
var TYPE_CHART = {
  Normal:{Rock:0.625,Ghost:0.39,Steel:0.625},
  Fire:{Fire:0.625,Water:0.625,Grass:1.6,Ice:1.6,Bug:1.6,Rock:0.625,Dragon:0.625,Steel:1.6},
  Water:{Fire:1.6,Water:0.625,Grass:0.625,Ground:1.6,Rock:1.6,Dragon:0.625},
  Electric:{Water:1.6,Electric:0.625,Grass:0.625,Ground:0.39,Flying:1.6,Dragon:0.625},
  Grass:{Fire:0.625,Water:1.6,Grass:0.625,Poison:0.625,Ground:1.6,Flying:0.625,Bug:0.625,Rock:1.6,Dragon:0.625,Steel:0.625},
  Ice:{Water:0.625,Grass:1.6,Ice:0.625,Ground:1.6,Flying:1.6,Dragon:1.6,Steel:0.625},
  Fighting:{Normal:1.6,Ice:1.6,Rock:1.6,Dark:1.6,Steel:1.6,Poison:0.625,Bug:0.625,Psychic:0.625,Flying:0.625,Ghost:0.39,Fairy:0.625},
  Poison:{Grass:1.6,Fairy:1.6,Poison:0.625,Ground:0.625,Rock:0.625,Ghost:0.625,Steel:0.39},
  Ground:{Fire:1.6,Electric:1.6,Grass:0.625,Poison:1.6,Rock:1.6,Steel:1.6,Bug:0.625,Flying:0.39},
  Flying:{Electric:0.625,Grass:1.6,Fighting:1.6,Bug:1.6,Rock:0.625,Steel:0.625},
  Psychic:{Fighting:1.6,Poison:1.6,Psychic:0.625,Dark:0.39,Steel:0.625},
  Bug:{Fire:0.625,Grass:1.6,Fighting:0.625,Poison:0.625,Flying:0.625,Psychic:1.6,Ghost:0.625,Dark:1.6,Steel:0.625,Fairy:0.625},
  Rock:{Fire:1.6,Ice:1.6,Fighting:0.625,Ground:0.625,Flying:1.6,Bug:1.6,Steel:0.625},
  Ghost:{Normal:0.39,Psychic:1.6,Ghost:1.6,Dark:0.625},
  Dragon:{Dragon:1.6,Steel:0.625,Fairy:0.39},
  Dark:{Fighting:0.625,Psychic:1.6,Ghost:1.6,Dark:0.625,Fairy:0.625},
  Steel:{Fire:0.625,Water:0.625,Electric:0.625,Ice:1.6,Rock:1.6,Steel:0.625,Fairy:1.6},
  Fairy:{Fighting:1.6,Dragon:1.6,Dark:1.6,Fire:0.625,Poison:0.625,Steel:0.625}
};

function getWeaknesses(types){
  var res={};
  Object.keys(TYPE_CHART).forEach(function(atk){
    var m=1;
    types.forEach(function(def){m*=(TYPE_CHART[atk][def]||1);});
    if(m>1.5)res[atk]=m;
  });
  return res;
}
function pill(t){
  var bg=TYPE_BG[t]||'#888';
  var col=TYPE_DARK[t]?'#000':'#fff';
  return '<span class="tpill" style="background:'+bg+';color:'+col+';">'+t+'</span>';
}
function wpill(t,m){
  var bg=TYPE_BG[t]||'#888';
  var col=TYPE_DARK[t]?'#000':'#fff';
  var x=m>=2.5?'<span style="font-size:8px;vertical-align:super;color:#ff4b4b;">2x</span>':'';
  return '<span class="wpill" style="background:'+bg+';color:'+col+';">'+t+x+'</span>';
}
function esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function stars(n){var s='';for(var i=0;i<Math.min(n,5);i++)s+='⭐';return s;}
function tierColor(t){
  if(t===1)return '#00e676';
  if(t===3)return '#ffcb05';
  if(t===5||t===6)return '#9c40ff';
  if(t===7)return '#00e5ff';
  if(t===8)return '#ff4b4b';
  if(t===9)return '#ff9100';
  return '#ff4b4b';
}
function tierLabel(t){
  if(t===7)return 'Mega';
  if(t===8)return 'Shadow';
  if(t===9)return 'Max';
  return 'T'+t;
}
function owmToPoGo(code,isDay,wind){
  var pg;
  if(code>=200&&code<600)pg='RAINY';
  else if(code>=600&&code<700)pg='SNOW';
  else if(code===701||code===741)pg='FOG';
  else if(code>=700&&code<800)pg='PARTLY_CLOUDY';
  else if(code===800)pg=isDay?'SUNNY':'PARTLY_CLOUDY';
  else if(code<=802)pg='PARTLY_CLOUDY';
  else pg='CLOUDY';
  if(wind>=10)pg='WINDY';
  return pg;
}

// STATE
var S={
  user:'',team:'',group:'GLOBAL',
  ably:null,channel:null,
  mapObj:null,userMarker:null,lat:null,lng:null,
  bosses:[],shinies:{},dittos:{},nests:{},
  online:{},lastSender:'',rbOpen:false,isFloat:false,
  activeGuide:'matchups',rFilter:'all',rSearch:'',wxCode:null,
  mapPins:[],raidCoords:{},chatTab:'general'
};

function el(id){return document.getElementById(id);}
function setSt(t){var e=el('statTxt');if(e)e.textContent=t;}
function showToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#0c1220;border:1px solid rgba(255,255,255,0.15);color:#e8edf5;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:99999;white-space:nowrap;';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(function(){t.remove();},2000);
}

// LOGIN
function selTeam(team,btn){
  S.team=team;
  document.querySelectorAll('.tbtn').forEach(function(b){b.classList.remove('sel');});
  btn.classList.add('sel');
}
function joinChat(){
  var name=el('loginName').value.trim();
  var grp=el('loginGroup').value.trim().toUpperCase()||'GLOBAL';
  if(!name){alert('Trainer name required!');return;}
  if(!S.team){alert('Select your team!');return;}
  S.user=name;S.group=grp;
  el('loginScreen').classList.add('gone');
  el('app').classList.add('vis');
  var lbl=grp==='GLOBAL'?'Raid':grp;
  el('appTitle').innerHTML='Poke<em>'+esc(lbl)+'</em>';
  var fc=localStorage.getItem(FC_LS)||'';
  var owm=localStorage.getItem(OWM_KEY_LS)||'';
  if(el('fcInput'))el('fcInput').value=fc;
  if(el('owmInput'))el('owmInput').value=owm;
  refreshOnline();renderProfile();fetchAll();
  ['general','raids','flex'].forEach(function(ch){loadHistory(ch);});
  connectAbly();
  sysMsg('Welcome <strong>'+esc(S.user)+'</strong> — Team '+S.team.charAt(0).toUpperCase()+S.team.slice(1));
}

// ABLY
function connectAbly(){
  try{
    S.ably=new Ably.Realtime({key:ABLY_KEY,clientId:S.user});
    S.ably.connection.on('connecting',function(){setSt('Connecting…');});
    S.ably.connection.on('connected',function(){setSt('Live');syncPresence();});
    S.ably.connection.on('failed',function(){setSt('Demo mode');});
    S.ably.connection.on('disconnected',function(){setSt('Reconnecting…');});
    S.ably.connection.once('connected',function(){
      S.channel=S.ably.channels.get('poke-raid-'+S.group);
      S.channel.subscribe('msg',function(m){renderMsg(m.data);});
      S.channel.subscribe('map',function(m){renderMapPin(m.data);});
      S.channel.presence.subscribe(syncPresence);
      S.channel.presence.enter({user:S.user,team:S.team});
    });
  }catch(e){setSt('Demo mode');}
}
function syncPresence(){
  if(!S.channel)return;
  S.channel.presence.get(function(err,ms){
    if(err||!ms)return;
    S.online={};ms.forEach(function(m){S.online[m.clientId]=m.data;});
    setSt(ms.length+' online');refreshOnline();
  });
}
function refreshOnline(){
  var row=el('onlineRow');if(!row)return;
  var h='<span class="ochip"><span class="odot od-'+(S.team||'none')+'"></span>'+esc(S.user)+' (you)</span>';
  Object.keys(S.online).forEach(function(id){
    if(id===S.user)return;
    var d=S.online[id]||{};
    h+='<span class="ochip"><span class="odot od-'+(d.team||'none')+'"></span>'+esc(d.user||id)+'</span>';
  });
  row.innerHTML=h;
}

// CHAT CHANNELS
function switchChat(tab){
  S.chatTab=tab;
  document.querySelectorAll('.ctab').forEach(function(b){b.classList.toggle('on',b.dataset.c===tab);});
  document.querySelectorAll('.cfeed').forEach(function(f){f.classList.remove('vis');});
  el('feed-'+tab).classList.add('vis');
  var imgLbl=el('imgLbl');
  if(imgLbl)imgLbl.style.display=tab==='flex'?'flex':'none';
  var inp=el('msgIn');
  if(inp){
    var phs={general:'Message or raid tip\u2026',raids:'Post a raid update\u2026',flex:'Brag about your catch\u2026'};
    inp.placeholder=phs[tab]||'Message\u2026';
  }
}
function saveToHistory(subch,data){
  var key='pr_hist_'+subch+'_'+S.group;
  var hist=JSON.parse(localStorage.getItem(key)||'[]');
  hist.push(data);if(hist.length>100)hist=hist.slice(-100);
  localStorage.setItem(key,JSON.stringify(hist));
}
function loadHistory(subch){
  var key='pr_hist_'+subch+'_'+S.group;
  var hist=JSON.parse(localStorage.getItem(key)||'[]');
  if(!hist.length)return;
  hist.forEach(function(d){renderMsg(d,true);});
  var feed=el('feed-'+subch);if(!feed)return;
  feed.insertAdjacentHTML('beforeend','<div class="hist-sep">&#x2015; Earlier messages &#x2015;</div>');
}
function handleImgUpload(input){
  var file=input.files[0];if(!file)return;
  showToast('Uploading image\u2026');
  var fd=new FormData();fd.append('file',file,'upload');
  fetch('https://telegra.ph/upload',{method:'POST',body:fd})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d||!d[0]||!d[0].src){showToast('Upload failed');return;}
      var imgUrl='https://telegra.ph'+d[0].src;
      var txt=el('msgIn').value.trim();el('msgIn').value='';
      var data={type:'flex',subch:'flex',user:S.user,team:S.team,text:txt,imgUrl:imgUrl,ts:Date.now()};
      if(S.channel){S.channel.publish('msg',data);}else{renderMsg(data);}
    }).catch(function(){showToast('Upload failed');});
  input.value='';
}
function flexCard(d){
  var t=new Date(d.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var badge=d.team?'<span class="tbadge b'+d.team.charAt(0)+'">'+d.team.toUpperCase()+'</span>':'';
  var h='<div class="fcard">'+
    '<div class="fcard-hd">'+badge+'<span class="fcard-user">'+esc(d.user||'')+'</span><span class="fcard-time">'+t+'</span></div>';
  if(d.imgUrl)h+='<img class="fcard-img" src="'+esc(d.imgUrl)+'" loading="lazy" onclick="window.open(\''+esc(d.imgUrl)+'\')">';
  if(d.text)h+='<div class="fcard-txt">'+esc(d.text)+'</div>';
  return h+'</div>';
}

// CHAT
function renderMsg(data,skipSave){
  var subch=data.subch||'general';
  if(data.type==='raid')subch='raids';
  if(data.type==='flex')subch='flex';
  var feed=el('feed-'+subch);if(!feed)return;
  if(!skipSave){saveToHistory(subch,data);showPushNotification(data);}
  if(data.type==='raid'){
    S.lastSender='';addPin(data);
    feed.insertAdjacentHTML('beforeend',raidCard(data));
    feed.scrollTop=feed.scrollHeight;
    if(data.lat&&data.lng){
      renderMapPin({type:'map',subtype:'raid',name:data.boss+' @ '+data.location,lat:data.lat,lng:data.lng,user:data.user,team:data.team,ts:data.ts});
    }
    return;
  }
  if(data.type==='flex'){
    feed.insertAdjacentHTML('beforeend',flexCard(data));
    feed.scrollTop=feed.scrollHeight;
    return;
  }
  var mine=(data.user===S.user);
  var cont=(data.user===S.lastSender)&&!mine;
  S.lastSender=data.user;
  var t=new Date(data.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var avCls='mav av-'+(data.team||'none')+(cont?' hide':'');
  var init=(data.user||'?').charAt(0).toUpperCase();
  var badge=data.team?'<span class="tbadge b'+data.team.charAt(0)+'">'+data.team.toUpperCase()+'</span>':'';
  var rowCls='mrow'+(mine?' mine':'')+(cont&&!mine?' cont':'');
  var av=mine?'':'<div class="'+avCls+'">'+(cont?'':init)+'</div>';
  var meta=(!mine&&!cont)?'<div class="mmeta">'+badge+esc(data.user)+'</div>':'';
  feed.insertAdjacentHTML('beforeend',
    '<div class="'+rowCls+'">'+av+
    '<div class="mbwrap">'+meta+
    '<div class="mbub">'+esc(data.text)+'</div>'+
    '<div class="mtime">'+t+'</div>'+
    '</div></div>');
  feed.scrollTop=feed.scrollHeight;
}
function raidCard(d){
  var b=findBoss(d.boss);
  var tier=b?b.tier:(d.tier||5);
  var pid=b?b.pid:(d.pid||25);
  var tc=tierColor(tier);
  var endTs=raidEndTs(d.time);
  var timerRes=endTs?raidTimerText(endTs):null;
  var timerHtml=timerRes?('<div class="rc-cd '+timerRes.cls+'" data-rend="'+endTs+'">'+timerRes.text+'</div>'):'';
  var cpTxt='';
  if(b&&b.cp20){cpTxt='<div class="rc-row"><i class="fas fa-star"></i><strong>'+b.cp20+(b.cp25?' &ndash; '+b.cp25+' &#x2601;':'')+' CP</strong></div>';}
  return '<div class="rc">'+
    '<div class="rc-hd"><img src="'+spr(pid)+'" width="52" height="52">'+
    '<div><div class="rc-lbl">&#x2694;&#xFE0F; Raid Alert</div><div class="rc-boss">'+esc(d.boss||'')+'</div></div></div>'+
    '<div class="rc-bd">'+timerHtml+
    '<div class="rc-tier" style="color:'+tc+';border-color:'+tc+'">'+tierLabel(tier)+' '+stars(tier)+'</div>'+
    '<div class="rc-row"><i class="fas fa-map-marker-alt"></i><button class="rc-flyto" onclick="flyToRaid('+d.ts+')">'+esc(d.location||'')+'</button></div>'+
    '<div class="rc-row"><i class="fas fa-clock"></i><strong>'+esc(d.time||'')+'</strong></div>'+
    cpTxt+
    '<div class="rc-row"><i class="fas fa-users"></i><strong>'+esc(d.players||'')+'</strong></div>'+
    (d.note?'<div class="rc-row rc-note"><i class="fas fa-sticky-note"></i>'+esc(d.note)+'</div>':'')+
    '<button class="rc-join" onclick="this.textContent=\'&#x2705; Joined!\';this.disabled=true;">Join Raid</button>'+
    '</div></div>';
}
function addPin(d){
  var b=findBoss(d.boss);var pid=b?b.pid:25;
  var strip=el('raidStrip');if(!strip)return;
  strip.classList.add('show');
  strip.insertAdjacentHTML('beforeend',
    '<span class="rpin"><img src="'+spr(pid)+'" width="24" height="24">'+
    '<span><div class="rpin-n">'+esc(d.boss||'')+'</div>'+
    '<div class="rpin-s">'+esc(d.location||'')+' · '+esc(d.time||'')+'</div></span></span>');
}
function sysMsg(html){
  var feed=el('feed-general');if(!feed)return;
  feed.insertAdjacentHTML('beforeend','<div class="smsg"><span>'+html+'</span></div>');
  feed.scrollTop=feed.scrollHeight;S.lastSender='';
}
function sendMsg(){
  var inp=el('msgIn');if(!inp)return;
  var txt=inp.value.trim();if(!txt)return;inp.value='';
  var data={type:'chat',subch:S.chatTab==='flex'?'general':S.chatTab,user:S.user,team:S.team,text:txt,ts:Date.now()};
  if(S.channel){S.channel.publish('msg',data);}else{renderMsg(data);}
}
function findBoss(name){
  if(!name)return null;var nl=name.toLowerCase();
  for(var i=0;i<S.bosses.length;i++){if(S.bosses[i].name.toLowerCase()===nl)return S.bosses[i];}
  return null;
}

// RAID MODAL
var _raidLL=null,_geoTimer=null,_selectedBoss=null,_bossTimer=null;
function openRaidModal(){
  _raidLL=null;_selectedBoss=null;
  el('mLocDrop').style.display='none';
  el('bossDrop').style.display='none';
  el('mbossPreview').style.display='none';
  el('mBoss').value='';el('mLoc').value='';el('mNote').value='';
  el('raidModal').classList.add('open');
}
function bossSearch(){
  clearTimeout(_bossTimer);
  _selectedBoss=null;
  el('mbossPreview').style.display='none';
  var q=el('mBoss').value.trim().toLowerCase();
  if(!q){el('bossDrop').style.display='none';return;}
  var matches=S.bosses.filter(function(b){return b.name.toLowerCase().indexOf(q)>=0;}).slice(0,8);
  if(matches.length){
    var h='';
    matches.forEach(function(b){
      var tc=tierColor(b.tier);
      h+='<div class="boss-opt" onclick="selectBoss('+b.pid+',\''+b.name.replace(/\\/g,'\\\\').replace(/'/g,'\\\'')+'\',' +b.tier+')">' +
        '<img src="'+spr(b.pid)+'" width="36" height="36">' +
        '<div class="boss-info"><div class="boss-nm">'+esc(b.name)+'</div>' +
        '<div class="boss-tier" style="color:'+tc+'">'+tierLabel(b.tier)+'</div></div></div>';
    });
    el('bossDrop').innerHTML=h;el('bossDrop').style.display='block';
  }else{el('bossDrop').style.display='none';}
  _bossTimer=setTimeout(function(){
    var name=el('mBoss').value.trim();if(!name)return;
    fetch('https://pokeapi.co/api/v2/pokemon/'+encodeURIComponent(name.toLowerCase().replace(/\s+/g,'-')))
      .then(function(r){if(!r.ok)throw new Error();return r.json();})
      .then(function(d){
        _selectedBoss={pid:d.id,name:name,tier:5};
        el('mbossPreview').src=spr(d.id);el('mbossPreview').style.display='block';
      }).catch(function(){});
  },800);
}
function selectBoss(pid,name,tier){
  clearTimeout(_bossTimer);
  _selectedBoss={pid:pid,name:name,tier:tier};
  el('mBoss').value=name;
  el('bossDrop').style.display='none';
  el('mbossPreview').src=spr(pid);el('mbossPreview').style.display='block';
}
function geoSuggest(){
  clearTimeout(_geoTimer);
  var q=el('mLoc').value.trim();
  if(q.length<3){el('mLocDrop').style.display='none';return;}
  _geoTimer=setTimeout(function(){
    fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=5')
      .then(function(r){return r.json();})
      .then(function(d){
        if(!d||!d.length){el('mLocDrop').style.display='none';return;}
        var h='';
        d.forEach(function(r){
          var nm=r.name||(r.display_name.split(',')[0]);
          var sub=r.display_name.split(',').slice(1,3).join(',').trim();
          h+='<div class="geo-opt" onclick="pickGeoResult('+r.lat+','+r.lon+',\''+nm.replace(/\\/g,'\\\\').replace(/'/g,'\\\'')+'\')">'+'<div class="geo-nm">'+esc(nm)+'</div><div class="geo-sub">'+esc(sub)+'</div></div>';
        });
        el('mLocDrop').innerHTML=h;el('mLocDrop').style.display='block';
      }).catch(function(){});
  },500);
}
function pickGeoResult(lat,lon,name){
  _raidLL={lat:parseFloat(lat),lng:parseFloat(lon)};
  el('mLoc').value=name;
  el('mLocDrop').innerHTML='';el('mLocDrop').style.display='none';
}
function pickLocationForRaid(){
  if(!S.mapObj){showToast('Open Map tab first');return;}
  closeModal('raidModal');
  showToast('Tap map to set gym location');
  S.mapObj.once('click',function(e){
    reverseGeocode(e.latlng,function(name){
      _raidLL=e.latlng;
      el('mLoc').value=name;
      el('mLocDrop').style.display='none';
      el('raidModal').classList.add('open');
    });
  });
}
function reverseGeocode(latlng,cb){
  fetch('https://nominatim.openstreetmap.org/reverse?lat='+latlng.lat+'&lon='+latlng.lng+'&format=json')
    .then(function(r){return r.json();})
    .then(function(d){
      var name=(d.name)||(d.address&&(d.address.amenity||d.address.leisure||d.address.building||d.address.road))||latlng.lat.toFixed(5)+','+latlng.lng.toFixed(5);
      cb(String(name));
    }).catch(function(){cb(latlng.lat.toFixed(5)+','+latlng.lng.toFixed(5));});
}
function closeModal(id){el(id).classList.remove('open');}
function closeBg(e,id){if(e.target.id===id)closeModal(id);}
function postRaid(){
  var boss=el('mBoss').value.trim();
  var loc=el('mLoc').value.trim();
  var time=el('mTime').value;
  var pl=el('mPlayers').value;
  if(!boss||!loc||!time){alert('Fill all fields!');return;}
  var b=_selectedBoss||findBoss(boss);
  var note=el('mNote')?el('mNote').value.trim():'';
  var data={type:'raid',user:S.user,team:S.team,boss:boss,location:loc,time:time,players:pl,
            pid:b?b.pid:25,tier:b?b.tier:5,note:note,ts:Date.now()};
  if(_raidLL){data.lat=_raidLL.lat;data.lng=_raidLL.lng;}
  if(S.channel){S.channel.publish('msg',data);}else{renderMsg(data);}
  closeModal('raidModal');goTab('chat');
  _raidLL=null;_selectedBoss=null;
  if(data.lat){
    broadcastMapPin({type:'map',subtype:'raid',name:boss+' @ '+loc,lat:data.lat,lng:data.lng,user:data.user,team:data.team,ts:data.ts});
  }else{geocodeRaidPin(loc,data);}
}

// TABS
function goTab(tab){
  ['chat','map','raids','guide','news','me'].forEach(function(t){
    el('tab-'+t).classList.toggle('on',t===tab);
    el('pane-'+t).classList.toggle('vis',t===tab);
  });
  S.activeTab=tab;
  if(tab==='map'&&!S.mapObj)initMap();
  if(tab==='raids'){renderBosses();renderActiveGroupRaids();}
  if(tab==='guide')switchG(S.activeGuide);
  if(tab==='news')fetchNews();
  if(tab==='me')renderProfile();
}

// MAP
function initMap(){
  if(S.mapObj)return;
  S.mapObj=L.map('map',{zoomControl:false,attributionControl:false}).setView([40.7128,-74.006],14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(S.mapObj);
  L.control.zoom({position:'topright'}).addTo(S.mapObj);
  loadSavedPins();
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(function(pos){
      S.lat=pos.coords.latitude;S.lng=pos.coords.longitude;
      S.mapObj.setView([S.lat,S.lng],16);addUserDot();fetchBiomes();fetchWx();
    },function(){fetchBiomes();});
    navigator.geolocation.watchPosition(function(pos){
      S.lat=pos.coords.latitude;S.lng=pos.coords.longitude;
      if(S.userMarker)S.userMarker.setLatLng([S.lat,S.lng]);
    },null,{enableHighAccuracy:true,maximumAge:15000});
  }else{fetchBiomes();}
}
function addUserDot(){
  var icon=L.divIcon({html:'<div class="udot"></div>',iconSize:[20,20],iconAnchor:[10,10],className:''});
  S.userMarker=L.marker([S.lat,S.lng],{icon:icon,zIndexOffset:2000}).addTo(S.mapObj);
}
function centerMap(){
  navigator.geolocation.getCurrentPosition(function(pos){
    S.lat=pos.coords.latitude;S.lng=pos.coords.longitude;
    S.mapObj.setView([S.lat,S.lng],16);
    if(S.userMarker)S.userMarker.setLatLng([S.lat,S.lng]);
  });
}
function fetchBiomes(){
  var lat=S.lat||40.7128,lng=S.lng||-74.006,R=0.045;
  var bb=(lat-R)+','+(lng-R)+','+(lat+R)+','+(lng+R);
  var q='[out:json][timeout:40];('+
    'way["leisure"="park"]('+bb+');way["landuse"="park"]('+bb+');'+
    'way["landuse"="grass"]('+bb+');way["landuse"="forest"]('+bb+');'+
    'way["natural"="wood"]('+bb+');way["natural"="water"]('+bb+');'+
    'way["water"]('+bb+');way["waterway"="river"]('+bb+');'+
    ');(._;>;);out body;';
  fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q)})
    .then(function(r){return r.json();}).then(renderBiomes).catch(function(){});
}
function renderBiomes(data){
  var nodes={};
  data.elements.forEach(function(el2){if(el2.type==='node')nodes[el2.id]=[el2.lat,el2.lon];});
  var parks=0,water=0;
  data.elements.forEach(function(el2){
    if(el2.type!=='way'||!el2.nodes)return;
    var coords=el2.nodes.map(function(n){return nodes[n];}).filter(Boolean);
    if(coords.length<3)return;
    var t=el2.tags||{};
    var isW=t.natural==='water'||!!t.waterway||!!t.water;
    var isP=t.leisure==='park'||t.landuse==='park'||t.landuse==='grass'||t.landuse==='forest'||t.natural==='wood';
    if(isW){
      L.polygon(coords,{color:'rgba(104,144,240,0.65)',weight:1.5,fillColor:'rgba(104,144,240,0.18)',fillOpacity:1})
        .addTo(S.mapObj).bindPopup(biomePopup('water',t.name),{className:'dk-popup'});water++;
    }else if(isP){
      L.polygon(coords,{color:'rgba(0,230,118,0.55)',weight:1.5,fillColor:'rgba(0,230,118,0.12)',fillOpacity:1})
        .addTo(S.mapObj).bindPopup(biomePopup('park',t.name),{className:'dk-popup'});parks++;
    }
  });
  updateBiomePanel(parks,water);
}
function biomePopup(type,name){
  var w=type==='water';
  var lbl=w?'💧 Water Zone':'🌿 Park / Nature';
  var cls=w?'lbl-water':'lbl-park';
  var types=w?['Water','Ice','Electric']:['Grass','Bug','Normal','Poison'];
  return '<div class="mpop"><div class="mpop-lbl '+cls+'">'+lbl+'</div>'+
    '<div class="mpop-name">'+esc(name||(w?'Water Body':'Park'))+'</div>'+
    '<div class="mpop-sub">Expect more '+(w?'Water & Ice':'Grass & Bug')+' types</div>'+
    '<div class="mpop-types">'+types.map(pill).join('')+'</div></div>';
}
function updateBiomePanel(parks,water){
  var p=el('biomeP');if(!p||(parks===0&&water===0))return;p.classList.add('vis');
  var h='<div class="bp-t">Nearby Biomes</div>';
  if(parks)h+='<div class="bp-r"><div class="bp-d" style="background:#00e676"></div><div><div class="bp-n">'+parks+' Park Zone'+(parks>1?'s':'')+'</div><div class="bp-ty">Grass · Bug · Normal</div></div></div>';
  if(water)h+='<div class="bp-r"><div class="bp-d" style="background:#6890F0"></div><div><div class="bp-n">'+water+' Water Zone'+(water>1?'s':'')+'</div><div class="bp-ty">Water · Ice · Electric</div></div></div>';
  h+=migrationMini();p.innerHTML=h;
}
function toggleRB(){S.rbOpen=!S.rbOpen;el('raidBoard').classList.toggle('open',S.rbOpen);}

// MAP PINS — crowdsourced sightings shared via Ably
var _reportLL=null,_pinMode=false;
function togglePinMode(){
  if(!S.mapObj)return;
  _pinMode=!_pinMode;
  el('mfabPin').classList.toggle('active',_pinMode);
  showToast(_pinMode?'Tap map to place pin':'Pin mode off');
  if(_pinMode){
    S.mapObj.once('click',function(e){
      _pinMode=false;
      el('mfabPin').classList.remove('active');
      openMapReport(e.latlng);
    });
  }
}
function openMapReport(ll){
  if(!S.user){showToast('Login first');return;}
  _reportLL=ll;
  el('mrType').value='spawn';
  el('mrNameLbl').textContent='Pokemon spotted';
  el('mrName').value='';
  el('mapReport').classList.add('open');
}
function mrTypeChange(){
  var t=el('mrType').value;
  var lbls={spawn:'Pokemon spotted',gym:'Gym name',stop:'Pokestop name'};
  el('mrNameLbl').textContent=lbls[t]||'Name';
  el('mrName').placeholder=t==='spawn'?'e.g. Dragonite':(t==='gym'?'e.g. Central Park Gym':'e.g. Library Stop');
}
function submitMapReport(){
  var t=el('mrType').value;
  var name=el('mrName').value.trim();
  if(!name){showToast('Enter a name');return;}
  if(!_reportLL){return;}
  var data={type:'map',subtype:t,name:name,lat:_reportLL.lat,lng:_reportLL.lng,
            user:S.user,team:S.team,ts:Date.now()};
  broadcastMapPin(data);
  closeModal('mapReport');
}
function broadcastMapPin(data){
  renderMapPin(data);
  if(S.channel)S.channel.publish('map',data);
}
function flyToRaid(ts){
  var c=S.raidCoords[ts];
  if(!c){showToast('No map location yet');return;}
  goTab('map');
  if(S.mapObj)S.mapObj.flyTo([c.lat,c.lng],17);
}
function savePinLocal(data){
  var pins=JSON.parse(localStorage.getItem('pr_pins')||'[]');
  pins.push(data);
  if(pins.length>200)pins=pins.slice(-200);
  localStorage.setItem('pr_pins',JSON.stringify(pins));
}
function loadSavedPins(){
  var pins=JSON.parse(localStorage.getItem('pr_pins')||'[]');
  pins.forEach(function(d){renderMapPin(d);});
}
function renderMapPin(data){
  if(!S.mapObj)return;
  var expire=(data.ts+(20*60*1000))-Date.now();
  if(data.subtype==='spawn'&&expire<=0)return;
  var dots={spawn:'mp-spawn',gym:'mp-gym',stop:'mp-stop',raid:'mp-raid'};
  var cls=dots[data.subtype]||'mp-spawn';
  var iconHtml,iconSz,iconAnchor;
  if(data.subtype==='raid'&&data.pid){
    var tc=tierColor(data.tier||5);
    iconHtml='<div class="mpindot mp-raid-spr" style="border-color:'+tc+'">'+
      '<img src="'+CFG.SPRITE(data.pid)+'" width="30" height="30" onerror="this.style.display=\'none\'">'+
      '<span class="mpin-tier" style="background:'+tc+'">'+tierLabel(data.tier||5)+'</span>'+
      '</div>';
    iconSz=[38,38];iconAnchor=[19,19];
  }else{
    iconHtml='<div class="mpindot '+cls+'"></div>';
    iconSz=[14,14];iconAnchor=[7,7];
  }
  var icon=L.divIcon({html:iconHtml,iconSize:iconSz,iconAnchor:iconAnchor,className:''});
  var labs={spawn:'Spawn: ',gym:'Gym: ',stop:'Stop: ',raid:'Raid: '};
  var sub=esc(data.user||'');
  if(data.subtype==='spawn'){
    var mins=Math.max(0,Math.round(expire/60000));
    sub+=mins>0?' &middot; ~'+mins+'m left':' &middot; just reported';
  }
  var popup='<div class="mpop"><div class="mpop-name">'+(labs[data.subtype]||'')+esc(data.name)+'</div>'+
    '<div class="mpop-sub">'+sub+'</div></div>';
  var marker=L.marker([data.lat,data.lng],{icon:icon}).addTo(S.mapObj)
    .bindPopup(popup,{className:'dk-popup'});
  S.mapPins.push({marker:marker,data:data});
  if(data.subtype==='spawn'&&expire>0){
    setTimeout(function(){if(S.mapObj)S.mapObj.removeLayer(marker);},expire);
  }
  if(data.subtype==='raid'){S.raidCoords[data.ts]={lat:data.lat,lng:data.lng};}
  if(data.subtype==='gym'||data.subtype==='stop'){savePinLocal(data);}
}
function geocodeRaidPin(locName,raidData){
  var q=encodeURIComponent(locName);
  fetch('https://nominatim.openstreetmap.org/search?q='+q+'&format=json&limit=1')
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d||!d.length)return;
      var pin={type:'map',subtype:'raid',name:raidData.boss+' @ '+raidData.location,
               lat:parseFloat(d[0].lat),lng:parseFloat(d[0].lon),
               user:raidData.user,team:raidData.team,ts:raidData.ts};
      broadcastMapPin(pin);
    }).catch(function(){});
}

// WEATHER
function fetchWx(){
  if(!S.lat)return;
  var owm=localStorage.getItem(OWM_KEY_LS);
  if(!owm||owm==='PASTE_YOUR_KEY'){fallbackWx();return;}
  fetch('https://api.openweathermap.org/data/2.5/weather?lat='+S.lat+'&lon='+S.lng+'&appid='+owm+'&units=imperial')
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.cod!==200){fallbackWx();return;}
      var code=d.weather[0].id;
      var isDay=(d.dt>d.sys.sunrise&&d.dt<d.sys.sunset);
      var wind=(d.wind&&d.wind.speed)||0;
      showWx(owmToPoGo(code,isDay,wind),Math.round(d.main.temp)+'°F',d.weather[0].description);
    }).catch(fallbackWx);
}
function fallbackWx(){
  var m=new Date().getMonth();
  var pg='PARTLY_CLOUDY';
  if(m>=11||m<=1)pg='SNOW';else if(m>=6&&m<=8)pg='SUNNY';
  showWx(pg,'—','Add OWM key in Me tab');
}
function showWx(pg,temp,desc){
  S.wxCode=pg;var wx=POGO_WX[pg];
  el('wLoad').style.display='none';
  el('wBody').classList.add('on');
  el('wIcon').textContent=wx.icon;
  el('wCond').textContent=desc;
  el('wTemp').textContent=temp;
  el('wLbl').textContent=wx.label+' in PoGo';
  el('wTypes').innerHTML=wx.boost.map(pill).join('');
}
function refreshWx(){fetchWx();}

// RAID BOSSES
function fetchAll(){fetchBosses();fetchShinies();fetchDittos();fetchNestPokes();}
function fetchBosses(){
  fetch('https://pogoapi.net/api/v1/current_raid_bosses.json')
    .then(function(r){return r.json();})
    .then(function(data){
      S.bosses=[];
      var tm={'1':1,'3':3,'5':5,'6':6,'mega':7,'mega_raid':7,'shadow':8,'shadow_raid':8,'dynamax':9,'max':9,'gigantamax':9,'1_max':9,'3_max':9,'5_max':9};
      Object.keys(data).forEach(function(tier){
        (data[tier]||[]).forEach(function(b){
          var t=tm[String(tier).toLowerCase()]||(parseInt(tier)||5);
          S.bosses.push({pid:b.pokemon_id||25,name:b.name||'?',tier:t,shiny:!!b.shiny_available,types:[],cp100:b.cp100||null,cp20:b.cp20||b.min_cp||null,cp25:b.cp25||b.max_cp||null});
        });
      });
      return enrichTypes();
    })
    .then(function(){renderBosses();renderRB();fillBossDL();})
    .catch(function(){
      S.bosses=[
        {pid:382,name:'Kyogre',tier:5,shiny:true,types:['Water'],cp100:2042},
        {pid:384,name:'Rayquaza',tier:5,shiny:true,types:['Dragon','Flying'],cp100:2191},
        {pid:249,name:'Lugia',tier:5,shiny:true,types:['Psychic','Flying'],cp100:2057},
        {pid:248,name:'Tyranitar',tier:4,shiny:true,types:['Rock','Dark'],cp100:2359},
        {pid:373,name:'Salamence',tier:4,shiny:true,types:['Dragon','Flying'],cp100:2449},
        {pid:131,name:'Lapras',tier:3,shiny:true,types:['Water','Ice'],cp100:1609},
        {pid:143,name:'Snorlax',tier:3,shiny:true,types:['Normal'],cp100:2217},
        {pid:35,name:'Clefairy',tier:1,shiny:true,types:['Fairy'],cp100:614},
        {pid:129,name:'Magikarp',tier:1,shiny:true,types:['Water'],cp100:165}
      ];
      renderBosses();renderRB();fillBossDL();
    });
}
function enrichTypes(){
  return fetch('https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json')
    .then(function(r){return r.json();})
    .then(function(data){
      var list=data.currentList||data;
      if(!Array.isArray(list))return;
      list.forEach(function(entry){
        var pkm=entry.pokemon||entry;
        var dex=pkm.dexNr||pkm.id;if(!dex)return;
        var types=[];
        var tl=(pkm.primaryType?[pkm.primaryType]:[]).concat(pkm.secondaryType?[pkm.secondaryType]:[]);
        if(pkm.types)tl=pkm.types;
        tl.forEach(function(t){
          var tn=(t&&t.names&&t.names.English)||(t&&t.type&&t.type.names&&t.type.names.English)||(typeof t==='string'?t:null);
          if(tn)types.push(tn);
        });
        if(types.length){
          S.bosses.forEach(function(b){if(b.pid===dex&&!b.types.length)b.types=types;});
        }
        var cp20=entry.cp20||entry.minCp||entry.min_cp||(entry.catches&&entry.catches.cp20)||null;
        var cp25=entry.cp25||entry.maxCp||entry.max_cp||(entry.catches&&entry.catches.cp25)||null;
        if(cp20||cp25){
          S.bosses.forEach(function(b){if(b.pid===dex&&!b.cp20){b.cp20=cp20;b.cp25=cp25;}});
        }
      });
    }).catch(function(){});
}
function renderBosses(){
  var grid=el('bossGrid');if(!grid)return;
  if(!S.bosses.length){grid.innerHTML='<div class="empty"><div class="eicon">⏳</div><p>Fetching live raid bosses…</p></div>';return;}
  var search=(S.rSearch||'').toLowerCase();
  var filtered=S.bosses.filter(function(b){
    if(S.rFilter==='t5'&&b.tier!==5&&b.tier!==6)return false;
    if(S.rFilter==='mega'&&b.tier!==7)return false;
    if(S.rFilter==='shadow'&&b.tier!==8)return false;
    if(S.rFilter==='max'&&b.tier!==9)return false;
    if(S.rFilter==='t3'&&b.tier!==3)return false;
    if(S.rFilter==='t1'&&b.tier!==1)return false;
    if(search&&b.name.toLowerCase().indexOf(search)<0)return false;
    return true;
  });
  if(!filtered.length){grid.innerHTML='<div class="empty"><div class="eicon">🔍</div><p>No bosses match.</p></div>';return;}
  var h='';
  filtered.forEach(function(b){
    var tc=tierColor(b.tier);
    var weak=getWeaknesses(b.types||[]);
    var weakArr=Object.keys(weak).sort(function(a,d){return weak[d]-weak[a];}).slice(0,6);
    h+='<div class="bcard">'+
      '<div class="bimg"><img src="'+spr(b.pid)+'" width="64" height="64">'+(b.shiny?'<span class="bshiny">✨</span>':'')+'</div>'+
      '<div class="binfo">'+
      '<div class="bname">'+esc(b.name)+'</div>'+
      '<div class="btier" style="color:'+tc+'">'+tierLabel(b.tier)+' '+stars(b.tier)+'</div>'+
      '<div class="btypes">'+(b.types||[]).map(pill).join('')+'</div>'+
      (weakArr.length?'<div class="bwlbl">Weak to</div><div class="bweak">'+weakArr.map(function(t){return wpill(t,weak[t]);}).join('')+'</div>':'')+
      (b.cp20?'<div class="bcp">Catch: '+b.cp20+(b.cp25?' &ndash; '+b.cp25+' &#x2601;':'')+' CP</div>':(b.cp100?'<div class="bcp">100% CP: '+b.cp100+'</div>':''))+
      '</div></div>';
  });
  grid.innerHTML=h;
}
function renderRB(){
  var cont=el('rbContent');if(!cont)return;
  var tiers=[[5,'5★'],[6,'5★+'],[7,'Mega'],[8,'Shadow'],[3,'3★'],[1,'1★']];
  var h='';
  tiers.forEach(function(tv){
    var t=tv[0];
    var bs=S.bosses.filter(function(b){return b.tier===t;});
    if(!bs.length)return;
    var tc=tierColor(t);
    h+='<div class="rb-tlbl" style="color:'+tc+'">'+tv[1]+' '+tierLabel(t)+'</div>';
    bs.forEach(function(b){
      h+='<div class="rb-card"><img src="'+spr(b.pid)+'" width="44" height="44">'+
        '<div><div class="rb-nm">'+esc(b.name)+(b.shiny?' ✨':'')+'</div>'+
        '<div class="rb-mt">'+tierLabel(b.tier)+' '+stars(b.tier)+'</div></div></div>';
    });
  });
  cont.innerHTML=h||'<div style="color:#8090a8;font-size:12px">Loading…</div>';
}
function fillBossDL(){
  var dl=el('bossDL');if(!dl)return;dl.innerHTML='';
  S.bosses.forEach(function(b){var o=document.createElement('option');o.value=b.name;dl.appendChild(o);});
}
function setFilter(f){
  S.rFilter=f;
  document.querySelectorAll('.fpill').forEach(function(p){
    p.classList.toggle('on',p.dataset.f===f);
    p.classList.toggle('off',p.dataset.f!==f);
  });
  renderBosses();
}

// ACTIVE GROUP RAIDS
function renderActiveGroupRaids(){
  var key='pr_hist_raids_'+S.group;
  var hist=JSON.parse(localStorage.getItem(key)||'[]');
  var now=Date.now();
  var today=new Date().toDateString();
  var active=hist.filter(function(d){
    if(d.type!=='raid')return false;
    if(new Date(d.ts).toDateString()!==today)return false;
    if(!d.time)return true;
    var parts=d.time.split(':');
    var rt=new Date();rt.setHours(parseInt(parts[0]),parseInt(parts[1]),0,0);
    return (rt.getTime()+45*60*1000)>now;
  });
  var wrap=el('activeRaidsWrap');if(!wrap)return;
  if(!active.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  var cont=el('activeRaids');if(!cont)return;
  var h='';
  active.forEach(function(d){
    var b=findBoss(d.boss);var pid=b?b.pid:(d.pid||25);var tc=tierColor(d.tier||5);
    h+='<div class="bcard live-raid">'+
      '<div class="bimg"><img src="'+spr(pid)+'" width="64" height="64"></div>'+
      '<div class="binfo">'+
      '<div class="bname">'+esc(d.boss||'')+'</div>'+
      '<div class="btier" style="color:'+tc+'">'+tierLabel(d.tier||5)+'</div>'+
      '<div style="font-size:11px;color:#8090a8;margin-top:4px">'+esc(d.location||'')+(d.time?' &middot; '+esc(d.time):'')+'</div>'+
      '</div></div>';
  });
  cont.innerHTML=h;
}

// GUIDE
function switchG(sec){
  S.activeGuide=sec;
  document.querySelectorAll('.gtab').forEach(function(g){g.classList.toggle('on',g.dataset.g===sec);});
  document.querySelectorAll('.gsec').forEach(function(s){s.classList.toggle('vis',s.id==='guide-'+sec);});
  if(sec==='matchups')renderMatchups('');
  if(sec==='shinies')renderShinies();
  if(sec==='dittos')renderDittos();
  if(sec==='nests')renderNests();
  if(sec==='weather')renderWxGuide();
  if(sec==='migrate')renderMigration();
}

// MATCHUPS
function switchMuMode(mode){
  document.querySelectorAll('.mu-mode').forEach(function(b){b.classList.toggle('on',b.id==='muMode'+mode.charAt(0).toUpperCase()+mode.slice(1));});
  el('muTypes').style.display=mode==='types'?'block':'none';
  el('muPokemon').style.display=mode==='pokemon'?'block':'none';
  if(mode==='types')renderMatchups(el('typeSearch').value);
}
function renderMatchups(filter){
  var cont=el('matchupList');if(!cont)return;
  var search=(filter||'').toLowerCase();
  var h='';
  Object.keys(TYPE_BG).forEach(function(type){
    if(search&&type.toLowerCase().indexOf(search)<0)return;
    var bg=TYPE_BG[type];var dark=TYPE_DARK[type];
    var strong=Object.keys(TYPE_CHART[type]||{}).filter(function(d){return TYPE_CHART[type][d]>1;});
    var resisted=Object.keys(TYPE_CHART[type]||{}).filter(function(d){return TYPE_CHART[type][d]<1;});
    var vulnTo=Object.keys(TYPE_CHART).filter(function(atk){return (TYPE_CHART[atk][type]||1)>1;});
    var resistsFrom=Object.keys(TYPE_CHART).filter(function(atk){return (TYPE_CHART[atk][type]||1)<1;});
    h+='<div class="mucard">'+
      '<div class="muhead" style="background:'+bg+';color:'+(dark?'#000':'#fff')+'">'+type+'</div>'+
      '<div class="mubody">'+
      (strong.length?'<div class="murow"><span class="mulbl mu-atk">&#x2694; Strong vs</span>'+strong.map(pill).join('')+'</div>':'')+''+
      (resisted.length?'<div class="murow"><span class="mulbl mu-res">&#x1F6E1; Resisted by</span>'+resisted.map(pill).join('')+'</div>':'')+
      (vulnTo.length?'<div class="murow"><span class="mulbl mu-weak">&#x26A0; Weak to</span>'+vulnTo.map(pill).join('')+'</div>':'')+
      (resistsFrom.length?'<div class="murow"><span class="mulbl mu-res">&#x1F4AA; Resists</span>'+resistsFrom.map(pill).join('')+'</div>':'')+
      '</div></div>';
  });
  cont.innerHTML=h||'<div class="empty"><p>No types match.</p></div>';
}
var _pokeTimer=null;
function pokeCounterSearch(){
  clearTimeout(_pokeTimer);
  var q=el('pokeSearch').value.trim().toLowerCase().replace(/\s+/g,'-');
  if(!q){el('pokeCounters').innerHTML='<div class="empty"><div class="eicon">&#x1F50D;</div><p>Enter a Pok&eacute;mon name above</p></div>';return;}
  el('pokeCounters').innerHTML='<div class="empty"><p>Looking up '+esc(q)+'&hellip;</p></div>';
  _pokeTimer=setTimeout(function(){
    // Check S.bosses first
    var found=null;
    S.bosses.forEach(function(b){if(b.name.toLowerCase()===q.replace(/-/g,' '))found=b;});
    if(found&&found.types.length){renderPokeCounters(found.name,found.pid,found.types);return;}
    // PokéAPI fallback
    fetch('https://pokeapi.co/api/v2/pokemon/'+encodeURIComponent(q))
      .then(function(r){if(!r.ok)throw new Error('not found');return r.json();})
      .then(function(d){
        var types=d.types.map(function(t){return t.type.name.charAt(0).toUpperCase()+t.type.name.slice(1);});
        renderPokeCounters(d.name,d.id,types);
      }).catch(function(){
        el('pokeCounters').innerHTML='<div class="empty"><div class="eicon">&#x2753;</div><p>Pok&eacute;mon not found.<br>Try the exact name (e.g. "Charizard").</p></div>';
      });
  },600);
}
function renderPokeCounters(name,pid,types){
  var weak=getWeaknesses(types);
  var weakArr=Object.keys(weak).sort(function(a,b){return weak[b]-weak[a];});
  var resists={};
  Object.keys(TYPE_CHART).forEach(function(atk){
    var m=1;types.forEach(function(def){m*=(TYPE_CHART[atk][def]||1);});
    if(m<1)resists[atk]=m;
  });
  var h='<div class="pkcard">'+
    '<div class="pkcard-hd"><img src="'+spr(pid)+'" width="72" height="72">'+
    '<div><div class="pkcard-name">'+esc(name.charAt(0).toUpperCase()+name.slice(1))+'</div>'+
    '<div class="pkcard-types">'+(types||[]).map(pill).join('')+'</div></div></div>';
  if(weakArr.length){
    h+='<div class="pkcard-sec">&#x26A0; <strong>Weak to</strong></div>'+
      '<div class="pkcard-pills">'+weakArr.map(function(t){
        var x=weak[t]>=2.5?'<span style="font-size:9px;color:#ff4b4b;vertical-align:super;font-weight:800"> 2x</span>':'';
        return wpill(t,weak[t])+x;
      }).join('')+'</div>';
  }
  if(Object.keys(resists).length){
    h+='<div class="pkcard-sec">&#x1F4AA; <strong>Resists</strong></div>'+
      '<div class="pkcard-pills">'+Object.keys(resists).map(pill).join('')+'</div>';
  }
  h+='</div>';
  el('pokeCounters').innerHTML=h;
}

// NEWS
var _newsSource='official';
var NEWS_TTL=60*60*1000;
var NEWS_FEEDS={
  official:'https://pokemongolive.com/feed/',
  hub:'https://pokemongohub.net/feed/'
};
function switchNewsSource(src){
  _newsSource=src;
  document.querySelectorAll('.nstab').forEach(function(b){b.classList.toggle('on',b.dataset.s===src);});
  if(src==='events')fetchEvents();else fetchNews();
}
function _parseRssXml(xmlStr){
  var parser=new DOMParser();
  var xml=parser.parseFromString(xmlStr,'text/xml');
  var nodes=xml.querySelectorAll('item');
  var items=[];
  nodes.forEach(function(node){
    function get(tag){var e=node.querySelector(tag);return e?e.textContent.trim():'';}
    var enc=node.querySelector('enclosure');
    var media=node.querySelector('thumbnail')||node.querySelector('content');
    var thumb=(enc&&enc.getAttribute('url'))||(media&&(media.getAttribute('url')||media.textContent.trim()))||'';
    var cats=[];
    node.querySelectorAll('category').forEach(function(c){if(c.textContent.trim())cats.push(c.textContent.trim());});
    items.push({title:get('title'),link:get('link'),pubDate:get('pubDate'),thumbnail:thumb,categories:cats});
  });
  return items;
}
function fetchNews(){
  var cont=el('newsFeed');if(!cont)return;
  var cacheKey='pr_news_'+_newsSource;
  var cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
  if(cached&&(Date.now()-cached.ts)<NEWS_TTL){renderNewsFeed(cached.items);return;}
  cont.innerHTML='<div class="empty"><p>Loading&hellip;</p></div>';
  var rssUrl=NEWS_FEEDS[_newsSource]||NEWS_FEEDS.official;
  function saveAndRender(items){
    if(!items||!items.length)throw new Error('empty');
    localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),items:items}));
    renderNewsFeed(items);
  }
  function showError(){
    cont.innerHTML='<div class="empty"><div class="eicon">&#x1F4F5;</div>'+
      '<p>Could not load news.</p>'+
      '<small style="color:#5a6a82;display:block;margin-top:6px">Check your connection and try again.</small>'+
      '<button type="button" class="mebtn mb-save" style="margin-top:14px" onclick="fetchNews()">Retry</button></div>';
  }
  function tryAllOrigins(){
    var proxy='https://api.allorigins.win/get?url='+encodeURIComponent(rssUrl);
    fetch(proxy)
      .then(function(r){return r.json();})
      .then(function(d){
        if(!d||!d.contents)throw new Error('empty');
        saveAndRender(_parseRssXml(d.contents));
      }).catch(showError);
  }
  var api='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(rssUrl)+'&count=15';
  fetch(api)
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.status!=='ok'||!d.items||!d.items.length)throw new Error('rss2json empty');
      saveAndRender(d.items);
    }).catch(tryAllOrigins);
}
function renderNewsFeed(items){
  var cont=el('newsFeed');if(!cont)return;
  var h='';items.forEach(function(item){h+=newsCard(item);});
  cont.innerHTML=h||'<div class="empty"><p>No articles found.</p></div>';
}
function newsCard(item){
  var t=new Date(item.pubDate).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
  var thumb=(item.thumbnail&&item.thumbnail.indexOf('http')===0)?item.thumbnail:
            (item.enclosure&&item.enclosure.link&&item.enclosure.link.indexOf('http')===0?item.enclosure.link:'');
  var cats=(item.categories&&item.categories.length)?'<span class="nflair">'+esc(item.categories[0])+'</span>':'';
  var url=item.link||'';
  return '<div class="ncard" onclick="window.open(\''+url.replace(/'/g,'%27')+'\')">' +
    (thumb?'<img class="nthumb" src="'+esc(thumb)+'" loading="lazy">':'<div class="nthumb nthumb-ph">&#x1F4F0;</div>')+
    '<div class="ninfo">'+cats+
    '<div class="ntitle">'+esc(item.title||'')+'</div>'+
    '<div class="nmeta">'+t+'</div>'+
    '</div></div>';
}
// EVENTS (ScrapedDuck — mirrors LeekDuck events)
var EVENTS_URL='https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.min.json';
var EVENTS_TTL=30*60*1000;
var _ETYPE_MAP={
  'community-day':'Community Day','raid-day':'Raid Day','raid-hour':'Raid Hour',
  'spotlight-hour':'Spotlight Hour','go-battle-league':'GO Battle','research':'Research',
  'season':'Season','go-tour':'GO Tour','go-fest':'GO Fest','event':'Event'
};
function formatEventType(t){
  if(!t)return'Event';
  return _ETYPE_MAP[t]||t.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
}
function fetchEvents(){
  var cont=el('newsFeed');if(!cont)return;
  var cached=JSON.parse(localStorage.getItem('pr_events')||'null');
  if(cached&&(Date.now()-cached.ts)<EVENTS_TTL){renderEventsFeed(cached.items);return;}
  cont.innerHTML='<div class="empty"><p>Loading events&hellip;</p></div>';
  fetch(EVENTS_URL)
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d||!d.length)throw new Error('empty');
      var now=Date.now();
      var items=d.filter(function(e){
        return new Date(e.end).getTime()>now-24*60*60*1000;
      }).sort(function(a,b){return new Date(a.start)-new Date(b.start);});
      localStorage.setItem('pr_events',JSON.stringify({ts:Date.now(),items:items}));
      renderEventsFeed(items);
    }).catch(function(){
      cont.innerHTML='<div class="empty"><div class="eicon">&#x1F4C5;</div>'+
        '<p>Could not load events.</p>'+
        '<button type="button" class="mebtn mb-save" style="margin-top:14px" onclick="fetchEvents()">Retry</button></div>';
    });
}
function renderEventsFeed(items){
  var cont=el('newsFeed');if(!cont)return;
  var h='';items.forEach(function(e){h+=eventCard(e);});
  cont.innerHTML=h||'<div class="empty"><p>No upcoming events.</p></div>';
}
function eventCard(ev){
  var now=Date.now();
  var start=new Date(ev.start),end=new Date(ev.end);
  var isActive=(now>=start.getTime()&&now<end.getTime());
  var isSoon=(start.getTime()>now&&start.getTime()-now<48*60*60*1000);
  var fmt={month:'short',day:'numeric'};
  var sDay=start.toLocaleDateString([],fmt),eDay=end.toLocaleDateString([],fmt);
  var dateStr=sDay+(sDay!==eDay?' \u2013 '+eDay:'');
  if(start.toDateString()===end.toDateString()){
    dateStr=sDay+' \u00B7 '+start.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+
      '\u2013'+end.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  }
  var typeLabel=formatEventType(ev.eventType||ev.heading);
  var url=(ev.link||'https://leekduck.com/events/').replace(/'/g,'%27');
  var badge='';
  if(isActive)badge='<span class="ev-badge ev-active">\u25CF Active</span>';
  else if(isSoon)badge='<span class="ev-badge ev-soon">\u23F0 Soon</span>';
  var codes='';
  if(ev.extraData&&ev.extraData.promocodes&&ev.extraData.promocodes.length){
    codes='<div class="ev-code">&#x1F381; '+ev.extraData.promocodes.map(esc).join(' &middot; ')+'</div>';
  }
  return '<div class="ev-card" onclick="window.open(\''+url+'\')">'+
    (ev.image?'<img class="ev-img" src="'+esc(ev.image)+'" loading="lazy" onerror="this.style.display=\'none\'">':'')+
    '<div class="ev-body">'+
    '<div class="ev-top"><span class="ev-type">'+esc(typeLabel)+'</span>'+badge+'</div>'+
    '<div class="ev-name">'+esc(ev.name)+'</div>'+
    '<div class="ev-date">&#x1F4C5; '+esc(dateStr)+'</div>'+
    codes+'</div></div>';
}

function fetchShinies(){
  fetch('https://pogoapi.net/api/v1/shiny_pokemon.json')
    .then(function(r){return r.json();})
    .then(function(d){S.shinies=d;if(S.activeGuide==='shinies')renderShinies();}).catch(function(){});
}
function fetchDittos(){
  fetch('https://pogoapi.net/api/v1/possible_ditto_pokemon.json')
    .then(function(r){return r.json();})
    .then(function(d){S.dittos=d;if(S.activeGuide==='dittos')renderDittos();}).catch(function(){});
}
function fetchNestPokes(){
  fetch('https://pogoapi.net/api/v1/nesting_pokemon.json')
    .then(function(r){return r.json();})
    .then(function(d){S.nests=d;if(S.activeGuide==='nests')renderNests();}).catch(function(){});
}
function renderShinies(filter){
  var cont=el('shinyList');if(!cont)return;
  var keys=Object.keys(S.shinies);
  if(!keys.length){cont.innerHTML='<div class="empty"><div class="eicon">⏳</div><p>Loading…</p></div>';return;}
  var search=(filter||'').toLowerCase();
  var h='';
  keys.forEach(function(k){
    var p=S.shinies[k];
    if(search&&p.name.toLowerCase().indexOf(search)<0)return;
    var tags='';
    if(p.found_wild)tags+='<span class="gtag tg-wild">Wild</span>';
    if(p.found_raid)tags+='<span class="gtag tg-raid">Raid</span>';
    if(p.found_egg)tags+='<span class="gtag tg-egg">Egg</span>';
    if(p.found_evolution)tags+='<span class="gtag tg-evo">Evolve</span>';
    if(p.found_research)tags+='<span class="gtag tg-res">Research</span>';
    h+='<div class="gitem"><img src="'+sspr(p.id)+'" width="40" height="40" loading="lazy">'+
      '<div><div class="giname">'+esc(p.name)+'</div><div class="gitags">'+tags+'</div></div></div>';
  });
  cont.innerHTML=h||'<div class="empty"><p>No results.</p></div>';
}
function renderDittos(){
  var cont=el('dittoList');if(!cont)return;
  var keys=Object.keys(S.dittos);
  if(!keys.length){cont.innerHTML='<div class="empty"><div class="eicon">⏳</div><p>Loading…</p></div>';return;}
  var h='<p style="font-size:12px;color:#8090a8;margin-bottom:12px">These Pokémon can be a Ditto in disguise. It reveals itself once caught!</p>';
  keys.forEach(function(k){
    var p=S.dittos[k];
    h+='<div class="gitem"><img src="'+spr(p.id)+'" width="40" height="40" loading="lazy">'+
      '<div><div class="giname">'+esc(p.name)+'</div><div class="gitags"><span class="gtag tg-dit">Ditto?</span></div></div></div>';
  });
  cont.innerHTML=h;
}
function renderNests(){
  var cont=el('nestList');if(!cont)return;
  var keys=Object.keys(S.nests);
  if(!keys.length){cont.innerHTML='<div class="empty"><div class="eicon">⏳</div><p>Loading…</p></div>';return;}
  var h=migrationFull()+'<p style="font-size:12px;color:#8090a8;margin-bottom:12px">Species that appear at nests. Nests migrate every 2 weeks on Thursday 01:00 UTC.</p>';
  keys.forEach(function(k){
    var p=S.nests[k];
    h+='<div class="gitem"><img src="'+spr(p.id)+'" width="40" height="40" loading="lazy">'+
      '<div><div class="giname">'+esc(p.name)+'</div><div class="gitags"><span class="gtag tg-nest">Nesting</span></div></div></div>';
  });
  cont.innerHTML=h;
}
function renderWxGuide(){
  var cont=el('wxGuide');if(!cont)return;
  var h='<table class="wxtab"><thead><tr><th></th><th>PoGo Condition</th><th>Boosted Types</th></tr></thead><tbody>';
  Object.keys(POGO_WX).forEach(function(k){
    var wx=POGO_WX[k];var active=(k===S.wxCode);
    h+='<tr'+(active?' class="awx"':'')+'><td>'+wx.icon+'</td>'+
      '<td>'+wx.label+(active?' <span class="wxnow">Now</span>':'')+'</td>'+
      '<td>'+wx.boost.map(pill).join(' ')+'</td></tr>';
  });
  h+='</tbody></table><p style="font-size:12px;color:#8090a8;margin-top:12px;line-height:1.6">Boosted Pokémon spawn more often, up to Lv35 wild, +20% damage.</p>';
  cont.innerHTML=h;
}
function renderMigration(){var cont=el('migrateDiv');if(!cont)return;cont.innerHTML=migrationFull()+'<p style="font-size:12px;color:#8090a8;line-height:1.6;margin-top:10px">All nests worldwide switch species simultaneously every 2 weeks on Thursday 01:00 UTC.</p>';}
function migrationCountdown(){
  var epoch=new Date('2025-01-02T01:00:00Z').getTime();
  var cycle=14*24*60*60*1000;
  var now=Date.now();
  var elapsed=now-epoch;
  var next=new Date(epoch+(Math.floor(elapsed/cycle)+1)*cycle);
  var diff=next-now;
  var d=Math.floor(diff/86400000);
  var h=Math.floor((diff%86400000)/3600000);
  var m=Math.floor((diff%3600000)/60000);
  return {str:d+'d '+h+'h '+m+'m',date:next.toUTCString()};
}
function migrationFull(){
  var mc=migrationCountdown();
  return '<div class="migcard"><div class="migicon">🏠</div><div>'+
    '<div class="migtitle">Next Nest Migration</div>'+
    '<div class="migtime">'+mc.str+'</div>'+
    '<div class="migsub">'+mc.date+'</div></div></div>';
}
function migrationMini(){
  var mc=migrationCountdown();
  return '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)">'+
    '<div style="font-size:10px;color:#8090a8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Next Nest Migration</div>'+
    '<div style="font-size:14px;font-weight:800;color:#00e676;font-family:\'JetBrains Mono\',monospace">'+mc.str+'</div></div>';
}

// RAID TIMER
function raidEndTs(timeStr){
  if(!timeStr)return 0;
  var parts=timeStr.split(':');
  if(parts.length<2)return 0;
  var d=new Date();
  d.setHours(parseInt(parts[0]),parseInt(parts[1]),0,0);
  return d.getTime()+45*60*1000;
}
function raidTimerText(endTs){
  if(!endTs)return null;
  var now=Date.now();
  var diff=endTs-now;
  if(diff<0)return{cls:'ended',text:'\u2713 Ended'};
  if(diff<=45*60*1000){
    var m=Math.ceil(diff/60000);
    return{cls:'live',text:'\u25CF LIVE \u00B7 '+m+'m left'};
  }
  var m=Math.ceil((diff-45*60*1000)/60000);
  return{cls:'soon',text:'\u23F0 starts in '+m+'m'};
}
function startRaidTimerTick(){
  setInterval(function(){
    document.querySelectorAll('.rc-cd[data-rend]').forEach(function(e){
      var endTs=parseInt(e.getAttribute('data-rend'));
      var res=raidTimerText(endTs);
      if(res){e.textContent=res.text;e.className='rc-cd '+res.cls;}
    });
  },30000);
}

// ME
function renderProfile(){
  var tc=el('trainerCard');if(!tc)return;
  tc.className='tcard '+(S.team||'none');
  el('trainerName').textContent=S.user||'—';
  el('trainerTeam').textContent=S.team?('Team '+S.team.charAt(0).toUpperCase()+S.team.slice(1)):'';
  el('groupDisplay').textContent=S.group;
  renderDataSources();
  renderQR();
  var ns=el('notifStatus');
  if(ns){
    if(!('Notification' in window))ns.textContent='unsupported';
    else if(Notification.permission==='granted')ns.textContent='enabled \u2705';
    else if(Notification.permission==='denied')ns.textContent='blocked \u274C';
    else ns.textContent='off';
  }
}
function renderDataSources(){
  var cont=el('dataSources');if(!cont)return;
  cont.innerHTML=[
    {dot:'ds-l',label:'Raid Bosses',src:'pogoapi.net',ok:S.bosses.length>0},
    {dot:'ds-l',label:'Shiny List',src:'pogoapi.net',ok:Object.keys(S.shinies).length>0},
    {dot:'ds-l',label:'Ditto Disguises',src:'pogoapi.net',ok:Object.keys(S.dittos).length>0},
    {dot:'ds-l',label:'Nest Species',src:'pogoapi.net',ok:Object.keys(S.nests).length>0},
    {dot:'ds-r',label:'Biome Zones',src:'OpenStreetMap',ok:true},
    {dot:'ds-r',label:'Weather Boosts',src:'OpenWeatherMap',ok:!!S.wxCode},
    {dot:'ds-n',label:'Live Spawns',src:'Not available',ok:false}
  ].map(function(r){
    return '<div class="dsrc"><div class="dsdot '+r.dot+'"></div>'+
      '<div class="dslbl">'+r.label+' <span style="color:#5a6a82;font-size:11px">— '+r.src+'</span></div>'+
      '<div class="dsst" style="color:'+(r.ok?'#00e676':'#ff4b4b')+'">'+(r.ok?'✓':'—')+'</div></div>';
  }).join('');
}
function saveFC(){var v=el('fcInput').value.trim();localStorage.setItem(FC_LS,v);showToast('Friend code saved!');}
function copyFC(){var v=el('fcInput').value.trim();if(!v){showToast('Enter a code first');return;}navigator.clipboard.writeText(v).then(function(){showToast('Copied!');});}
function saveOWM(){var v=el('owmInput').value.trim();localStorage.setItem(OWM_KEY_LS,v);showToast('OWM key saved! Refresh weather on Map tab.');}
function leaveGroup(){if(confirm('Reset to Global?')){S.group='GLOBAL';el('groupDisplay').textContent='GLOBAL';if(S.ably)S.ably.close();connectAbly();showToast('Rejoined Global');}}

// FLOAT
function toggleFloat(){
  var app=el('app'),btn=el('floatBtn');
  S.isFloat=!S.isFloat;
  app.classList.toggle('float-mode',S.isFloat);
  btn.classList.toggle('vis',S.isFloat);
  if(S.mapObj)setTimeout(function(){S.mapObj.invalidateSize();},200);
}
function shareGroup(){
  var txt=S.group==='GLOBAL'?'Join me on PokeRaid! pogo-gc.vercel.app':'PokeRaid group code: '+S.group;
  if(navigator.share){navigator.share({text:txt,url:'https://pogo-gc.vercel.app'}).catch(function(){});}
  else{navigator.clipboard.writeText(txt).then(function(){showToast('Copied!');});}
}
function leaveChat(){if(confirm('Leave PokeRaid?')){if(S.ably)S.ably.close();location.reload();}}

// NOTIFICATIONS
function requestNotifPermission(){
  if(!('Notification' in window)){showToast('Notifications not supported on this browser');return;}
  if(Notification.permission==='granted'){showToast('Raid alerts already enabled!');return;}
  if(Notification.permission==='denied'){showToast('Blocked \u2014 enable in browser/OS settings');return;}
  Notification.requestPermission(function(p){
    if(p==='granted')showToast('\u2705 Raid alerts enabled!');
    renderProfile();
  });
}
function showPushNotification(data){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  if(data.user===S.user)return;
  if(document.visibilityState==='visible')return;
  if(data.type==='raid'){
    var n=new Notification('\u2694\uFE0F Raid: '+(data.boss||'Unknown'),{
      body:(data.location||'')+(data.time?' \u00B7 '+data.time:'')+(data.note?' \u00B7 '+data.note:''),
      icon:spr(data.pid||25),
      tag:'raid-'+(data.ts||Date.now())
    });
    n.onclick=function(){window.focus();goTab('chat');};
  }else if(data.type==='chat'||data.type==='flex'){
    new Notification((data.user||'Someone')+' in PokeRaid',{
      body:data.text||(data.type==='flex'?'Shared a photo \ud83d\udcf8':''),
      tag:'chat-'+(data.ts||Date.now())
    });
  }
}

// URL PARAMS
function getUrlParam(name){
  var re=new RegExp('[?&]'+name+'=([^&]*)');
  var m=re.exec(window.location.search);
  return m?decodeURIComponent(m[1].replace(/\+/g,' ')):null;
}

// GROUP QR
function renderQR(){
  var wrap=el('groupQR');if(!wrap)return;
  var groupParam=(S.group&&S.group!=='GLOBAL')?('/?group='+encodeURIComponent(S.group)):'';
  var url='https://pogo-gc.vercel.app'+groupParam;
  var qrSrc='https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=00e5ff&bgcolor=0c1220&qzone=1&data='+encodeURIComponent(url);
  wrap.innerHTML='<img src="'+qrSrc+'" width="180" height="180" style="border-radius:10px;display:block;margin:0 auto">';
  var lbl=el('qrGroupLbl');if(lbl)lbl.textContent=S.group||'GLOBAL';
}

// INIT
document.addEventListener('DOMContentLoaded',function(){
  var mi=el('msgIn');
  if(mi)mi.addEventListener('keydown',function(e){if(e.key==='Enter')sendMsg();});
  var rs=el('rSearch');
  if(rs)rs.addEventListener('input',function(){S.rSearch=this.value;renderBosses();});
  var ss=el('shinySearch');
  if(ss)ss.addEventListener('input',function(){renderShinies(this.value);});
  var ps=el('pokeSearch');
  if(ps)ps.addEventListener('input',pokeCounterSearch);
  var ni=el('loginName');
  if(ni)ni.addEventListener('keydown',function(e){if(e.key==='Enter')joinChat();});
  var urlGroup=getUrlParam('group');
  if(urlGroup&&el('loginGroup'))el('loginGroup').value=urlGroup.toUpperCase();
  startRaidTimerTick();
  goTab('chat');
});
