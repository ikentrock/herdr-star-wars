// The sidebar over a starfield (Sith), or with archive shelves below its lists (Jedi): spaces as
// holocrons or conquered systems, then every agent as a padawan or apprentice
// with a small saber that tells its state: swinging while it works, steady
// when done, flickering when it needs you, sheathed when idle.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, props, run, theme, setAgentOrder } from "herdr";
import { side, spaced, pic, art, crystal, iconButton, statusColor, agentName, sfx } from "./kit.js";

// What the agent is on: its terminal title, minus the program's own name and spinner glyphs.
function task(a) {
  const title = String(a.title ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return title && title !== agentName(a) ? title : "";
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

  space(s, t, sp) {
    const on = sp.active;
    return h_flex()
      .id(`sp-${sp.id}`)
      .relative()
      .mx(8)
      .px(8)
      .py(6)
      .gap(9)
      .items_center()
      .rounded(s.name === "sith" ? 2 : 8)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected))
      .hover((st) => st.bg(on ? t.selected : t.hover))
      .on_click((_e, _cx) => run("space.select", { id: sp.id }))
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

  agent(s, t, a) {
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
          .child(div().flex_1().min_w(0).truncate().text_color(soft(s, t)).child(`${a.space_name} › ${a.tab_name}`)),
      );
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    const all = spaces();
    const ags = agents();
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
              iconButton("new-space", "plus", t.muted, t.hover, () => { sfx("hum"); run("space.new", {}); }, "New space"),
            ),
          )
          .children(all.map((sp) => this.space(s, t, sp)))
          .child(this.heading(s, t, `${s.agentsTitle}  ${ags.length}`))
          .when(ags.length === 0, (el) => el.child(div().px(16).py(4).text_size(12).italic().text_color(soft(s, t)).child(s.empty)))
          .children(ags.map((a) => this.agent(s, t, a)))
          .child(div().h(16))
          .child(div().px(16).text_size(11).italic().text_color(soft(s, t)).child(s.motto))
          .when(s.name === "jedi", (el) => el.child(div().flex_none().mt(14).opacity(0.55).child(pic(s.starfield, 280, 900)))),
      );
  }
}
