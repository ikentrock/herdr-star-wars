// The status bar: agent counts in the side's words, a fleet of starfighters
// (one per agent), where you are, and the clock.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, panes, props, theme, run, shared } from "herdr";
import { side, spaced, crystal, tabTitle, pic, statusColor, agentName, task, sfx } from "./kit.js";

function hhmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// How far a ship flies in its lane, in px.
const LANE = 64;
const SHIP = 28;
const RUN = LANE - SHIP - 6;

export default class Status {
  init(_p, cx) {
    this.time = hhmm();
    cx.timer.every(15000, (cx) => {
      const n = hhmm();
      if (n !== this.time) {
        this.time = n;
        cx.notify();
      }
    });
  }

  // One lane per agent: cruising while it works, blinking when it needs you,
  // holding at the front when done, docked and dim at rest. Click to go to it.
  ship(s, t, a) {
    const c = statusColor(s, a.status);
    let craft = h_flex()
      .absolute()
      .top(4)
      .items_center()
      .child(div().w(3).h(3).rounded(2).bg(c).when(a.status !== "idle", (el) => el.mr(1)))
      .child(pic(`art/fighter-${s.name}.svg`, SHIP, 16));
    if (a.status === "working") craft = craft.loop("left", { from: 0, to: RUN, period: 2600 });
    else if (a.status === "blocked") craft = craft.left(RUN / 2).loop("opacity", { from: 0.25, to: 1, period: 500, easing: "linear" });
    else if (a.status === "done") craft = craft.left(RUN);
    else craft = craft.left(0).opacity(0.45);
    const words = s.words[a.status] ?? a.status;
    const what = task(a);
    return div()
      .id(`ship-${a.address}`)
      .relative()
      .flex_none()
      .w(LANE)
      .h(24)
      .rounded(4)
      .cursor_pointer()
      .when(a.focused, (el) => el.bg(t.selected))
      .hover((st) => st.bg(t.hover))
      .tooltip(`${agentName(a)}${what ? ` · ${what}` : ""} · ${words}`)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        sfx("hum");
        run("agent.focus", { terminal: a.address });
      })
      .child(craft);
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    const ags = agents();
    const order = ["blocked", "working", "done"];
    const counts = order.map((st) => [st, ags.filter((a) => a.status === st).length]).filter(([, n]) => n > 0);
    const space = spaces().find((x) => x.active);
    const tab = space?.tabs.find((x) => x.active);
    return h_flex()
      .size_full()
      .px(14)
      .gap(14)
      .items_center()
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .font_family(s.font)
      .text_size(11)
      .text_color(t.muted)
      .when(counts.length === 0, (el) => el.child(div().italic().text_color(t.dim).child(s.empty)))
      .children(
        counts.map(([st, n]) =>
          h_flex().flex_none().gap(5).items_center().child(crystal(s, st, 6)).child(div().child(`${n} ${s.words[st]}`)),
        ),
      )
      .child(
        h_flex()
          .id("fleet")
          .flex_1()
          .min_w(0)
          .h_full()
          .gap(2)
          .items_center()
          .justify_center()
          .overflow_x_scroll()
          .when(shared(`starwars.fleet.${s.name}`) !== "off", (el) => el.children(ags.map((a) => this.ship(s, t, a)))),
      )
      .child(div().flex_none().truncate().text_color(t.dim).max_w(360).child(space ? `${space.name} › ${tabTitle(s, tab, ags, panes())}` : ""))
      .child(div().flex_none().w(1).h(12).bg(t.border))
      .child(div().flex_none().font_family(s.titleFont).text_color(t.dim).child(spaced(s.clock)))
      .child(div().flex_none().font_family("JetBrains Mono").text_color(t.foreground).child(this.time));
  }
}
