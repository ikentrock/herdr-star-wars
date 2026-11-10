// The opening crawl: a dialog of stars with the side's story rising through
// it (a long linear `top` transition). Click or Esc to skip.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { side, spaced, pic, sfx } from "./kit.js";

const STORY = {
  sith: {
    episode: "EPISODE  ∞",
    title: "THE DARK TERMINAL",
    color: "#ffcf3f",
    text: [
      "The galaxy is in turmoil. Rebel bugs, striking from hidden branches, have breached the outer test suites.",
      "From the shadows of the SITH CITADEL, an army of tireless apprentices has been forged to crush every failing build and bend the codebase to a single will.",
      "Their master watches from the command line, waiting for the moment the last pipeline turns green....",
    ],
  },
  jedi: {
    episode: "EPISODE  I/O",
    title: "A NEW TERMINAL",
    color: "#f2c94c",
    text: [
      "It is a time of calm in the codebase. Within the JEDI ARCHIVES, a patient order of agents studies every scroll of the repository.",
      "Guided by their Master, the padawans train in the ancient arts of refactoring, testing and the gentle commit.",
      "But a disturbance stirs in the dependencies, and the Master must keep watch over every terminal....",
    ],
  },
};

const H = 430;
const TEXT_H = 900;

export default class Crawl {
  init(p, cx) {
    this.y = H;
    this.started = false;
    sfx("ignite");
  }

  // Start the rise after the first real layout (a dialog opened while the
  // window is in the background lays out only when it is drawn).
  start(cx) {
    if (this.started) return;
    this.started = true;
    cx.timer.after(60, (cx) => {
      this.y = -TEXT_H;
      cx.notify();
    });
    cx.timer.after(46000, () => this.close());
  }

  close() {
    const id = props()?.overlay;
    if (id) closeOverlay(id);
  }

  render(_cx) {
    const s = side(props());
    const st = STORY[s.name];
    return div()
      .id("crawl-root")
      .relative()
      .size_full()
      .overflow_hidden()
      .rounded(6)
      .bg("#020204")
      .cursor_pointer()
      .on_size_change((_size, cx) => this.start(cx))
      .on_click(() => this.close())
      .child(div().absolute().top(0).left(0).size_full().child(pic("art/stars.svg", 640, 2057)))
      .child(
        v_flex()
          .absolute()
          .left(80)
          .w(480)
          .top(this.y)
          .transition("top", { duration: 44000, easing: "linear" })
          .items_center()
          .gap(22)
          .font_family("Futura")
          .text_color(st.color)
          .child(div().pt(20).child(pic(`art/emblem-${s.name}.svg`, 54)))
          .child(div().text_size(18).child(spaced(st.episode, " ")))
          .child(div().text_size(30).font_weight(700).text_center().child(st.title))
          .children(st.text.map((para) => div().text_size(19).line_height("28px").text_center().child(para))),
      )
      .child(
        div()
          .absolute()
          .bottom(10)
          .right(14)
          .text_size(10)
          .text_color("#ffffff66")
          .font_family("Futura")
          .child("click to skip"),
      );
  }
}
