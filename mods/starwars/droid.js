// The droid, floating at an edge: a Jedi training remote or a Sith
// interrogator orb. When an agent needs you (blocked) or finished while you
// looked away (done), it bobs; Herdr's own toast says which one. Click it for
// counsel: the Jedi one in a wise old master's word order, the Sith one in
// Imperial reports.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, props, theme, placement, shared, setShared } from "herdr";
import { side, pic, sfx } from "./kit.js";

const TIPS = {
  jedi: [
    "Split a pane with the icons on its saber, you can. Two terminals, one mind.",
    "Double-click a pane's title, and grow it will. Again, and back it comes.",
    "Click a padawan in the sidebar, and to its side I will take you.",
    "A middle click on a scroll closes it. Gently, close you must.",
    "Too loud, the sabers are? The speaker in the top bar, press.",
    "Ready for the Dark Side, you are not. Tempting, the red button is. Hmm.",
    "Patience. Working, the agent is. Watch the blade swing, you can.",
  ],
  sith: [
    "Report: split a pane with the icons on its saber. Two terminals, twice the power.",
    "Report: double-click a pane's title to seize the whole screen.",
    "Report: select an apprentice in the sidebar and you will be taken to it at once.",
    "Report: a middle click on a front closes it. No survivors.",
    "Report: the speaker in the top bar silences the sabers. Silence is also power.",
    "Report: the blue button leads back to the Light. Weakness, my lord.",
    "Report: a flickering blade means an apprentice awaits your command.",
  ],
};

export default class Droid {
  init() {
    this.tip = null;
  }

  /** True when an agent you aren't looking at needs you or has finished. */
  news() {
    return agents().some((a) => (a.status === "blocked" || a.status === "done") && !a.focused);
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    if (shared(`starwars.droid.${s.name}`) === "off") return div();
    const a = this.news();
    const right = placement()?.edge !== "left";
    let balloon = null;
    if (this.tip !== null) {
      const tips = TIPS[s.name];
      balloon = this.balloon(s, t, tips[this.tip % tips.length], [
        ["More counsel", () => (this.tip = (this.tip + 1) % tips.length)],
        ["Close", () => (this.tip = null)],
        ["Power down", () => setShared(`starwars.droid.${s.name}`, "off")],
      ]);
    }
    const bot = div()
      .id("droid")
      .flex_none()
      .cursor_pointer()
      .when(a, (el) => el.loop("top", { from: 0, to: -6, period: 900 }))
      .on_click((_e, cx) => {
        this.tip = this.tip === null ? Math.floor(Math.random() * TIPS[s.name].length) : null;
        sfx(`droid-${s.name}`);
        cx.notify();
      })
      .child(pic(`art/droid-${s.name}.svg`, 54, 60));
    return v_flex()
      .p(4)
      .gap(4)
      .font_family(s.font)
      .text_size(12)
      .text_color(t.foreground)
      .map((el) => (right ? el.items_end() : el.items_start()))
      .when(Boolean(balloon), (el) => el.child(balloon))
      .child(div().relative().child(bot));
  }

  balloon(s, t, text, actions) {
    return v_flex()
      .w(230)
      .p(10)
      .gap(8)
      .bg(t.popover)
      .border(1)
      .border_color(s.blade)
      .rounded(s.name === "sith" ? 2 : 10)
      .child(v_flex().children(String(text).split("\n").map((l) => div().child(l || " "))))
      .child(
        v_flex()
          .gap(4)
          .children(
            actions.map(([label, fn], i) =>
              h_flex()
                .id(`droid-act-${i}`)
                .gap(6)
                .items_center()
                .cursor_pointer()
                .on_click((_e, cx) => {
                  fn();
                  cx.notify();
                })
                .child(div().w(10).h(2).rounded(1).bg(s.blade))
                .child(div().text_color(s.name === "sith" ? t.foreground : s.blade).hover((st) => st.underline()).child(label)),
            ),
          ),
      );
  }
}
