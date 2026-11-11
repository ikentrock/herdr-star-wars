// Holocron folders: spaces grouped into named folders in the sidebar.
// Saved in shared state ("starwars.folders"), so they survive restarts and
// both sides see the same folders.
//
// The "folders" role is an overlay with two modes:
//   menu  a popup from right-clicking a space: move it to a folder, a new one, or out
//   name  a dialog to name a new folder or rename / delete one

import { div } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { props, theme, shared, setShared, closeOverlay, openOverlay } from "herdr";
import { side, spaced, glyph, sfx } from "./kit.js";

const KEY = "starwars.folders";

/** { list: [{ id, name, open }], of: { [spaceId]: folderId } } */
export function folders() {
  const v = shared(KEY);
  return {
    list: Array.isArray(v?.list) ? v.list : [],
    of: v?.of && typeof v.of === "object" ? v.of : {},
  };
}

function save(f) {
  setShared(KEY, { list: f.list, of: f.of });
}

export function toggleFolder(id) {
  const f = folders();
  save({ ...f, list: f.list.map((x) => (x.id === id ? { ...x, open: x.open === false } : x)) });
}

export function moveSpace(spaceId, folderId) {
  const f = folders();
  const of = { ...f.of };
  if (folderId) of[spaceId] = folderId;
  else delete of[spaceId];
  save({ ...f, of });
}

function addFolder(name, spaceId) {
  const f = folders();
  const id = `f${Date.now().toString(36)}`;
  const of = { ...f.of };
  if (spaceId) of[spaceId] = id;
  save({ list: [...f.list, { id, name, open: true }], of });
}

function renameFolder(id, name) {
  const f = folders();
  save({ ...f, list: f.list.map((x) => (x.id === id ? { ...x, name } : x)) });
}

function deleteFolder(id) {
  const f = folders();
  const of = Object.fromEntries(Object.entries(f.of).filter(([, v]) => v !== id));
  save({ list: f.list.filter((x) => x.id !== id), of });
}

/** Right-click on a space: where to keep it. */
export function openSpaceMenu(s, spaceId) {
  const n = folders().list.length;
  openOverlay({ mod: "starwars", kind: "popup", width: 220, height: Math.min(80 + 32 * (n + 2), 420), props: { role: "folders", side: s.name, mode: "menu", space: spaceId } });
}

/** A dialog to name a new folder (optionally putting a space in it) or rename/delete one. */
export function openNameDialog(s, { folder = null, space = null } = {}) {
  openOverlay({ mod: "starwars", kind: "dialog", width: 360, height: folder ? 214 : 190, props: { role: "folders", side: s.name, mode: "name", folder, space } });
}

export default class Folders {
  init(p, _cx) {
    const pr = props() ?? p ?? {};
    if (pr.mode === "name") {
      const current = folders().list.find((x) => x.id === pr.folder);
      this.text = current?.name ?? "";
      this.input = InputState.new({ value: this.text, placeholder: pr.folder ? "" : "Order of the Build" });
      if (this.text) this.input.set_selected_range({ start: 0, end: this.text.length });
      this.input.on("change", (_e, cx) => {
        this.text = this.input.value();
        cx.notify();
      });
      this.input.on("submit", () => this.submit());
      this.input.focus();
    }
  }

  close() {
    const id = props()?.overlay;
    if (id) closeOverlay(id);
  }

  submit() {
    const pr = props() ?? {};
    const name = this.text.trim();
    if (!name) return;
    if (pr.folder) renameFolder(pr.folder, name);
    else addFolder(name, pr.space);
    sfx("hum");
    this.close();
  }

  row(s, t, id, icon, label, on, action) {
    return h_flex()
      .id(id)
      .h(30)
      .px(10)
      .gap(8)
      .items_center()
      .rounded(s.name === "sith" ? 2 : 6)
      .cursor_pointer()
      .text_color(on ? t.foreground : t.muted)
      .when(on, (el) => el.bg(t.selected))
      .hover((st) => st.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        action();
        this.close();
      })
      .child(icon ? glyph(icon, t.muted, 13) : div().w(13))
      .child(div().flex_1().min_w(0).truncate().child(label));
  }

  menu(s, t, pr) {
    const f = folders();
    const at = f.of[pr.space] ?? null;
    return v_flex()
      .id("folder-menu")
      .size_full()
      .p(6)
      .gap(1)
      .bg(t.popover ?? t.chrome)
      .font_family(s.font)
      .text_size(13)
      .child(div().px(10).pt(4).pb(6).font_family(s.titleFont).text_size(10).text_color(t.dim).child(spaced("KEEP IN")))
      .children(f.list.map((x) => this.row(s, t, `to-${x.id}`, "folder", x.name, x.id === at, () => moveSpace(pr.space, x.id))))
      .child(this.row(s, t, "to-new", "plus", "New folder…", false, () => openNameDialog(s, { space: pr.space })))
      .when(Boolean(at), (el) => el.child(this.row(s, t, "to-none", "close", "Take out of its folder", false, () => moveSpace(pr.space, null))));
  }

  dialog(s, t, pr) {
    const button = (id, text, primary, action) =>
      h_flex()
        .id(id)
        .h(30)
        .px(14)
        .items_center()
        .rounded(s.name === "sith" ? 2 : 8)
        .cursor_pointer()
        .border(1)
        .border_color(primary ? s.blade : t.border)
        .bg(primary ? s.blade : t.raised)
        .text_color(primary ? "#ffffff" : t.foreground)
        .text_size(12.5)
        .hover((st) => st.opacity(0.88))
        .on_click(() => action())
        .child(text);
    return v_flex()
      .id("folder-name")
      .size_full()
      .p(18)
      .bg(t.popover ?? t.chrome)
      .text_color(t.foreground)
      .font_family(s.font)
      .child(div().font_family(s.titleFont).text_size(13).font_weight(700).child(spaced(pr.folder ? "RENAME FOLDER" : "NEW FOLDER")))
      .child(div().pt(14).pb(6).text_size(11.5).text_color(t.dim).child("Name"))
      .child(Input.new(this.input).h(34).px(10).rounded(s.name === "sith" ? 2 : 8).border(1).border_color(s.blade).bg(t.background).text_size(13).text_color(t.foreground))
      .child(
        h_flex()
          .pt(18)
          .gap(8)
          .when(Boolean(pr.folder), (el) =>
            el.child(
              button("fd-delete", "Delete folder", false, () => {
                deleteFolder(pr.folder);
                sfx("retract");
                this.close();
              }),
            ),
          )
          .child(div().flex_1())
          .child(button("fd-cancel", "Cancel", false, () => this.close()))
          .child(button("fd-save", "Save", true, () => this.submit())),
      );
  }

  render(_cx) {
    const pr = props() ?? {};
    const s = side(pr);
    const t = theme();
    return pr.mode === "name" ? this.dialog(s, t, pr) : this.menu(s, t, pr);
  }
}
