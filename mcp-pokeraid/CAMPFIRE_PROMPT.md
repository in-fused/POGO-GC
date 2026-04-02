# Campfire → PokeRaid — Claude Desktop Prompt Guide

Paste these into Claude Desktop after the MCP server is set up.

---

## Sync current raids

```
Open campfire.nianticlabs.com in the browser, navigate to the Raids
section, and use post_raid() for every raid you can see. Include the
gym name, boss, time, and tier. If you can see coordinates on the map
view, include those too so a pin drops automatically in the app.
```

---

## Switch group before syncing

```
Set my group to DOWNTOWN, then open Campfire and post all visible raids.
```

---

## Watch and summarise

```
Open Campfire, find all active raids in my area, post them to my group,
then announce to the group how many you found and what the best
legendary/mega is right now.
```

---

## One specific boss

```
Check Campfire for any active Kyogre raids. If you find one,
post it with the gym name and time.
```

---

## Tips

- Claude Desktop needs **computer use** enabled to read the screen.
- The `watcher.js` background process handles this fully automatically —
  you only need these prompts for on-demand or one-off syncs.
- To change your group permanently: edit `mcp-pokeraid/.env` and
  restart the watcher / Claude Desktop.
- The session cookie is saved to `campfire-session.json` after first
  login — delete that file if you want to log in with a different account.
