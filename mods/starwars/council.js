// The Jedi Council chamber (Sith: the throne room): a side panel next to Files
// and Changes with every agent that waits on you. Each card shows the end of
// what the agent last said (read with `hc read`), its numbered choices as
// buttons when it's blocked on a menu, and a box to answer it (`hc send`).
//
// It only reads terminals while the panel shows, every few seconds.

import { div } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { agents, props, theme, run, hc, layout } from "herdr";
import { side, spaced, crystal, agentName, task, sfx, URGENCY } from "./kit.js";

const LINES = 60; // read this much of each terminal
const SHOW = 14; // and show at most this many lines of it
const EVERY = 3000;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const RULE = /^\s*[─━—-]{20,}\s*$/;
const FOOTER = /^\s*([✻✢✶✳·*⏵]|Cache (warm|cold)|\[hc\])/;

/**
 * The end of what the agent said, without its input box and status lines.
 * Returns { lines, draft, options }: options are a numbered menu's choices.
 */
export function readScreen(text, blocked) {
  let lines = String(text ?? "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => !/^\[hc\]/.test(l));
  // Claude Code-style input box: the text between the last two rules is the draft.
  let draft = "";
  const rules = lines.map((l, i) => (RULE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (rules.length >= 2) {
    const [a, b] = rules.slice(-2);
    draft = lines
      .slice(a + 1, b)
      .map((l) => l.replace(/^\s*❯\s?/, "").trim())
      .join(" ")
      .trim();
    lines = lines.slice(0, a);
  }
  while (lines.length && (!lines.at(-1).trim() || FOOTER.test(lines.at(-1)))) lines.pop();
  lines = lines.slice(-SHOW);
  while (lines.length && !lines[0].trim()) lines.shift();
  const options = [];
  if (blocked) {
    for (const l of lines) {
      const m = l.match(/^\s*(?:[❯›>]\s*)?(\d)\.\s+(.+)$/);
      if (m) options.push({ key: m[1], label: m[2].trim() });
    }
  }
  return { lines, draft, options };
}

export default class Council {
  init(_p, cx) {
    this.screens = {}; // address -> readScreen() result
    this.inputs = {}; // address -> InputState
    this.texts = {};
    this.sent = {}; // address -> what happened last
    this.busy = false;
    cx.timer.every(EVERY, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  shown() {
    const root = layout();
    const panel = find(root, "panel");
    const body = find(root, "panel-body");
    return Boolean(panel && !panel.hidden && body?.active === "council");
  }

  waiting() {
    return agents()
      .filter((a) => a.status === "blocked" || a.status === "done")
      .sort((a, b) => (URGENCY[a.status] ?? 9) - (URGENCY[b.status] ?? 9));
  }

  refresh(cx) {
    if (this.busy || !this.shown()) return;
    const list = this.waiting();
    // Answer boxes are made here, never in render (InputState can't be made there).
    let made = false;
    for (const a of list) if (!this.inputs[a.address]) made = Boolean(this.makeInput(a)) || made;
    if (made) cx.notify();
    if (!list.length) {
      if (Object.keys(this.screens).length) {
        this.screens = {};
        cx.notify();
      }
      return;
    }
    this.busy = true;
    cx.spawn(async (cx) => {
      const next = {};
      for (const a of list) {
        try {
          const r = await hc(["read", a.address, "--lines", String(LINES)]);
          next[a.address] = readScreen(r?.stdout ?? "", a.status === "blocked");
        } catch {
          next[a.address] = { lines: ["(couldn't read this terminal)"], draft: "", options: [] };
        }
      }
      this.screens = next;
      this.busy = false;
      cx.notify();
    });
  }

  makeInput(a) {
    const st = InputState.new({ value: "", placeholder: a.status === "blocked" ? "Answer, or pick a choice above" : "Reply" });
    st.on("change", (_e, cx) => {
      this.texts[a.address] = st.value();
      cx.notify();
    });
    st.on("submit", (_e, cx) => this.answer(this.waiting().find((x) => x.address === a.address) ?? a, cx));
    this.inputs[a.address] = st;
    return st;
  }

  answer(a, cx) {
    const text = (this.texts[a.address] ?? "").trim();
    if (!text) return;
    const args = ["send", a.address, text];
    if (a.status === "blocked") args.splice(1, 0, "--force");
    this.send(a, args, `Sent: ${text}`, cx);
    this.inputs[a.address]?.set_value("");
    this.texts[a.address] = "";
  }

  choose(a, key, label, cx) {
    this.send(a, ["keys", a.address, key], `Chose ${key}. ${label}`, cx);
  }

  send(a, args, done, cx) {
    sfx("hum");
    this.sent[a.address] = "Sending…";
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await hc(args);
        this.sent[a.address] = r?.code === 0 || r?.code === undefined ? done : `Not sent: ${(r?.stderr || r?.stdout || "").trim().slice(0, 120)}`;
      } catch (e) {
        this.sent[a.address] = `Not sent: ${String(e?.message ?? e).slice(0, 120)}`;
      }
      cx.notify();
      cx.timer.after(800, (cx) => this.refresh(cx));
    });
  }

  card(s, t, a) {
    const scr = this.screens[a.address];
    const blocked = a.status === "blocked";
    const what = task(a);
    const btn = (id, label, primary, onClick) =>
      div()
        .id(id)
        .flex_none()
        .px(10)
        .py(4)
        .rounded(s.name === "sith" ? 2 : 6)
        .cursor_pointer()
        .border(1)
        .border_color(primary ? s.blade : t.border)
        .bg(primary ? s.blade : t.raised)
        .text_color(primary ? "#ffffff" : t.foreground)
        .text_size(11.5)
        .hover((st) => st.opacity(0.85))
        .on_click((_e, cx) => onClick(cx))
        .child(label);
    return v_flex()
      .id(`cc-${a.address}`)
      .mx(10)
      .mb(10)
      .p(10)
      .gap(8)
      .rounded(s.name === "sith" ? 2 : 10)
      .border(1)
      .border_color(blocked ? s.blockedBlade : t.border)
      .bg(t.background)
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .child(crystal(s, a.status, 8))
          .child(div().flex_none().font_weight(600).child(agentName(a)))
          .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(what || `${a.space_name} › ${a.tab_name}`))
          .child(btn(`cc-go-${a.address}`, "Go to", false, () => {
            sfx("hum");
            run("agent.focus", { terminal: a.address });
          })),
      )
      .child(div().text_size(11).text_color(blocked ? s.blockedBlade : t.dim).child(`${s.words[a.status] ?? a.status} · ${a.space_name} › ${a.tab_name}`))
      .child(
        v_flex()
          .id(`cc-text-${a.address}`)
          .max_h(240)
          .overflow_y_scroll()
          .p(8)
          .rounded(s.name === "sith" ? 2 : 6)
          .bg(t.chrome)
          .font_family("JetBrains Mono")
          .text_size(11)
          .text_color(t.foreground)
          .children((scr?.lines ?? ["Reading…"]).map((l, i) => div().id(`l-${i}`).child(l || " "))),
      )
      .when(Boolean(scr?.options?.length), (el) =>
        el.child(
          v_flex()
            .gap(4)
            .children(scr.options.map((o) => btn(`cc-opt-${a.address}-${o.key}`, `${o.key}. ${o.label}`, o.key === "1", (cx) => this.choose(a, o.key, o.label, cx)))),
        ),
      )
      .when(Boolean(scr?.draft), (el) =>
        el.child(div().text_size(11).italic().text_color(s.blockedBlade).child(`Unsent text in its prompt, your answer goes after it: “${scr.draft.slice(0, 120)}”`)),
      )
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .when(!this.inputs[a.address], (el) => el.child(div().flex_1().text_size(11).text_color(t.dim).child("…")))
          .when(Boolean(this.inputs[a.address]), (el) => el.child(
            Input.new(this.inputs[a.address])
              .flex_1()
              .h(30)
              .px(8)
              .rounded(s.name === "sith" ? 2 : 6)
              .border(1)
              .border_color(t.border)
              .bg(t.background)
              .text_size(12)
              .text_color(t.foreground),
          ))
          .child(btn(`cc-send-${a.address}`, "Send", true, (cx) => this.answer(a, cx))),
      )
      .when(Boolean(this.sent[a.address]), (el) => el.child(div().text_size(11).text_color(t.dim).truncate().child(this.sent[a.address])));
  }

  render(_cx) {
    const s = side(props());
    const t = theme();
    const list = this.waiting();
    // Forget answers and inputs of agents that no longer wait.
    const live = new Set(list.map((a) => a.address));
    for (const k of Object.keys(this.sent)) if (!live.has(k)) delete this.sent[k];
    return v_flex()
      .id("council")
      .size_full()
      .bg(t.chrome)
      .font_family(s.font)
      .text_size(13)
      .text_color(t.foreground)
      .child(
        h_flex()
          .px(14)
          .pt(12)
          .pb(10)
          .items_center()
          .child(div().flex_1().font_family(s.titleFont).text_size(12).font_weight(700).text_color(s.name === "sith" ? s.blade : t.foreground).child(spaced(s.councilTitle)))
          .child(div().text_size(11).text_color(t.dim).child(String(list.length))),
      )
      .child(
        v_flex()
          .id("council-list")
          .flex_1()
          .min_h(0)
          .overflow_y_scroll()
          .when(list.length === 0, (el) => el.child(div().px(14).py(6).italic().text_size(12).text_color(t.dim).child(s.councilEmpty)))
          .children(list.map((a) => this.card(s, t, a))),
      );
  }
}
