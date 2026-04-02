/**
 * Campfire scraper — uses Playwright to extract raid data from
 * https://campfire.nianticlabs.com/discover
 *
 * First run opens a visible browser so you can log in with your
 * Niantic account.  After that the session is saved to
 * campfire-session.json and reused automatically.
 *
 * Debug mode: set env DEBUG_SCRAPER=1 to save a screenshot + HTML dump
 * each run to help tune selectors.
 *
 * Personal use only. Keep poll intervals reasonable (10+ min).
 */
import { chromium }  from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dirname, 'campfire-session.json');
const CAMPFIRE_URL = 'https://campfire.nianticlabs.com/discover';
const DEBUG        = process.env.DEBUG_SCRAPER === '1';

// ── Known Pokémon name → dex ID ───────────────────────────────────────────
const BOSS_IDS = {
  mewtwo:150,mew:151,lugia:249,hooh:250,'ho-oh':250,entei:244,raikou:243,suicune:245,
  kyogre:382,groudon:383,rayquaza:384,dialga:483,palkia:484,giratina:487,
  reshiram:643,zekrom:644,kyurem:646,xerneas:716,yveltal:717,zygarde:718,
  solgaleo:791,lunala:792,necrozma:800,zacian:888,zamazenta:889,eternatus:890,
  calyrex:898,koraidon:1007,miraidon:1008,
  tyranitar:248,dragonite:149,salamence:373,garchomp:445,machamp:68,
  gengar:94,alakazam:65,lapras:131,snorlax:143,rhydon:112,clefable:36,
  charizard:6,blastoise:9,venusaur:3,pikachu:25,eevee:133,
  'mega charizard x':6,'mega charizard y':6,'mega venusaur':3,'mega blastoise':9,
  'mega gengar':94,'mega gyarados':130,'mega alakazam':65,'mega kangaskhan':115,
  'mega pidgeot':18,'mega aerodactyl':142,'mega ampharos':181,'mega scizor':212,
  'mega heracross':214,'mega houndoom':229,'mega tyranitar':248,'mega blaziken':257,
  'mega swampert':260,'mega gardevoir':282,'mega sableye':302,'mega mawile':303,
  'mega aggron':306,'mega medicham':308,'mega manectric':310,'mega salamence':373,
  'mega metagross':376,'mega latias':380,'mega latios':381,'mega rayquaza':384,
  'mega lopunny':428,'mega garchomp':445,'mega lucario':448,'mega beedrill':15,
};

const TIME_RE = /\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i;
const TIER_RE = /\b(tier\s*(\d)|t(\d)|mega|legendary|shadow|dynamax|max)\b/i;

function parseTier(text) {
  const m = TIER_RE.exec(text);
  if (!m) return 5;
  if (/mega/i.test(m[0]))    return 7;
  if (/shadow/i.test(m[0]))  return 8;
  if (/dynamax|max/i.test(m[0])) return 9;
  const n = parseInt(m[2] || m[3]);
  return [1,3,5].includes(n) ? n : 5;
}

function normaliseTime(raw) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(raw);
  if (!m) return '';
  var h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3]) {
    if (/PM/i.test(m[3]) && h < 12) h += 12;
    if (/AM/i.test(m[3]) && h === 12) h = 0;
  }
  return (String(h).padStart(2,'0')) + ':' + (String(min).padStart(2,'0'));
}

function findBossInText(lines) {
  for (var i = 0; i < lines.length; i++) {
    var key = lines[i].toLowerCase();
    if (BOSS_IDS[key]) return { boss: lines[i], pid: BOSS_IDS[key] };
    var keys = Object.keys(BOSS_IDS);
    for (var j = 0; j < keys.length; j++) {
      if (key.includes(keys[j])) return { boss: lines[i], pid: BOSS_IDS[keys[j]] };
    }
  }
  return null;
}

async function isLoggedIn(page) {
  // Look for user avatar, profile pic, or nav elements that only appear when logged in
  var loggedInSelectors = [
    '[data-testid="user-avatar"]',
    '[aria-label="Profile"]',
    '[class*="avatar"]',
    '[class*="profile"]',
    'img[alt*="avatar" i]',
    'img[alt*="profile" i]'
  ];
  for (var i = 0; i < loggedInSelectors.length; i++) {
    var el = await page.$(loggedInSelectors[i]).catch(function() { return null; });
    if (el) return true;
  }
  // Also check URL — if we're not on login/auth page, assume OK
  var url = page.url();
  return !url.includes('login') && !url.includes('auth') && !url.includes('signin') && url.includes('campfire');
}

/**
 * Main export — returns array of raid objects:
 * { boss, location, time, tier, pid, lat?, lng? }
 */
export async function scrapeRaids() {
  var storageState = existsSync(SESSION_FILE) ? SESSION_FILE : undefined;
  var headless = !!storageState;

  var browser = await chromium.launch({ headless: headless });
  var ctx = await browser.newContext({ storageState: storageState });
  var page = await ctx.newPage();
  var raids = [];

  try {
    await page.goto(CAMPFIRE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ── Wait for page to settle ────────────────────────────────────────────
    await page.waitForTimeout(3000);

    // ── Check login status ────────────────────────────────────────────────
    var loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      if (storageState) {
        // Saved session expired — delete it and relaunch visible
        console.log('  Session expired — deleting saved session, reopen with: npm run watch');
        var { unlinkSync } = await import('fs');
        unlinkSync(SESSION_FILE);
        await browser.close();
        return [];
      }
      // First run — visible browser, wait for user to log in
      console.log('\n🔐 Campfire login required.');
      console.log('   A browser window opened — sign in with your Niantic account.');
      console.log('   The scraper will continue automatically after login.\n');
      await page.waitForFunction(function() {
        return window.location.href.includes('campfire') &&
               !window.location.href.includes('login') &&
               !window.location.href.includes('auth') &&
               !window.location.href.includes('signin');
      }, { timeout: 180000 });
      // Navigate to /discover after login
      await page.goto(CAMPFIRE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      await ctx.storageState({ path: SESSION_FILE });
      console.log('✅ Session saved — future runs will be headless.\n');
    }

    // ── Debug: save screenshot + HTML ────────────────────────────────────
    if (DEBUG) {
      await page.screenshot({ path: join(__dirname, 'debug-screenshot.png'), fullPage: false });
      writeFileSync(join(__dirname, 'debug-page.html'), await page.content());
      console.log('  📸 Debug files saved: debug-screenshot.png, debug-page.html');
    }

    // ── Look for raid events in the left panel ────────────────────────────
    // Campfire /discover shows a list of upcoming events in the left sidebar.
    // We grab all list items / cards and filter for raid-related ones.
    var allText = await page.evaluate(function() {
      // Get all leaf-ish elements with meaningful text
      var results = [];
      var candidates = document.querySelectorAll('li, article, [role="listitem"], [class*="card"], [class*="item"], [class*="event"], [class*="row"]');
      candidates.forEach(function(el) {
        var text = el.innerText || el.textContent || '';
        text = text.trim();
        if (text.length > 5 && text.length < 500) {
          // Get bounding rect to find left-panel elements (roughly left half of screen)
          var rect = el.getBoundingClientRect();
          results.push({
            text: text,
            x: rect.left,
            y: rect.top,
            tag: el.tagName,
            cls: el.className
          });
        }
      });
      return results;
    });

    // Filter to raid-related cards
    var raidKeywords = /raid/i;
    var raidItems = allText.filter(function(item) {
      return raidKeywords.test(item.text);
    });

    if (DEBUG) {
      console.log('  Found ' + allText.length + ' total cards, ' + raidItems.length + ' raid-related');
      raidItems.slice(0, 5).forEach(function(item) {
        console.log('  ---');
        console.log('  TEXT:', item.text.slice(0, 200));
      });
    }

    for (var i = 0; i < raidItems.length; i++) {
      var item = raidItems[i];
      var text = item.text;
      var timeMatch = TIME_RE.exec(text);
      // Include if it has a time, or if it explicitly mentions a Pokémon name
      var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

      var bossResult = findBossInText(lines);
      if (!bossResult && !timeMatch) continue; // skip if no boss and no time

      var boss = bossResult ? bossResult.boss : (lines[0] || 'Unknown');
      var pid  = bossResult ? bossResult.pid  : 25;
      var tier = 5;
      for (var j = 0; j < lines.length; j++) {
        var t = parseTier(lines[j]);
        if (t !== 5 || TIER_RE.test(lines[j])) { tier = t; break; }
      }

      var location = '';
      for (var k = 0; k < lines.length; k++) {
        if (!TIME_RE.test(lines[k]) && !TIER_RE.test(lines[k]) && lines[k] !== boss && lines[k].length > 3) {
          location = lines[k];
          break;
        }
      }

      raids.push({
        boss: boss,
        pid:  pid,
        tier: tier,
        location: location,
        time: timeMatch ? normaliseTime(timeMatch[0]) : '',
        lat: undefined,
        lng: undefined
      });
    }

    // Dedup
    var seen = new Set();
    raids = raids.filter(function(r) {
      var key = r.boss + '|' + r.location + '|' + r.time;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  } finally {
    await browser.close();
  }

  return raids;
}
