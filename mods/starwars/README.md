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
shown the first time each side opens; the CRAWL button replays it), `watch`
(the Holonet / Surveillance: the layouts' main area is a stack, `work`, of
Herdr's tab and a `holonet` column; turned on from the sidebar entry or the
`starwars:watch` command, the bar fills that column with a cell per agent, a
header over a live `{ terminal }` block, using `layout.set`, and shows it; it
rewrites it when agents come or go or change order: working first, then
blocked, done, idle; turned off, the column is emptied again).

The button at the top right switches sides. The speaker mutes the mod's own
sounds (Herdr's done/blocked alerts are untouched). All art (`art/`, `icons/`)
is original SVG; sounds (`sounds/`) were synthesized with ffmpeg.
