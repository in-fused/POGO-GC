/**
 * PokeRaid MCP Setup
 *
 * Does everything automatically:
 *   1. Installs npm dependencies
 *   2. Installs the Playwright Chromium browser
 *   3. Creates a .env config file (you can edit group/user here later)
 *   4. Patches Claude Desktop's config so the MCP server is registered
 *
 * Usage:  node setup.js  (run once from the mcp-pokeraid/ folder)
 *         node setup.js --group DOWNTOWN   (set your group code)
 *         node setup.js --user AshK        (set your display name)
 */
import { execSync }                  from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname }             from 'path';
import { homedir, platform }         from 'os';
import { fileURLToPath }             from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg  = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : def; };

const GROUP    = arg('--group', 'GLOBAL').toUpperCase();
const USER     = arg('--user',  'CampfireBot');
const INTERVAL = arg('--interval', '10'); // minutes
const ABLY_KEY = 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';

// ── Step 1: npm install ────────────────────────────────────────────────────
console.log('\n📦 Installing npm dependencies…');
execSync('npm install', { cwd: __dirname, stdio: 'inherit' });

// ── Step 2: Playwright browser ────────────────────────────────────────────
console.log('\n🌐 Installing Playwright Chromium browser (~130 MB, one time)…');
execSync('npx playwright install chromium', { cwd: __dirname, stdio: 'inherit' });

// ── Step 3: Write .env ────────────────────────────────────────────────────
const envPath = join(__dirname, '.env');
const envContent = [
  `ABLY_KEY=${ABLY_KEY}`,
  `POGO_GROUP=${GROUP}`,
  `POGO_USER=${USER}`,
  `POLL_INTERVAL=${INTERVAL}`,
  ``,
  `# Discord bridge — paste your bot token below, channel ID is pre-filled`,
  `DISCORD_TOKEN=`,
  `DISCORD_CHANNEL_ID=1489318892756140233`
].join('\n') + '\n';
writeFileSync(envPath, envContent);
console.log(`\n✏️  Config written to ${envPath}`);
console.log(`   Group: ${GROUP}  |  User: ${USER}  |  Poll: every ${INTERVAL} min`);
console.log('   Edit this file any time to change settings.\n');

// ── Step 4: Patch Claude Desktop config ───────────────────────────────────
function claudeConfigPath() {
  const p = platform();
  if (p === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (p === 'win32')  return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

const cfgPath = claudeConfigPath();
let cfg = {};
if (existsSync(cfgPath)) {
  try { cfg = JSON.parse(readFileSync(cfgPath, 'utf8')); }
  catch { /* malformed — start fresh */ }
}

cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers['pokeraid'] = {
  command: 'node',
  args: [join(__dirname, 'server.js')],
  env: {
    ABLY_KEY,
    POGO_GROUP: GROUP,
    POGO_USER:  USER
  }
};

const cfgDir = join(cfgPath, '..');
if (!existsSync(cfgDir)) mkdirSync(cfgDir, { recursive: true });
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

console.log(`🤖 Claude Desktop config updated:`);
console.log(`   ${cfgPath}\n`);

// ── Done ──────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════');
console.log('✅  Setup complete!\n');
console.log('  DISCORD BRIDGE (recommended — reads your server automatically):');
console.log('    1. Add your bot token to .env (DISCORD_TOKEN=...)');
console.log('    2. Follow the source announcement channel to your server (desktop Discord)');
console.log('    3. npm run discord\n');
console.log('  CAMPFIRE WATCHER (polls Campfire web on a schedule):');
console.log('    npm run watch\n');
console.log('  CLAUDE DESKTOP (manual + AI assist):');
console.log('    1. Restart Claude Desktop');
console.log('    2. The pokeraid tools will appear automatically');
console.log('    3. Say: "Post a Mewtwo raid at Central Park at 3pm"');
console.log('═══════════════════════════════════════════════════\n');
