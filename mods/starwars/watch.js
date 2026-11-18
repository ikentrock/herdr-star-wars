// The Holonet (Sith: Surveillance): every agent's live terminal in one grid, so
// you can watch them all without clicking through each.
//
// It lives in the layout itself, like a space: the main area is a stack
// ("work") of Herdr's tab ("main") and a "holonet" column. Turned on, the
// holonet column gets a title bar and one cell per agent, a small header (this
// role, part "cell") over a live `{ terminal }` block, and the stack shows it.
// You can click into a cell and type to that agent there. Turned off, the
// column is emptied (so no terminal stays drawn at a cell's size) and the stack
// goes back to the tab.
//
// The sidebar's Holonet entry turns it on and off; picking a space, tab or agent
// leaves it. The bar is the controller (it's always shown): it rewrites the
// holonet column with layout.set whenever agents come or go or the order
// changes. Cells are sorted by status: working first, then needs you, finished,
// at rest; within each, Herdr's own order (space, tab, pane).

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, props, run, theme, shared, setShared, layout } from "herdr";
import { side, spaced, pic, crystal, iconButton, sfx, agentName, task, statusColor } from "./kit.js";

// Running ones first, then the ones that need you, finished, and at rest.
const ORDER = { working: 0, blocked: 1, done: 2, idle: 3 };

/** Every agent, sorted for the grid. */
export function watchOrder() {
  return agents()
    .map((a, i) => [a, i])
    .sort(([a, i], [b, j]) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || i - j)
    .map(([a]) => a);
}

const ON = "starwars.watch";
const TITLE = 40;
const HEADER = 30;

export function watching() {
  return shared(ON) === true;
}

export function toggleWatch() {
  sfx("hum");
  setShared(ON, !watching());
}

/** Back to the tabs, when someone picks a space, tab or agent. */
export function leaveWatch() {
  if (watching()) setShared(ON, false);
}

const safe = (address) => String(address).replace(/[^A-Za-z0-9_-]/g, "_");

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

/** Columns for n cells: as square as it gets, a little wider than tall. */
function columns(n) {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 12) return 4;
  return Math.ceil(Math.sqrt(n));
}

function cell(s, a) {
  const id = safe(a.address);
  return {
    id: `holonet-cell-${id}`,
    type: "column",
    background: "background",
    border: { width: 1, color: "border" },
    radius: 10,
    children: [
      { id: `holonet-head-${id}`, type: "block", size: { px: HEADER }, content: { mod: "starwars", props: { role: "watch", part: "cell", side: s.name, terminal: a.address } } },
      { id: `holonet-term-${id}`, type: "block", padding: [4, 8], content: { terminal: a.address } },
    ],
  };
}

function empty(s) {
  return { id: "holonet-empty", type: "block", content: { mod: "starwars", props: { role: "watch", part: "empty", side: s.name } } };
}

function contents(s, ags) {
  const title = { id: "holonet-title", type: "block", size: { px: TITLE }, content: { mod: "starwars", props: { role: "watch", part: "title", side: s.name } } };
  if (!ags.length) return [title, empty(s)];
  const cols = columns(ags.length);
  const rows = [];
  for (let i = 0; i < ags.length; i += cols) {
    const r = ags.slice(i, i + cols);
    rows.push({ id: `holonet-row-${i / cols}`, type: "row", gap: 10, padding: [0, 10], children: r.map((a) => cell(s, a)) });
  }
  // Rows go straight into the holonet column: Herdr takes at most 16 levels of
  // nesting in a command's arguments, and the whole layout goes to layout.set.
  return [title, ...rows];
}

const where = () => {
  const sp = spaces().find((x) => x.active);
  return `${sp?.id}|${sp?.tabs.find((tb) => tb.active)?.id}`;
};

/**
 * Keeps the holonet column and the stack in step with the switch and the agents.
 * Call from a role that is always shown (the bar); keeps its bookkeeping on `self`.
 * Only for layouts that have the "work" stack and "holonet" column.
 */
export function syncWatch(self, s) {
  const root = layout();
  if (!find(root, "holonet") || !find(root, "work")) return;
  let on = watching();
  // Moving to another space or tab (keys, the droid, a toast) leaves the Holonet.
  // Go on in this same pass: setting shared state from a render doesn't render
  // this copy again.
  const here = where();
  if (on && self.watchWhere !== undefined && self.watchWhere !== here) {
    setShared(ON, false);
    on = false;
  }
  self.watchWhere = here;
  const ags = on ? watchOrder() : [];
  const sig = `${on}|${ags.map((a) => a.address).join(",")}`;
  if (sig === self.watchSig) return;
  self.watchSig = sig;
  const want = on ? contents(s, ags) : [empty(s)];
  const tree = JSON.parse(JSON.stringify(root));
  const column = find(tree, "holonet");
  // Rewrite the layout only when the column really changes (it's saved to the file).
  if (JSON.stringify(column.children) !== JSON.stringify(want)) {
    column.children = want;
    run("layout.set", { layout: tree });
  }
  run("layout.select", { stack: "work", child: on ? "holonet" : "main" });
}

export default class Watch {
  init() {}

  title(s, t) {
    const ags = agents();
    const counts = {};
    for (const a of ags) counts[a.status] = (counts[a.status] ?? 0) + 1;
    const summary = Object.keys(ORDER)
      .filter((k) => counts[k])
      .map((k) => `${counts[k]} ${s.words[k]}`)
      .join(" · ");
    return h_flex()
      .id("watch-title")
      .size_full()
      .px(12)
      .gap(10)
      .items_center()
      .font_family(s.font)
      .text_size(12)
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .child(pic(`art/emblem-${s.name}.svg`, 18))
      .child(
        div()
          .flex_none()
          .font_family(s.titleFont)
          .text_size(13)
          .font_weight(700)
          .text_color(s.name === "sith" ? s.blade : t.foreground)
          .child(spaced(s.watchTitle)),
      )
      .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(summary || s.empty))
      .child(iconButton("watch-close", "close", t.muted, t.hover, () => toggleWatch(), "Back to the tabs"));
  }

  cell(s, t, address) {
    const a = agents().find((x) => x.address === address);
    const st = a?.status ?? null;
    const space = a ? spaces().find((x) => x.id === a.space) : null;
    const where = a ? [space?.name ?? a.space_name, a.tab_name].filter(Boolean).join(" › ") : "";
    const doing = a ? task(a) : "";
    return h_flex()
      .id("watch-cell")
      .size_full()
      .px(8)
      .gap(8)
      .items_center()
      .font_family(s.font)
      .text_size(12)
      .bg(t.surface)
      .border_b(1)
      .border_color(st === "blocked" ? s.blockedBlade : t.border)
      .child(crystal(s, st, 7))
      .child(div().flex_none().font_semibold().text_color(t.foreground).child(a ? agentName(a) : address))
      .when(Boolean(st), (el) => el.child(div().flex_none().text_color(statusColor(s, st)).child(s.words[st] ?? st)))
      .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child([where, doing].filter(Boolean).join(" · ")))
      .child(
        div()
          .id("watch-go")
          .flex_none()
          .px(6)
          .py(1)
          .rounded(4)
          .cursor_pointer()
          .text_color(t.muted)
          .hover((el) => el.bg(t.hover).text_color(t.foreground))
          .tooltip("Go to this agent")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            setShared(ON, false);
            run("agent.focus", { terminal: address });
          })
          .child("↗ go"),
      );
  }

  empty(s, t) {
    return v_flex()
      .size_full()
      .items_center()
      .justify_center()
      .gap(12)
      .bg(t.canvas)
      .font_family(s.font)
      .text_color(t.muted)
      .child(pic(`art/emblem-${s.name}.svg`, 48))
      .child(div().text_size(14).child(s.empty));
  }

  render() {
    const p = props() ?? {};
    const s = side(p);
    const t = theme();
    if (p.part === "cell") return this.cell(s, t, p.terminal);
    if (p.part === "empty") return this.empty(s, t);
    return this.title(s, t);
  }
}
