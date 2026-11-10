// The status bar: agent counts in the side's words, where you are, and the clock.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, props, theme } from "herdr";
import { side, spaced, crystal } from "./kit.js";

function hhmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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
      .child(div().flex_1())
      .child(div().flex_none().truncate().text_color(t.dim).child(space ? `${space.name} › ${tab?.named ? tab.name : `${s.tabWord} ${tab?.index ?? ""}`}` : ""))
      .child(div().flex_none().w(1).h(12).bg(t.border))
      .child(div().flex_none().font_family(s.titleFont).text_color(t.dim).child(spaced(s.clock)))
      .child(div().flex_none().font_family("JetBrains Mono").text_color(t.foreground).child(this.time));
  }
}
