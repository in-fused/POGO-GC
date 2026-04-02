/**
 * PokeRaid Discord Bridge
 *
 * Reads a Discord channel (your own server, where the Greater Orlando
 * campfire-notifications announcements are forwarded) and pushes any
 * raid / meetup posts to your PokeRaid app via Ably.
 *
 * Setup:
 *   1. Add DISCORD_TOKEN and DISCORD_CHANNEL_ID to .env
 *   2. Invite the bot to YOUR server (admin → OAuth2 → bot scope,
 *      Read Messages + Read Message History permissions)
 *   3. Follow the source announcement channel to your server channel
 *      (Desktop Discord → source channel → Follow button)
 *   4. npm run discord
 */
import * as Ably from 'ably';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
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

const DISCORD_TOKEN      = process.env.DISCORD_TOKEN;
const WATCH_CHANNEL_ID   = process.env.DISCORD_CHANNEL_ID || '1489318892756140233';
const ABLY_KEY           = process.env.ABLY_KEY || 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';
const GROUP              = (process.env.POGO_GROUP || 'GLOBAL').toUpperCase();
const USER               = process.env.POGO_USER  || 'DiscordBot';

if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN not set in .env — add it and restart.');
  process.exit(1);
}

// ── Pokémon name → dex ID ─────────────────────────────────────────────────
const BOSS_IDS = {
  bulbasaur:1,charmander:4,squirtle:7,pikachu:25,eevee:133,
  mewtwo:150,mew:151,lugia:249,'ho-oh':250,hooh:250,
  entei:244,raikou:243,suicune:245,
  kyogre:382,groudon:383,rayquaza:384,
  dialga:483,palkia:484,giratina:487,
  reshiram:643,zekrom:644,kyurem:646,
  xerneas:716,yveltal:717,zygarde:718,
  solgaleo:791,lunala:792,necrozma:800,
  zacian:888,zamazenta:889,eternatus:890,calyrex:898,
  koraidon:1007,miraidon:1008,
  tyranitar:248,dragonite:149,salamence:373,garchomp:445,
  machamp:68,gengar:94,alakazam:65,lapras:131,snorlax:143,
  charizard:6,blastoise:9,venusaur:3,rhydon:112,clefairy:35,
  clefable:36,togekiss:468,togetic:176,togepy:175,
  butterfree:12,diglett:50,wooper:194,sneasel:215,
  kirlia:281,absol:359,shinx:403,croagunk:453,blitzle:522,
  minccino:572,magikarp:129,gyarados:130,dratini:147,
  larvitar:246,bagon:371,gible:443,riolu:447,lucario:448,
};

// ── Time parsing ──────────────────────────────────────────────────────────
const TIME_RE = /\b(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\s*(?:AM|PM))\b/i;
const DATE_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b|\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+\w+\s+\d{1,2}/i;

function extractTime(text) {
  const m = TIME_RE.exec(text);
  if (!m) return '';
  const raw = m[1].trim();
  const t = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i.exec(raw);
  if (!t) return '';
  let h = parseInt(t[1]), min = parseInt(t[2] || '0');
  if (t[3]) {
    if (/PM/i.test(t[3]) && h < 12) h += 12;
    if (/AM/i.test(t[3]) && h === 12) h = 0;
  }
  return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
}

function extractBosses(text) {
  const lower = text.toLowerCase();
  const found = [];
  const keys = Object.keys(BOSS_IDS);
  for (const k of keys) {
    if (lower.includes(k)) {
      found.push({ name: k.charAt(0).toUpperCase() + k.slice(1), pid: BOSS_IDS[k] });
    }
  }
  // Deduplicate by pid
  const seen = new Set();
  return found.filter(b => { if (seen.has(b.pid)) return false; seen.add(b.pid); return true; });
}

function extractLocation(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Priority 1: line with explicit location signal
  for (const line of lines) {
    if (/📍|📌|location:|where:|gym:|at:/i.test(line)) {
      return line.replace(/^[📍📌]\s*/, '').replace(/^(location:|where:|gym:|at:)\s*/i, '').trim();
    }
  }
  // Priority 2: line that looks like a street address (has a number + street word)
  for (const line of lines) {
    if (/^\d+\s+\w/.test(line) && /st\b|ave\b|blvd\b|rd\b|dr\b|ln\b|way\b|ct\b/i.test(line)) {
      return line;
    }
  }
  // Priority 3: line with park/plaza/mall/gym/center keywords
  for (const line of lines) {
    if (/park|plaza|mall|center|lake|field|garden|trail|station|downtown/i.test(line) && line.length < 80) {
      return line;
    }
  }
  // Fall back to last meaningful line
  return lines[lines.length - 1] || '';
}

function parseTier(text) {
  if (/mega/i.test(text)) return 7;
  if (/shadow/i.test(text)) return 8;
  if (/dynamax|max/i.test(text)) return 9;
  const m = /(?:tier|t)\s*(\d)/i.exec(text);
  if (m) { const n = parseInt(m[1]); return [1,3,5].includes(n) ? n : 5; }
  if (/legendary/i.test(text)) return 5;
  return 5;
}

// ── Geocode via Nominatim ─────────────────────────────────────────────────
async function geocode(locationStr) {
  if (!locationStr || locationStr.length < 5) return null;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(locationStr) + '&format=json&limit=1&countrycodes=us';
    const r = await fetch(url, { headers: { 'User-Agent': 'PokeRaidBot/1.0' } });
    const d = await r.json();
    if (!d || !d.length) return null;
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch { return null; }
}

// ── Ably publish ──────────────────────────────────────────────────────────
const rest    = new Ably.Rest({ key: ABLY_KEY });
const channel = rest.channels.get('poke-raid-' + GROUP);

async function publishRaid(raid) {
  const ts = Date.now();

  // Geocode the location for map pins
  const coords = raid.lat ? { lat: raid.lat, lng: raid.lng } : await geocode(raid.location);

  const msg = {
    type: 'raid', subch: 'raids',
    user: USER, team: 'mystic',
    boss: raid.boss, location: raid.location,
    time: raid.time, players: '5+',
    pid: raid.pid || 25, tier: raid.tier || 5,
    note: raid.note || 'via Discord',
    ts
  };
  if (coords) { msg.lat = coords.lat; msg.lng = coords.lng; }

  await channel.publish('msg', msg);

  // Drop a map pin if we have coordinates
  if (coords) {
    await channel.publish('map', {
      type: 'map', subtype: 'raid',
      name: raid.boss + ' @ ' + raid.location,
      lat: coords.lat, lng: coords.lng,
      pid: raid.pid || 25, tier: raid.tier || 5,
      user: USER, team: 'mystic', ts
    });
  }

  console.log('  ✅ Posted raid: ' + raid.boss + ' @ ' + raid.location + ' ' + raid.time +
    (coords ? ' 📍' : ' (no coords)'));
}

async function publishAnnouncement(title, body) {
  await channel.publish('msg', {
    type: 'chat', subch: 'general',
    user: USER, team: 'mystic',
    text: '📢 ' + title + (body ? ' — ' + body.slice(0, 120) : ''),
    ts: Date.now()
  });
  console.log('  📢 Announced: ' + title);
}

// ── Message handler ───────────────────────────────────────────────────────
const posted = new Set();

async function handleMessage(msg) {
  // Ignore bot's own messages
  if (msg.author.bot && msg.author.id === msg.client.user.id) return;

  // Pull text from message content + all embeds (followed posts arrive as embeds)
  const embedTexts = (msg.embeds || []).map(e =>
    [e.title, e.description, e.author?.name,
     ...(e.fields || []).map(f => f.name + ' ' + f.value),
     e.footer?.text].filter(Boolean).join('\n')
  );
  const content = [msg.content || '', ...embedTexts].join('\n').trim();

  if (!content) return;

  const dedupeKey = content.slice(0, 80);
  if (posted.has(dedupeKey)) return;
  posted.add(dedupeKey);

  console.log('\n[discord] New message in watched channel:');
  console.log('  ' + content.slice(0, 120).replace(/\n/g, ' | '));

  const time     = extractTime(content);
  const location = extractLocation(content);
  const tier     = parseTier(content);
  const bosses   = extractBosses(content);

  // If specific bosses found, post one raid card per boss (up to 4)
  if (bosses.length > 0) {
    for (const b of bosses.slice(0, 4)) {
      await publishRaid({ boss: b.name, pid: b.pid, tier, time, location,
        note: content.split('\n')[0].slice(0, 80) });
    }
    return;
  }

  // If it looks like a meetup/event (has time + location), post as a single raid card
  // with a generic boss name derived from the title
  const titleLine = content.split('\n')[0].trim();
  if (time && location && /raid|meetup|hour|community|day/i.test(content)) {
    await publishRaid({ boss: titleLine.slice(0, 30), pid: 25, tier, time, location,
      note: content.split('\n').slice(1).join(' ').slice(0, 100) });
    return;
  }

  // Otherwise post as a general announcement if it mentions Pokemon GO topics
  if (/raid|pokemon|gym|meetup|campfire|kyogre|lugia|mewtwo/i.test(content)) {
    const title = titleLine.slice(0, 60);
    const body  = content.split('\n').slice(1).join(' ').slice(0, 120);
    await publishAnnouncement(title, body);
  }
}

// ── Discord client ────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, c => {
  console.log('\n🤖 PokeRaid Discord Bridge online');
  console.log('   Logged in as: ' + c.user.tag);
  console.log('   Watching channel: ' + WATCH_CHANNEL_ID);
  console.log('   Posting to group: ' + GROUP);
  console.log('   Press Ctrl+C to stop\n');
});

client.on(Events.MessageCreate, async msg => {
  if (msg.channelId !== WATCH_CHANNEL_ID) return;
  try { await handleMessage(msg); }
  catch (err) { console.error('  Error processing message:', err.message); }
});

// Also catch edited messages (Campfire bot sometimes edits)
client.on(Events.MessageUpdate, async (_, msg) => {
  if (msg.channelId !== WATCH_CHANNEL_ID) return;
  try { await handleMessage(msg); }
  catch (err) { console.error('  Error processing edit:', err.message); }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Discord login failed:', err.message);
  console.error('Check your DISCORD_TOKEN in .env');
  process.exit(1);
});
