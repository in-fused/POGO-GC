/**
 * PokeRaid Campfire Watcher
 * Polls Campfire on a schedule and publishes new raids to Ably automatically.
 *
 * Usage:  npm run watch
 *
 * On first run a browser window opens for Niantic login.
 * After that it runs silently in the background.
 */
import * as Ably   from 'ably';
import { scrapeRaids } from './scraper.js';
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

const ABLY_KEY    = process.env.ABLY_KEY   || 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';
const GROUP       = (process.env.POGO_GROUP || 'GLOBAL').toUpperCase();
const USER        = process.env.POGO_USER  || 'CampfireBot';
const INTERVAL_MS = (parseInt(process.env.POLL_INTERVAL) || 10) * 60 * 1000;

const rest    = new Ably.Rest({ key: ABLY_KEY });
const channel = rest.channels.get('poke-raid-' + GROUP);

// Track what we've already posted this session to avoid duplicates
const posted = new Set();

async function publish(data) {
  const event = data.type === 'map' ? 'map' : 'msg';
  await channel.publish(event, data);
}

async function tick() {
  console.log(`[${new Date().toLocaleTimeString()}] Checking Campfire for raids (group: ${GROUP})…`);

  let raids;
  try {
    raids = await scrapeRaids();
  } catch (err) {
    console.error('  Scrape failed:', err.message);
    return;
  }

  if (!raids.length) {
    console.log('  No raids found.');
    return;
  }

  let newCount = 0;
  for (const r of raids) {
    const key = `${r.boss}|${r.location}|${r.time}`;
    if (posted.has(key)) continue;
    posted.add(key);
    newCount++;

    const data = {
      type: 'raid', subch: 'raids',
      user: USER, team: 'mystic',
      boss: r.boss, location: r.location, time: r.time,
      players: '5+', pid: r.pid || 25, tier: r.tier || 5,
      note: 'via Campfire', ts: Date.now()
    };
    if (r.lat) { data.lat = r.lat; data.lng = r.lng; }

    try {
      await publish(data);
      console.log(`  ✅ Posted: ${r.boss} @ ${r.location} (${r.time})`);

      // Also drop a map pin if we have coords
      if (r.lat && r.lng) {
        await publish({
          type: 'map', subtype: 'raid',
          name: `${r.boss} @ ${r.location}`,
          lat: r.lat, lng: r.lng,
          user: USER, team: '', ts: Date.now()
        });
      }
    } catch (err) {
      console.error(`  ❌ Publish failed for ${r.boss}:`, err.message);
    }
  }

  if (newCount === 0) console.log(`  ${raids.length} raid(s) found, all already posted.`);
  else console.log(`  → ${newCount} new raid(s) posted to group ${GROUP}.`);
}

// ── Run immediately, then on schedule ─────────────────────────────────────
console.log(`\n🔴 PokeRaid Watcher started`);
console.log(`   Group:    ${GROUP}`);
console.log(`   Interval: every ${INTERVAL_MS / 60000} minutes`);
console.log(`   Press Ctrl+C to stop\n`);

tick();
setInterval(tick, INTERVAL_MS);
