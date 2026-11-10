// The top bar: the side's emblem and title, the shown space's tabs as plates
// (the shown one has a small lit blade under it), a new-tab button, then the
// opening crawl, mute, and the switch to the other side of the Force.
// Room is left on the left for macOS's window buttons.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, props, run, theme, shared, setShared, openOverlay, window as appWindow } from "herdr";
import { side, spaced, pic, art, crystal, iconButton, glyph, sfx, muted, toggleMute } from "./kit.js";

export function openCrawl(s) {
  openOverlay({ mod: "starwars", props: { role: "crawl", side: s.name }, kind: "dialog", frame: "none", width: 640, height: 430 });
}

export default class Bar {
  init(p, cx) {
    const s = side(p);
    // The first time a side shows, play its crawl.
    const key = `starwars.crawl.${s.name}`;
    if (!shared(key)) {
      setShared(key, true);
      cx.timer.after(600, () => openCrawl(s));
    }
  }

  tab(s, t, tab) {
    const on = tab.active;
    return div()
      .id(`tab-${tab.id}`)
      .relative()
      .flex_none()
      .h(30)
      .px(12)
      .flex()
      .items_center()
      .gap(6)
      .rounded(s.name === "sith" ? 2 : 8)
      .cursor_pointer()
      .bg(on ? t.raised : "#00000000")
      .border(1)
      .border_color(on ? t.border : "#00000000")
      .hover((st) => st.bg(t.hover))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((e, cx) => {
        cx.stop_propagation();
        if (e?.click_count >= 2) run("tab.rename", { id: tab.id });
        else run("tab.select", { id: tab.id });
      })
      .on_mouse_down("middle", (_e, cx) => {
        cx.stop_propagation();
        sfx("retract");
        run("tab.close", { id: tab.id });
      })
      .child(crystal(s, tab.status, 6))
      .child(div().text_color(on ? t.foreground : t.muted).font_weight(on ? 600 : 400).child(tab.named ? tab.name : `${s.tabWord} ${tab.index}`))
      .when(on, (el) =>
        el.child(
          div()
            .absolute()
            .left(10)
            .right(10)
            .bottom(-1)
            .h(2)
            .rounded(2)
            .bg(s.blade)
            .loop("opacity", { from: 0.7, to: 1, period: 1400 }),
        ),
      );
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    const space = spaces().find((x) => x.active);
    const tabs = (space?.tabs ?? []).filter((x) => !x.settled || x.active);
    const mac = appWindow()?.platform === "macos";
    return h_flex()
      .id("bar")
      .size_full()
      .pl(mac ? 84 : 14)
      .pr(12)
      .gap(10)
      .items_center()
      .font_family(s.font)
      .text_size(13)
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .child(pic(`art/emblem-${s.name}.svg`, 24))
      .child(
        div()
          .flex_none()
          .font_family(s.titleFont)
          .text_size(14)
          .font_weight(700)
          .text_color(s.name === "sith" ? s.blade : t.foreground)
          .child(spaced(s.title)),
      )
      .child(div().flex_none().w(1).h(20).bg(t.border).mx(4))
      .child(
        h_flex()
          .id("tabs")
          .flex_1()
          .min_w(0)
          .gap(4)
          .items_center()
          .overflow_x_scroll()
          .children(tabs.map((tab) => this.tab(s, t, tab)))
          .child(iconButton("new-tab", "plus", t.muted, t.hover, () => { sfx("hum"); run("tab.new", {}); }, `New ${s.tabWord.toLowerCase()}`)),
      )
      .child(
        div()
          .id("crawl")
          .flex_none()
          .px(8)
          .h(24)
          .flex()
          .items_center()
          .rounded(4)
          .cursor_pointer()
          .text_size(11)
          .font_family(s.titleFont)
          .text_color(t.muted)
          .hover((st) => st.bg(t.hover).text_color(t.foreground))
          .tooltip("Play the opening crawl")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            openCrawl(s);
          })
          .child(spaced("CRAWL")),
      )
      .child(iconButton("mute", muted() ? "sound-off" : "sound-on", t.muted, t.hover, () => toggleMute(), muted() ? "Unmute saber sounds" : "Mute saber sounds"))
      .child(
        h_flex()
          .id("switch")
          .flex_none()
          .h(26)
          .px(10)
          .gap(8)
          .items_center()
          .rounded(s.name === "sith" ? 2 : 13)
          .cursor_pointer()
          .border(1)
          .border_color(s.name === "sith" ? "#1f6fd1" : "#ff2a3a")
          .text_color(t.foreground)
          .hover((st) => st.bg(t.hover))
          .tooltip(s.switchHint)
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            sfx("ignite");
            run("layout.switch", { name: s.other });
          })
          .child(div().w(18).h(3).rounded(2).bg(s.name === "sith" ? "#3f8cff" : "#ff2a3a"))
          .child(div().text_size(12).child(s.switchLabel)),
      );
  }
}
