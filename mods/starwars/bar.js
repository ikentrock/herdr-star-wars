// The top bar: the side's emblem and title, the shown space's tabs as plates
// (the shown one has a small lit blade under it), a + that opens Herdr's menu
// for a new terminal or agent, Herdr's Files and Changes panels, then the
// opening crawl, mute, and the switch to the other side of the Force.
// Room is left on the left for macOS's window buttons.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, panes, props, run, theme, shared, setShared, openOverlay, layout, window as appWindow } from "herdr";
import { side, spaced, pic, art, crystal, iconButton, glyph, sfx, muted, toggleMute, tabTitle } from "./kit.js";

export function openCrawl(s) {
  openOverlay({ mod: "starwars", props: { role: "crawl", side: s.name }, kind: "dialog", frame: "none", width: 640, height: 430 });
}

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export default class Bar {
  init(p, cx) {
    this.panels = load("panels");
    const s = side(p);
    // The first time a side shows, play its crawl.
    const key = `starwars.crawl.${s.name}`;
    if (!shared(key)) {
      setShared(key, true);
      cx.timer.after(600, () => openCrawl(s));
    }
  }

  // The side panel is remembered per space, as in Herdr's own tab bar: switching
  // shows that space's choice (closed if it never had one), and opening or
  // closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null;
        const want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) {
            run("layout.select", { stack: "panel-body", child: want });
            run("layout.show", { id: "panel" });
          } else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    try {
      localStorage.setItem("panels", JSON.stringify(this.panels));
    } catch {}
  }

  // A word button in the side's title font, like CRAWL; lit while its panel shows.
  word(s, t, id, label, tip, on, onClick) {
    return div()
      .id(id)
      .flex_none()
      .px(8)
      .h(24)
      .flex()
      .items_center()
      .rounded(4)
      .cursor_pointer()
      .text_size(11)
      .font_family(s.titleFont)
      .text_color(on ? t.foreground : t.muted)
      .when(on, (el) => el.bg(t.selected))
      .hover((st) => st.bg(on ? t.selected : t.hover).text_color(t.foreground))
      .tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        onClick();
      })
      .child(spaced(label));
  }

  panelButton(s, t, id, label, tip, panel, body) {
    const on = Boolean(panel && !panel.hidden && body?.active === id);
    return this.word(s, t, `panel-${id}`, label, tip, on, () => {
      sfx("hum");
      if (on) run("layout.hide", { id: "panel" });
      else {
        run("layout.select", { stack: "panel-body", child: id });
        run("layout.show", { id: "panel" });
      }
    });
  }

  tab(s, t, tab, name) {
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
      .tooltip(tab.named ? `${s.tabWord} ${tab.index}: ${name}` : `${s.tabWord} ${tab.index}: ${name} (double-click to name it)`)
      .child(div().max_w(200).truncate().text_color(on ? t.foreground : t.muted).font_weight(on ? 600 : 400).child(name))
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
    const ags = agents();
    const pns = panes();
    const root = layout();
    const panel = find(root, "panel");
    const body = find(root, "panel-body");
    const enabled = [...(shared("workspace.panels") ?? ["files", "changes"]), "council"];
    const waiting = ags.filter((a) => a.status === "blocked" || a.status === "done").length;
    this.syncPanel(space, panel, body, enabled);
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
          .children(tabs.map((tab) => this.tab(s, t, tab, tabTitle(s, tab, ags, pns))))
          .child(
            iconButton(
              "new-tab",
              "plus",
              t.muted,
              t.hover,
              () => {
                sfx("hum");
                openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });
              },
              `New ${s.tabWord.toLowerCase()}: a terminal or an agent`,
            ),
          ),
      )
      .when(Boolean(panel) && enabled.includes("files"), (el) => el.child(this.panelButton(s, t, "files", "FILES", "Show the files of this space", panel, body)))
      .when(Boolean(panel) && enabled.includes("changes"), (el) => el.child(this.panelButton(s, t, "changes", "CHANGES", "Show the git changes of this space", panel, body)))
      .when(Boolean(find(root, "council")), (el) =>
        el.child(this.panelButton(s, t, "council", waiting ? `${s.councilButton} ${waiting}` : s.councilButton, "Agents waiting on you, and what they ask", panel, body)),
      )
      .child(this.word(s, t, "crawl", "CRAWL", "Play the opening crawl", false, () => openCrawl(s)))
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
