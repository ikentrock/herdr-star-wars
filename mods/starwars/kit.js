// The starwars mod's kit: each side's palette, words, fonts, art and sounds.
// Both layouts (jedi, sith) use the same roles; props().side picks the look.

import { div, svg, image } from "gpui-kit";
import { settings, shared, setShared, playSound, theme } from "herdr";

export const ASSETS = "mods/starwars";

const SIDES = {
  sith: {
    name: "sith",
    other: "jedi",
    title: "SITH CITADEL",
    motto: "Peace is a lie. There is only the build.",
    titleFont: "Copperplate",
    font: "Avenir Next",
    weight: 500,
    blade: "#ff2a3a",
    core: "#ffe3e5",
    glow: "#ff2a3a",
    doneBlade: "#ff2a3a",
    blockedBlade: "#ffb347",
    metal: "#8a8c93",
    starfield: "art/stars.svg",
    spacesTitle: "CONQUERED SYSTEMS",
    agentsTitle: "APPRENTICES",
    tabWord: "Front",
    words: { working: "executing orders", blocked: "awaits your command", done: "mission complete", idle: "dormant" },
    switchLabel: "Return to the Light",
    switchHint: "Switch to the Jedi Archives",
    clock: "IMPERIAL TIME",
    empty: "No apprentices. The Citadel is silent.",
    councilTitle: "THRONE ROOM",
    councilButton: "THRONE",
    councilEmpty: "No apprentice awaits your command. The throne is quiet.",
  },
  jedi: {
    name: "jedi",
    other: "sith",
    title: "JEDI ARCHIVES",
    motto: "Patience. The build will come.",
    titleFont: "Optima",
    font: "Optima",
    weight: 400,
    blade: "#1f6fd1",
    core: "#f2f8ff",
    glow: "#3f8cff",
    doneBlade: "#2a9e4a",
    blockedBlade: "#d39a1c",
    metal: "#6b6f78",
    starfield: "art/archive.svg",
    spacesTitle: "HOLOCRONS",
    agentsTitle: "PADAWANS",
    tabWord: "Scroll",
    words: { working: "in training", blocked: "seeks your counsel", done: "trial complete", idle: "at rest" },
    switchLabel: "Join the Dark Side",
    switchHint: "Switch to the Sith Citadel",
    clock: "GALACTIC STANDARD",
    empty: "No padawans yet. Start an agent, you must.",
    councilTitle: "JEDI COUNCIL",
    councilButton: "COUNCIL",
    councilEmpty: "No padawan seeks counsel. Meditate, you may.",
  },
};

export function side(p) {
  return SIDES[p?.side] ?? SIDES.sith;
}

/** Spaced capitals ("S I T H"), since the UI has no letter spacing. */
export function spaced(text, gap = " ") {
  return String(text).split("").join(gap);
}

export function art(s, name) {
  return `${ASSETS}/art/${name}-${s.name}.svg`;
}

export function pic(path, w, h) {
  return image(`${ASSETS}/${path}`).w(w).h(h ?? w).flex_none();
}

/** A one-color icon from icons/, tinted. */
export function glyph(name, color, size = 14) {
  return svg(`${ASSETS}/icons/${name}.svg`).w(size).h(size).flex_none().text_color(color);
}

export function muted() {
  return shared("starwars.mute") === true;
}

export function sfx(name) {
  if (settings()?.sounds?.enabled === false || muted()) return;
  try {
    playSound(`${ASSETS}/sounds/${name}.mp3`);
  } catch {}
}

export function toggleMute() {
  setShared("starwars.mute", !muted());
}

/** The status color for a saber or a crystal. */
export function statusColor(s, status) {
  const t = theme();
  if (status === "blocked") return s.blockedBlade;
  if (status === "done") return s.doneBlade;
  if (status === "working") return s.blade;
  return t.idle;
}

/** A lit crystal: a small glowing dot, pulsing while working, flickering when blocked. */
export function crystal(s, status, size = 8) {
  const c = statusColor(s, status);
  return div()
    .relative()
    .flex_none()
    .w(size + 6)
    .h(size + 6)
    .items_center()
    .justify_center()
    .flex()
    .child(
      div()
        .absolute()
        .top(0)
        .left(0)
        .w(size + 6)
        .h(size + 6)
        .rounded_full()
        .bg(c)
        .opacity(status && status !== "idle" ? 0.25 : 0)
        .when(status === "working", (el) => el.loop("opacity", { from: 0.05, to: 0.4, period: 1600 })),
    )
    .child(
      div()
        .w(size)
        .h(size)
        .rounded_full()
        .bg(c)
        .when(status === "blocked", (el) => el.loop("opacity", { from: 0.35, to: 1, period: 260, easing: "linear" })),
    );
}

/** A small icon button for bars and headers. Stops the press so window dragging ignores it. */
export function iconButton(id, name, color, hover, onClick, tip) {
  let el = div()
    .id(id)
    .flex_none()
    .w(22)
    .h(20)
    .flex()
    .items_center()
    .justify_center()
    .rounded(4)
    .cursor_pointer()
    .hover((st) => st.bg(hover))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx.stop_propagation();
      onClick(cx);
    })
    .child(glyph(name, color, 13));
  if (tip) el = el.tooltip(tip);
  return el;
}

export function agentName(a) {
  return a?.program?.name ?? a?.app ?? "Agent";
}

// What the agent is on: its terminal title, minus the program's own name and spinner glyphs.
export function task(a) {
  const title = String(a?.title ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return title && title !== agentName(a) ? title : "";
}

// Most urgent first: needs you, finished unseen, working, at rest.
export const URGENCY = { blocked: 0, done: 1, working: 2, idle: 3 };

// A tab's name: the one someone gave it; else what its first agent is on (first in
// Herdr's pane order, so the name doesn't jump as agents change state); else the
// git branch or folder of its first pane; else "Scroll 2" / "Front 2".
export function tabTitle(s, tab, ags, pns) {
  if (!tab) return "";
  if (tab.named) return tab.name;
  const first = ags.find((a) => a.tab === tab.id && task(a));
  if (first) return task(first);
  const pane = pns.find((p) => p.tab === tab.id && (p.branch || p.cwd));
  if (pane?.branch) return `⎇ ${pane.branch}`;
  if (pane?.cwd) return String(pane.cwd).replace(/\/+$/, "").split("/").pop() || `${s.tabWord} ${tab.index}`;
  return `${s.tabWord} ${tab.index}`;
}
