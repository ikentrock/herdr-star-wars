// The droid, floating at an edge: a Jedi training remote or a Sith
// interrogator orb. When an agent needs you (blocked) or finished while you
// looked away (done), it bobs and speaks: the Jedi one in a wise old master's
// word order, the Sith one in Imperial reports. Click it for counsel.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, run, props, theme, placement, shared, setShared } from "herdr";
import { side, pic, agentName, sfx } from "./kit.js";

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

function speak(s, a) {
  const name = agentName(a);
  const where = `${a.space_name} › ${a.tab_name}`;
  if (s.name === "jedi") {
    return a.status === "blocked"
      ? `Waiting for you, ${name} is.\nIn ${where}, your counsel it seeks.`
      : `Finished, ${name} has.\nIn ${where}, see what it did, you should.`;
  }
  return a.status === "blocked"
    ? `My lord, ${name} in ${where}\nawaits your command.`
    : `My lord, ${name} in ${where}\nhas completed its mission.`;
}

export default class Droid {
  init() {
    this.dismissed = new Set();
    this.tip = null;
  }

  news() {
    const list = agents()
      .filter((a) => (a.status === "blocked" || a.status === "done") && !a.focused)
      .filter((a) => !this.dismissed.has(`${a.address}:${a.status}`))
      .sort((a, b) => (a.status === "blocked") - (b.status === "blocked") || a.seq - b.seq);
    return list.pop() ?? null;
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    if (shared(`starwars.droid.${s.name}`) === "off") return div();
    const a = this.news();
    const right = placement()?.edge !== "left";
    for (const k of [...this.dismissed]) {
      const i = k.lastIndexOf(":");
      if (!agents().some((x) => x.address === k.slice(0, i) && x.status === k.slice(i + 1))) this.dismissed.delete(k);
    }
    let balloon = null;
    if (a) {
      const key = `${a.address}:${a.status}`;
      balloon = this.balloon(s, t, speak(s, a), [
        [s.name === "jedi" ? "Take me there" : "Go there now", () => {
          run("agent.focus", { terminal: a.address });
          this.dismissed.add(key);
        }],
        [s.name === "jedi" ? "Later, I will" : "Dismiss", () => this.dismissed.add(key)],
      ]);
    } else if (this.tip !== null) {
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
      .when(Boolean(a), (el) => el.loop("top", { from: 0, to: -6, period: 900 }))
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
