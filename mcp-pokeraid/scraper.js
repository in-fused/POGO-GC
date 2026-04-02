/**
 * Campfire scraper — uses Playwright to extract raid data.
 *
 * First run opens a visible browser so you can log in with your
 * Niantic account.  After that the session cookie is saved to
 * campfire-session.json and reused automatically — no login needed again.
 *
 * ⚠️  This automates your own account for personal use.
 *     Niantic's ToS prohibits third-party automation — use at your own risk.
 *     Keep poll intervals reasonable (10+ min) to avoid detection.
 */
import { chromium }  from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dirname, 'campfire-session.json');
const CAMPFIRE_URL = 'https://campfire.nianticlabs.com';

// ── Known Pokémon name → dex ID (current/recent raid bosses, extended list) ──
const BOSS_IDS = {
  mewtwo:382,kyogre:382,groudon:383,rayquaza:384,dialga:483,palkia:484,giratina:487,
  reshiram:643,zekrom:644,kyurem:646,xerneas:716,yveltal:717,zygarde:718,
  solgaleo:791,lunala:792,necrozma:800,zacian:888,zamazenta:889,eternatus:890,
  calyrex:898,koraidon:1007,miraidon:1008,
  tyranitar:248,dragonite:149,salamence:373,garchomp:445,machamp:68,
  gengar:94,alakazam:65,lapras:131,snorlax:143,rhydon:112,clefable:36,
  // megas
  'mega charizard x':6,'mega charizard y':6,'mega venusaur':3,'mega blastoise':9,
  'mega gengar':94,'mega gyarados':130,'mega alakazam':65,'mega kangaskhan':115,
  'mega pidgeot':18,'mega aerodactyl':142,'mega ampharos':181,'mega scizor':212,
  'mega heracross':214,'mega houndoom':229,'mega tyranitar':248,'mega blaziken':257,
  'mega swampert':260,'mega gardevoir':282,'mega sableye':302,'mega mawile':303,
  'mega aggron':306,'mega medicham':308,'mega manectric':310,'mega sharpedo':319,
  'mega camerupt':323,'mega altaria':334,'mega banette':354,'mega absol':359,
  'mega glalie':362,'mega salamence':373,'mega metagross':376,'mega latias':380,
  'mega latios':381,'mega rayquaza':384,'mega lopunny':428,'mega garchomp':445,
  'mega lucario':448,'mega abomasnow':460,'mega beedrill':15,'mega pidgeot':18,
};

// Common time patterns: "2:30 PM", "14:30", "ends in 23m"
const TIME_RE   = /\b(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}[hH]\s*\d{0,2}[mM]?)\b/i;
// Tier patterns: "Tier 5", "T5", "★★★★★", "Mega", "Legendary"
const TIER_RE   = /\b(tier\s*(\d)|t(\d)|mega|legendary|shadow|dynamax)\b/i;

function parseTier(text) {
  const m = TIER_RE.exec(text);
  if (!m) return 5;
  if (/mega/i.test(m[0]))    return 7;
  if (/shadow/i.test(m[0]))  return 8;
  if (/dynamax/i.test(m[0])) return 9;
  const n = parseInt(m[2] || m[3]);
  return [1,3,5].includes(n) ? n : 5;
}

function normaliseTime(raw) {
  // Returns HH:MM string (24h), or '' if unparseable
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(raw);
  if (!m) return '';
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3]) {
    if (/PM/i.test(m[3]) && h < 12) h += 12;
    if (/AM/i.test(m[3]) && h === 12) h = 0;
  }
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

async function getPage() {
  const storageState = existsSync(SESSION_FILE) ? SESSION_FILE : undefined;
  const headless = !!storageState; // visible on first run so you can log in

  const browser = await chromium.launch({ headless, channel: 'chromium' });
  const ctx = await browser.newContext({
    storageState,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  return { browser, ctx, page };
}

/**
 * Main export — returns array of raid objects:
 * { boss, location, time, tier, pid, lat?, lng? }
 */
export async function scrapeRaids() {
  const { browser, ctx, page } = await getPage();
  const raids = [];

  try {
    await page.goto(CAMPFIRE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // ── If not logged in, wait up to 3 minutes for user to do so ─────────
    const isLogin = await page.$('[data-testid="login"], [class*="login"], button:has-text("Sign in")').catch(() => null);
    if (isLogin || page.url().includes('login') || page.url().includes('auth')) {
      if (!existsSync(SESSION_FILE)) {
        console.log('\n🔐 Campfire login required.');
        console.log('   A browser window opened — sign in with your Niantic account.');
        console.log('   The window will close automatically once logged in.\n');
        await page.waitForURL(u => u.includes('campfire') && !u.includes('login') && !u.includes('auth'), { timeout: 180000 });
        await ctx.storageState({ path: SESSION_FILE });
        console.log('✅ Session saved — future runs will log in automatically.\n');
      }
    }

    // ── Navigate to Raids section (try common selectors) ─────────────────
    const raidNav = await page.$('[href*="raid"], [data-tab*="raid"], [aria-label*="raid" i], button:has-text("Raid")').catch(() => null);
    if (raidNav) await raidNav.click().catch(() => {});
    await page.waitForTimeout(2000);

    // ── Extract raid cards from the DOM ───────────────────────────────────
    // Campfire uses dynamic class names; we grab cards by structural heuristic:
    // any element containing a Pokémon name + time + location together.
    const cards = await page.$$('[class*="raid" i], [class*="card" i], [class*="event" i]');

    for (const card of cards) {
      const text = (await card.innerText().catch(() => '')).trim();
      if (!text) continue;

      // Must contain a time pattern to be a raid card
      const timeMatch = TIME_RE.exec(text);
      if (!timeMatch) continue;

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      // Find boss name: first line that matches a known Pokémon
      let boss = '', pid = 25, tier = 5;
      for (const line of lines) {
        const key = line.toLowerCase();
        if (BOSS_IDS[key]) { boss = line; pid = BOSS_IDS[key]; break; }
        // Partial match
        for (const [k, v] of Object.entries(BOSS_IDS)) {
          if (key.includes(k)) { boss = line; pid = v; break; }
        }
        if (boss) break;
      }
      if (!boss) boss = lines[0] || 'Unknown';

      // Find tier
      for (const line of lines) {
        const t = parseTier(line);
        if (t !== 5 || /tier|★/i.test(line)) { tier = t; break; }
      }

      // Location: line that doesn't look like a time or tier
      const location = lines.find(l =>
        !TIME_RE.test(l) && !TIER_RE.test(l) && l !== boss && l.length > 3
      ) || '';

      // Try to extract lat/lng from data attributes or nearby map elements
      let lat, lng;
      try {
        lat = parseFloat(await card.getAttribute('data-lat') || '');
        lng = parseFloat(await card.getAttribute('data-lng') || await card.getAttribute('data-lon') || '');
      } catch { /* optional */ }

      raids.push({
        boss,
        pid,
        tier,
        location,
        time: normaliseTime(timeMatch[0]),
        lat: isNaN(lat) ? undefined : lat,
        lng: isNaN(lng) ? undefined : lng
      });
    }

    // ── Dedup by boss+location+time ───────────────────────────────────────
    const seen = new Set();
    return raids.filter(r => {
      const key = `${r.boss}|${r.location}|${r.time}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

  } finally {
    await browser.close();
  }
}
