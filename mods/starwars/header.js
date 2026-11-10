// A pane's header: a title row and a lightsaber under it. The focused pane's
// blade ignites across the header (width transition); an unfocused pane whose
// agent is blocked ignites in the warning color and flickers until you look.
// Click the hilt for a hum. Double-click the title row to zoom.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { panes, props, run, home, theme } from "herdr";
import { side, pic, art, crystal, iconButton, sfx } from "./kit.js";

const HILT = 40;

function shortPath(p) {
  if (!p) return "";
  const h = home();
  return h && p.startsWith(h) ? "~" + p.slice(h.length) : p;
}

export function paneTitle(p) {
  if (!p) return "";
  if (p.mod) return p.title || p.mod;
  const prog = p.program;
  if (!prog || prog.shell) return shortPath(p.cwd) || prog?.name || "shell";
  const t = (p.title ?? "").trim();
  return t && t !== prog.name ? `${prog.name} · ${t}` : prog.name;
}

export default class Header {
  init() {
    this.w = 0;
  }

  render(_cx) {
    const pr = props() ?? {};
    const s = side(pr);
    const t = theme();
    const id = pr.pane;
    const p = panes().find((x) => x.pane === id);
    const focused = Boolean(p?.focused);
    const status = p?.status ?? null;
    const alarm = !focused && status === "blocked";
    const lit = focused || alarm;
    const color = status === "blocked" ? s.blockedBlade : status === "done" ? s.doneBlade : s.blade;
    const full = Math.max(0, this.w - HILT - 18);
    const bladeW = lit ? full : 0;
    const where = p && !p.mod && p.program && !p.program.shell ? shortPath(p.cwd) : "";
    const branch = p?.branch ? ` ⎇ ${p.branch}` : "";

    const blade = (layer) =>
      div()
        .absolute()
        .left(0)
        .top(layer.top)
        .h(layer.h)
        .w(bladeW)
        .rounded(layer.h)
        .bg(layer.c)
        .opacity(layer.o)
        .transition("width", { duration: lit ? 320 : 220, easing: lit ? "ease-out" : "ease-in" })
        .when(alarm, (el) => el.loop("opacity", { from: layer.o * 0.35, to: layer.o, period: 180, easing: "linear" }));

    const saber = h_flex()
      .h(12)
      .items_center()
      .gap(0)
      .child(
        div()
          .id(`hilt-${id}`)
          .cursor_pointer()
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            sfx(lit ? "hum" : "ignite");
            run("pane.focus", { pane: id });
          })
          .child(pic(`art/hilt-${s.name}.svg`, HILT, 11)),
      )
      .child(
        div()
          .relative()
          .flex_1()
          .h(12)
          .child(blade({ top: 0, h: 12, c: s.glow, o: 0.16 }))
          .child(blade({ top: 3, h: 6, c: color, o: 0.85 }))
          .child(blade({ top: 5, h: 2, c: s.core, o: 1 })),
      );

    const ctl = focused ? t.foreground : t.dim;
    const row = h_flex()
      .id(`hrow-${id}`)
      .h(18)
      .gap(6)
      .items_center()
      .on_click((e, _cx) => {
        if (e?.click_count === 2) run("pane.zoom", { pane: id });
        else run("pane.focus", { pane: id });
      })
      .child(crystal(s, status, 6))
      .child(
        div()
          .flex_none()
          .max_w(Math.max(80, this.w * 0.55))
          .truncate()
          .text_color(focused ? t.foreground : t.muted)
          .font_weight(focused ? 600 : 400)
          .child(paneTitle(p)),
      )
      .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(`${where}${branch}`))
      .child(iconButton(`sr-${id}`, "split-right", ctl, t.hover, () => run("pane.split", { direction: "right", pane: id }), "Split right"))
      .child(iconButton(`sd-${id}`, "split-down", ctl, t.hover, () => run("pane.split", { direction: "down", pane: id }), "Split down"))
      .child(iconButton(`zm-${id}`, "zoom", ctl, t.hover, () => run("pane.zoom", { pane: id }), p?.zoomed ? "Restore" : "Zoom"))
      .child(
        iconButton(`cl-${id}`, "close", ctl, t.hover, () => {
          sfx("retract");
          run("pane.close", { pane: id });
        }, "Close"),
      );

    return v_flex()
      .id("root")
      .size_full()
      .px(8)
      .pt(3)
      .gap(1)
      .bg(t.surface)
      .font_family(s.font)
      .text_size(12)
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.w) > 0.5) {
          this.w = size.width;
          cx.notify();
        }
      })
      .child(row)
      .child(saber);
  }
}
