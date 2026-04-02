/**
 * PokeRaid MCP Server
 * Exposes tools for Claude Desktop to post raids, pins and announcements
 * directly into the PokeRaid PWA via Ably.
 *
 * Start: node server.js  (Claude Desktop manages this automatically)
 */
import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as Ably from 'ably';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const ENV_FILE = join(__dirname, '.env');
if (existsSync(ENV_FILE)) {
  readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const ABLY_KEY = process.env.ABLY_KEY || 'r8Lx5w.Ai1XrA:ladc1xtXqpWe6JKwQ24l0zgA9iQ8r48vs7Px2AzFqmM';
let GROUP = (process.env.POGO_GROUP || 'GLOBAL').toUpperCase();
let USER  = process.env.POGO_USER  || 'CampfireBot';

// ── Ably ───────────────────────────────────────────────────────────────────
const rest = new Ably.Rest({ key: ABLY_KEY });
const ch   = () => rest.channels.get('poke-raid-' + GROUP);

// ── Pokédex ID lookup (PokéAPI, cached in memory) ─────────────────────────
const pidCache = {};
function lookupPid(name) {
  if (pidCache[name]) return Promise.resolve(pidCache[name]);
  return new Promise(resolve => {
    const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
    https.get('https://pokeapi.co/api/v2/pokemon/' + slug, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { const id = JSON.parse(raw).id; pidCache[name] = id; resolve(id); }
        catch { resolve(25); }
      });
    }).on('error', () => resolve(25));
  });
}

const TIER_WORDS = { mega: 7, shadow: 8, dynamax: 9, max: 9, gigantamax: 9 };

// ── MCP server ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'pokeraid', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'post_raid',
      description:
        'Post a raid alert to the PokeRaid group. ' +
        'Use this for every raid you find on Campfire, in-game screenshots, or any source. ' +
        'If you can read a latitude/longitude from a map, include it so a pin drops automatically.',
      inputSchema: {
        type: 'object',
        properties: {
          boss:     { type: 'string',  description: 'Pokémon name e.g. Kyogre' },
          location: { type: 'string',  description: 'Gym name or address' },
          time:     { type: 'string',  description: 'Raid time in HH:MM (24-hour)' },
          players:  { type: 'string',  description: 'Players needed e.g. 5+', default: '5+' },
          tier:     { type: 'number',  description: '1 T1 · 3 T3 · 5 Legendary · 7 Mega · 8 Shadow · 9 Dynamax', default: 5 },
          lat:      { type: 'number',  description: 'Latitude if visible on map' },
          lng:      { type: 'number',  description: 'Longitude if visible on map' },
          note:     { type: 'string',  description: 'Optional note e.g. Need remote raiders' }
        },
        required: ['boss', 'location', 'time']
      }
    },
    {
      name: 'post_map_pin',
      description: 'Drop a pin on the group map (gym, pokéstop, spawn sighting).',
      inputSchema: {
        type: 'object',
        properties: {
          subtype: { type: 'string', enum: ['gym','stop','spawn','raid'], description: 'Pin type' },
          name:    { type: 'string', description: 'Name of the place or Pokémon' },
          lat:     { type: 'number' },
          lng:     { type: 'number' }
        },
        required: ['subtype', 'name', 'lat', 'lng']
      }
    },
    {
      name: 'set_group',
      description: 'Switch the active group channel. All subsequent posts go to this group.',
      inputSchema: {
        type: 'object',
        properties: {
          group: { type: 'string', description: 'Group code e.g. DOWNTOWN or GLOBAL' }
        },
        required: ['group']
      }
    },
    {
      name: 'announce',
      description: 'Send a plain chat message to the group (summaries, warnings, FYIs).',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        required: ['message']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async req => {
  const { name, arguments: a } = req.params;
  try {
    if (name === 'post_raid') {
      const pid  = await lookupPid(a.boss);
      const tier = a.tier ?? TIER_WORDS[String(a.boss).toLowerCase()] ?? 5;
      const data = {
        type: 'raid', subch: 'raids',
        user: USER, team: 'mystic',
        boss: a.boss, location: a.location, time: a.time,
        players: a.players || '5+',
        pid, tier,
        note: a.note || '',
        ts: Date.now()
      };
      if (a.lat) { data.lat = a.lat; data.lng = a.lng; }
      await ch().publish('msg', data);
      return { content: [{ type: 'text', text: `✅ Raid posted: ${a.boss} @ ${a.location} (${a.time}) → group ${GROUP}` }] };
    }

    if (name === 'post_map_pin') {
      await ch().publish('map', { type: 'map', subtype: a.subtype, name: a.name, lat: a.lat, lng: a.lng, user: USER, team: '', ts: Date.now() });
      return { content: [{ type: 'text', text: `📍 Pin posted: ${a.subtype} — ${a.name}` }] };
    }

    if (name === 'set_group') {
      GROUP = a.group.toUpperCase();
      return { content: [{ type: 'text', text: `Switched to group: ${GROUP}` }] };
    }

    if (name === 'announce') {
      await ch().publish('msg', { type: 'chat', subch: 'general', user: USER, team: '', text: a.message, ts: Date.now() });
      return { content: [{ type: 'text', text: `📢 Announced to ${GROUP}: ${a.message}` }] };
    }

    return { content: [{ type: 'text', text: 'Unknown tool: ' + name }] };
  } catch (err) {
    return { content: [{ type: 'text', text: 'Error: ' + err.message }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
