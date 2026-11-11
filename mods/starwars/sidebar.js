// The sidebar over a starfield (Sith), or with archive shelves below its lists (Jedi): spaces as
// holocrons or conquered systems, then every agent as a padawan or apprentice
// with a small saber that tells its state: swinging while it works, steady
// when done, flickering when it needs you, sheathed when idle.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, panes, home, props, run, theme, setAgentOrder } from "herdr";
import { side, spaced, pic, art, crystal, glyph, iconButton, statusColor, agentName, sfx, task, tabTitle, URGENCY } from "./kit.js";
import { folders, toggleFolder, openSpaceMenu, openNameDialog } from "./folders.js";

// Where the agent runs: its pane's live folder (last part, "~" at home) and git branch.
function where(pane) {
  const cwd = pane?.cwd ? String(pane.cwd).replace(/\/+$/, "") : "";
  const folder = !cwd ? "" : cwd === home().replace(/\/+$/, "") ? "~" : cwd.split("/").pop();
  return [folder, pane?.branch && `⎇ ${pane.branch}`].filter(Boolean).join(" ");
}

// Secondary text: the Sith side's dim is too faint on near-black, so it uses muted.
function soft(s, t) {
  return s.name === "sith" ? t.muted : t.dim;
}

export default class Sidebar {
  init() {}

  heading(s, t, text, action) {
    return h_flex()
      .px(14)
      .pt(14)
      .pb(6)
      .items_center()
      .child(div().flex_1().font_family(s.titleFont).text_size(s.name === "sith" ? 12 : 11).font_weight(700).text_color(s.name === "sith" ? t.muted : t.dim).child(spaced(text)))
      .when(Boolean(action), (el) => el.child(action));
  }

  space(s, t, sp, inFolder = false) {
    const on = sp.active;
    return h_flex()
      .id(`sp-${sp.id}`)
      .relative()
      .mx(8)
      .px(8)
      .when(inFolder, (el) => el.pl(22))
      .py(6)
      .gap(9)
      .items_center()
      .rounded(s.name === "sith" ? 2 : 8)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected))
      .hover((st) => st.bg(on ? t.selected : t.hover))
      .on_click((e, _cx) => {
        if (e?.click_count >= 2) run("space.rename", { id: sp.id });
        else run("space.select", { id: sp.id });
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openSpaceMenu(s, sp.id);
      })
      .when(on, (el) => el.child(div().absolute().left(0).top(6).bottom(6).w(3).rounded(2).bg(s.blade)))
      .child(pic(`art/holocron-${s.name}.svg`, 18).opacity(on ? 1 : 0.6))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .child(div().truncate().text_color(on ? t.foreground : t.muted).font_weight(on ? 600 : s.weight).child(sp.name))
          .when(Boolean(sp.branch || sp.machine), (el) =>
            el.child(div().truncate().text_size(11).text_color(soft(s, t)).child([sp.machine, sp.branch && `⎇ ${sp.branch}`].filter(Boolean).join("  ·  "))),
          ),
      )
      .child(crystal(s, sp.status, 7));
  }

  // A folder of holocrons: click to fold or unfold, double-click or right-click
  // to rename or delete. Its crystal shows the most urgent status inside.
  folder(s, t, f, members) {
    const open = f.open !== false;
    const order = ["blocked", "done", "working", "idle"];
    const status = order.find((st) => members.some((sp) => sp.status === st)) ?? null;
    return h_flex()
      .id(`fd-${f.id}`)
      .mx(8)
      .px(8)
      .py(5)
      .gap(8)
      .items_center()
      .rounded(s.name === "sith" ? 2 : 8)
      .cursor_pointer()
      .hover((st) => st.bg(t.hover))
      .on_click((e, _cx) => {
        if (e?.click_count >= 2) openNameDialog(s, { folder: f.id });
        else toggleFolder(f.id);
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openNameDialog(s, { folder: f.id });
      })
      .child(div().w(10).flex_none().text_size(10).text_color(soft(s, t)).child(open ? "▾" : "▸"))
      .child(glyph("folder", soft(s, t), 14))
      .child(div().flex_1().min_w(0).truncate().text_color(t.muted).font_weight(600).child(f.name))
      .child(div().flex_none().text_size(11).text_color(soft(s, t)).child(String(members.length)))
      .when(!open, (el) => el.child(crystal(s, status, 7)));
  }

  // Folders first (in the order made), each with its holocrons, then the loose ones.
  // A folded folder still shows the holocron you're in.
  spaceList(s, t, all) {
    const f = folders();
    const known = new Set(f.list.map((x) => x.id));
    const rows = [];
    for (const fd of f.list) {
      const members = all.filter((sp) => f.of[sp.id] === fd.id);
      rows.push(this.folder(s, t, fd, members));
      const open = fd.open !== false;
      for (const sp of members) if (open || sp.active) rows.push(this.space(s, t, sp, true));
    }
    for (const sp of all) if (!known.has(f.of[sp.id])) rows.push(this.space(s, t, sp));
    return rows;
  }

  miniSaber(s, t, status) {
    const c = statusColor(s, status);
    const lit = status && status !== "idle";
    let blade = div().h(3).rounded(2).bg(c);
    if (status === "working") blade = blade.loop("width", { from: 10, to: 34, period: 1100 });
    else if (lit) blade = blade.w(34);
    else blade = blade.w(0);
    if (status === "blocked") blade = blade.loop("opacity", { from: 0.3, to: 1, period: 200, easing: "linear" });
    return h_flex()
      .flex_none()
      .w(52)
      .items_center()
      .child(div().w(14).h(5).rounded(1).bg(s.metal))
      .child(div().w(2).h(7).bg(t.dim))
      .child(blade);
  }

  agent(s, t, a, pane, room) {
    return v_flex()
      .id(`ag-${a.address}`)
      .mx(8)
      .px(8)
      .py(6)
      .gap(2)
      .rounded(s.name === "sith" ? 2 : 8)
      .cursor_pointer()
      .when(a.focused, (el) => el.bg(t.selected))
      .hover((st) => st.bg(a.focused ? t.selected : t.hover))
      .on_click(() => {
        sfx("hum");
        run("agent.focus", { terminal: a.address });
      })
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(this.miniSaber(s, t, a.status))
          .child(div().flex_none().text_color(t.foreground).font_weight(600).child(agentName(a)))
          .when(Boolean(task(a)), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.muted).child(task(a))))
      )
      .child(
        h_flex()
          .gap(6)
          .pl(60)
          .text_size(11)
          .child(div().flex_none().text_color(a.status === "idle" ? soft(s, t) : statusColor(s, a.status)).child(s.words[a.status] ?? a.status))
          .child(div().flex_1().min_w(0).truncate().text_color(soft(s, t)).child(room)),
      )
      .when(Boolean(where(pane)), (el) =>
        el.child(div().pl(60).truncate().text_size(11).text_color(soft(s, t)).child(where(pane))),
      );
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    const all = spaces();
    // Padawans who need you come first, then finished, working and resting ones;
    // within each, Herdr's own order (space, tab, pane).
    const ags = agents()
      .map((a, i) => [a, i])
      .sort(([a, i], [b, j]) => (URGENCY[a.status] ?? 9) - (URGENCY[b.status] ?? 9) || i - j)
      .map(([a]) => a);
    const allAgents = agents();
    const pns = panes();
    const byPane = new Map(pns.map((p) => [p.pane, p]));
    const tabsById = new Map(all.flatMap((sp) => sp.tabs.map((tb) => [tb.id, tb])));
    const room = (a) => `${a.space_name} › ${tabTitle(s, tabsById.get(a.tab), allAgents, pns) || a.tab_name}`;
    setAgentOrder(ags.map((a) => a.address));
    return div()
      .id("sidebar")
      .relative()
      .size_full()
      .overflow_hidden()
      .bg(t.chrome)
      .font_family(s.font)
      .font_weight(s.weight)
      .text_size(13)
      .when(s.name === "sith", (el) => el.child(div().absolute().top(0).left(0).child(pic(s.starfield, 280, 900))))
      .child(
        v_flex()
          .id("sidebar-scroll")
          .absolute()
          .top(0)
          .left(0)
          .size_full()
          .overflow_y_scroll()
          .pb(12)
          .child(
            this.heading(
              s,
              t,
              s.spacesTitle,
              h_flex()
                .gap(2)
                .child(iconButton("new-folder", "folder", t.muted, t.hover, () => openNameDialog(s), "New folder (right-click a space to move it in)"))
                .child(iconButton("new-space", "plus", t.muted, t.hover, () => { sfx("hum"); run("space.new", {}); }, "New space")),
            ),
          )
          .children(this.spaceList(s, t, all))
          .child(this.heading(s, t, `${s.agentsTitle}  ${ags.length}`))
          .when(ags.length === 0, (el) => el.child(div().px(16).py(4).text_size(12).italic().text_color(soft(s, t)).child(s.empty)))
          .children(ags.map((a) => this.agent(s, t, a, byPane.get(a.pane), room(a))))
          .child(div().h(16))
          .child(div().px(16).text_size(11).italic().text_color(soft(s, t)).child(s.motto))
          .when(s.name === "jedi", (el) => el.child(div().flex_none().mt(14).opacity(0.55).child(pic(s.starfield, 280, 900)))),
      );
  }
}
