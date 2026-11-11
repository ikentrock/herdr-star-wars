# Star Wars for Herdr

Two layouts, one mod (in roles, like Herdr 98):

- `layouts/jedi.json` + `themes/jedi.json`: **Jedi Archives** (light). Parchment
  and archive shelves, holocrons for spaces, padawans for agents, blue blades,
  a training-remote droid that gives tips like an old master.
- `layouts/sith.json` + `themes/sith.json`: **Sith Citadel** (dark). Obsidian
  and a red-tinted starfield, conquered systems for spaces, apprentices for
  agents, red blades, an interrogator orb that files Imperial reports.

Roles (`props: { side, role }`): `bar`, `sidebar`, `header` (pane header with
a lightsaber that ignites across the focused pane and flickers on a pane whose
agent is blocked), `status`, `droid` (floating), `crawl` (opening-crawl dialog,
shown the first time each side opens; the CRAWL button replays it).

The button at the top right switches sides. The speaker mutes the mod's own
sounds (Herdr's done/blocked alerts are untouched). All art (`art/`, `icons/`)
is original SVG; sounds (`sounds/`) were synthesized with ffmpeg.
