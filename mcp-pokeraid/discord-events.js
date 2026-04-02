/**
 * PokeRaid Discord Events Poller
 *
 * Fetches scheduled events + news from the Greater Orlando Pokemon GO Discord
 * server via Discord's REST API and pushes them to your app via Ably.
 *
 * Raids:  Pulls from Guild Scheduled Events (structured: name, time, location)
 * News:   Polls two news channels for recent posts and caches them locally
 *
 * NOTE: Discord's API requires the bot to be in the server to read channels.
 * Scheduled events may work for public Community servers without guild membership.
 * If you get a 403, ask a Greater Orlando server admin to add the bot
 * (read-only: View Channels + Read Message History permissions only).
 *
 * Usage:  npm run events   (runs once then exits)
 *         npm run events-watch  (runs on schedule, add to package.json)
 */
import * as Ably from 'ably';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ─────────────────────────────────────────────────────────────
const ENV_FILE = join(__dirname, '.env');
if (existsSync(ENV_FILE)) {
  readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const DISCORD_TOKEN  = process.env.DISCORD_TOKEN;
const ABLY_KEY       = process.env.ABLY_KEY || 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';
const GROUP          = (process.env.POGO_GROUP || 'GLOBAL').toUpperCase();
const USER           = process.env.POGO_USER || 'DiscordBot';
const INTERVAL_MS    = (parseInt(process.env.EVENTS_INTERVAL) || 15) * 60 * 1000;

// ── Channel / Guild config ────────────────────────────────────────────────
const GUILD_ID       = '1169472341022081045';  // Greater Orlando Pokemon GO
const NEWS_CHANNELS  = [
  { id: '1195602613870280835', label: 'GO News'    },
  { id: '1169525089742639195', label: 'Announcements' }
];
const NEWS_CACHE     = join(__dirname, 'discord-news-cache.json');
const DISCORD_API    = 'https://discord.com/api/v10';

if (!DISCORD_TOKEN) {
  console.error('\nERROR: DISCORD_TOKEN not set in .env');
  console.error('Add it and rerun: DISCORD_TOKEN=your_token_here\n');
  process.exit(1);
}

const headers = {
  'Authorization': 'Bot ' + DISCORD_TOKEN,
  'Content-Type': 'application/json',
  'User-Agent': 'PokeRaidBot (https://pogo-gc.vercel.app, 1.0)'
};

// ── Pokémon detection ─────────────────────────────────────────────────────
const BOSS_IDS = {
  mewtwo:150,mew:151,lugia:249,'ho-oh':250,hooh:250,
  entei:244,raikou:243,suicune:245,
  kyogre:382,groudon:383,rayquaza:384,
  dialga:483,palkia:484,giratina:487,
  reshiram:643,zekrom:644,kyurem:646,
  xerneas:716,yveltal:717,zygarde:718,
  solgaleo:791,lunala:792,necrozma:800,
  zacian:888,zamazenta:889,eternatus:890,calyrex:898,
  tyranitar:248,dragonite:149,salamence:373,garchomp:445,
  machamp:68,gengar:94,alakazam:65,lapras:131,snorlax:143,
  charizard:6,blastoise:9,venusaur:3,pikachu:25,
  togekiss:468,lucario:448,garchomp:445,
  kyurem:646,reshiram:643,zekrom:644,
  butterfree:12,diglett:50,wooper:194,sneasel:215,
  kirlia:281,absol:359,shinx:403,croagunk:453,blitzle:522,
  minccino:572,magikarp:129,gyarados:130,dratini:147,
};

function extractBoss(text) {
  const lower = text.toLowerCase();
  for (const [name, pid] of Object.entries(BOSS_IDS)) {
    if (lower.includes(name)) {
      return { name: name.charAt(0).toUpperCase() + name.slice(1), pid };
    }
  }
  return null;
}

function parseTier(text) {
  if (/mega/i.test(text))         return 7;
  if (/shadow/i.test(text))       return 8;
  if (/dynamax|max/i.test(text))  return 9;
  if (/legendary|tier\s*5|t5/i.test(text)) return 5;
  if (/tier\s*3|t3/i.test(text))  return 3;
  if (/tier\s*1|t1/i.test(text))  return 1;
  return 5;
}

function extractTimeStr(isoString) {
  // Convert ISO datetime to HH:MM local time
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Geocode via Nominatim ─────────────────────────────────────────────────
async function geocode(locationStr) {
  if (!locationStr) return null;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(locationStr) + '&format=json&limit=1';
    const r = await fetch(url, { headers: { 'User-Agent': 'PokeRaidBot/1.0' } });
    const d = await r.json();
    if (!d || !d.length) return null;
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch { return null; }
}

// ── Ably ──────────────────────────────────────────────────────────────────
const rest    = new Ably.Rest({ key: ABLY_KEY });
const channel = rest.channels.get('poke-raid-' + GROUP);
const posted  = new Set();

async function publishRaid(raid) {
  const key = raid.boss + '|' + raid.time + '|' + raid.location;
  if (posted.has(key)) return false;
  posted.add(key);

  const msg = {
    type: 'raid', subch: 'raids',
    user: USER, team: 'mystic',
    boss: raid.boss, location: raid.location,
    time: raid.time, players: '5+',
    pid: raid.pid || 25, tier: raid.tier || 5,
    note: raid.note || 'via Discord Events',
    ts: Date.now()
  };
  if (raid.lat) { msg.lat = raid.lat; msg.lng = raid.lng; }
  await channel.publish('msg', msg);

  if (raid.lat) {
    await channel.publish('map', {
      type: 'map', subtype: 'raid',
      name: raid.boss + ' @ ' + raid.location,
      lat: raid.lat, lng: raid.lng,
      user: USER, team: 'mystic', ts: msg.ts
    });
  }
  console.log('  ✅ Raid: ' + raid.boss + ' @ ' + raid.location + ' ' + raid.time);
  return true;
}

// ── Discord API helpers ───────────────────────────────────────────────────
async function discordGet(path) {
  const r = await fetch(DISCORD_API + path, { headers });
  if (r.status === 401) throw new Error('Invalid bot token — regenerate in Discord Developer Portal');
  if (r.status === 403) throw new Error('Bot not in server (403) — ask Greater Orlando admin to add the bot, or use Follow on desktop Discord');
  if (r.status === 404) throw new Error('Resource not found (404)');
  if (!r.ok) throw new Error('Discord API ' + r.status);
  return r.json();
}

// ── Fetch + process scheduled events ─────────────────────────────────────
async function processEvents() {
  console.log('\n[events] Fetching guild scheduled events…');
  let events;
  try {
    events = await discordGet('/guilds/' + GUILD_ID + '/scheduled-events?with_user_count=false');
  } catch (err) {
    console.error('  ' + err.message);
    return 0;
  }

  if (!events.length) { console.log('  No upcoming events found.'); return 0; }
  console.log('  Found ' + events.length + ' event(s)');

  let posted = 0;
  for (const ev of events) {
    // Skip completed events
    if (ev.status === 3) continue;

    const title = ev.name || '';
    const desc  = ev.description || '';
    const full  = title + ' ' + desc;
    const loc   = (ev.entity_metadata && ev.entity_metadata.location) || '';
    const time  = extractTimeStr(ev.scheduled_start_time);
    const tier  = parseTier(full);
    const boss  = extractBoss(full);

    console.log('  → ' + title + ' | ' + time + ' | ' + loc);

    // Geocode location
    const coords = await geocode(loc);

    const raid = {
      boss:     boss ? boss.name : title.slice(0, 30),
      pid:      boss ? boss.pid : 25,
      tier,
      location: loc || title,
      time,
      note:     desc.slice(0, 100),
      lat:      coords ? coords.lat : undefined,
      lng:      coords ? coords.lng : undefined
    };

    const didPost = await publishRaid(raid);
    if (didPost) posted++;

    // Rate limit geocoding
    await new Promise(r => setTimeout(r, 500));
  }
  return posted;
}

// ── Fetch news channel messages ───────────────────────────────────────────
async function processNewsChannel(channelId, label) {
  let msgs;
  try {
    msgs = await discordGet('/channels/' + channelId + '/messages?limit=10');
  } catch (err) {
    console.error('  [news/' + label + '] ' + err.message);
    return [];
  }

  return msgs
    .filter(m => m.content || (m.embeds && m.embeds.length))
    .map(m => {
      const embed = (m.embeds && m.embeds[0]) || {};
      const title   = embed.title || m.content.split('\n')[0].slice(0, 100);
      const url     = embed.url || (m.content.match(/https?:\/\/\S+/) || [])[0] || '';
      const thumb   = (embed.thumbnail && embed.thumbnail.url) ||
                      (embed.image && embed.image.url) || '';
      const pubDate = m.timestamp;
      return { title, url, thumbnail: thumb, pubDate, source: label };
    })
    .filter(n => n.title);
}

async function processNews() {
  console.log('\n[news] Fetching Discord news channels…');
  const allNews = [];
  for (const ch of NEWS_CHANNELS) {
    const items = await processNewsChannel(ch.id, ch.label);
    allNews.push(...items);
    console.log('  [' + ch.label + '] ' + items.length + ' items');
  }
  if (allNews.length) {
    writeFileSync(NEWS_CACHE, JSON.stringify({ ts: Date.now(), items: allNews }, null, 2));
    console.log('  Cached ' + allNews.length + ' news items to ' + NEWS_CACHE);
  }
  return allNews.length;
}

// ── Main loop ─────────────────────────────────────────────────────────────
async function tick() {
  console.log('\n[' + new Date().toLocaleTimeString() + '] Checking Discord (group: ' + GROUP + ')…');
  await processEvents();
  await processNews();
}

const watchMode = process.argv.includes('--watch');

if (watchMode) {
  console.log('\n📅 PokeRaid Discord Events Watcher');
  console.log('   Guild: Greater Orlando Pokemon GO (' + GUILD_ID + ')');
  console.log('   Interval: every ' + (INTERVAL_MS / 60000) + ' minutes');
  console.log('   Press Ctrl+C to stop\n');
  tick();
  setInterval(tick, INTERVAL_MS);
} else {
  // Single run
  tick().then(() => {
    console.log('\nDone. Run with --watch for continuous polling.');
    process.exit(0);
  });
}
