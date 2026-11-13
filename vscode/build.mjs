// Builds the VS Code color themes from Herdr's themes in ../themes, so the
// editor, its terminal and Claude Code (which droid-console sets to the
// light-ansi / dark-ansi theme) all wear the same palette as the layout.
//
//   node build.mjs      (or: pnpm run build)
//
// Fails if any syntax color falls below 4.5:1 contrast on the editor.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const herdrThemes = join(here, "..", "themes");

// Which terminal color (ansi index) each kind of code gets, per side.
// The keyword color is each side's blade.
const THEMES = [
  {
    source: "jedi.json",
    out: "jedi-archives-color-theme.json",
    name: "Jedi Archives",
    type: "light",
    roles: {
      keyword: 4, string: 2, number: 3, func: 5, type: 6,
      tag: 1, attribute: 3, regex: 6, escape: 1, property: 15,
    },
  },
  {
    source: "sith.json",
    out: "sith-citadel-color-theme.json",
    name: "Sith Citadel",
    type: "dark",
    roles: {
      keyword: 1, string: 2, number: 3, func: 5, type: 6,
      tag: 9, attribute: 11, regex: 6, escape: 9, property: 7,
    },
  },
  {
    source: "star-wars.json",
    out: "star-wars-color-theme.json",
    name: "Star Wars (Herdr)",
    type: "dark",
    roles: {
      keyword: 4, string: 2, number: 5, func: 3, type: 6,
      tag: 1, attribute: 3, regex: 6, escape: 1, property: 7,
    },
  },
];

const ANSI_KEYS = [
  "Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White",
  "BrightBlack", "BrightRed", "BrightGreen", "BrightYellow",
  "BrightBlue", "BrightMagenta", "BrightCyan", "BrightWhite",
];

// #rrggbb + alpha (0..1) -> #rrggbbaa
const a = (hex, alpha) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, "0");

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Mixes `hex` toward `toward` in small steps until it reaches 4.5:1 on `bg`.
function readable(hex, toward, bg) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [from, to] = [rgb(hex), rgb(toward)];
  for (let k = 0; k <= 1; k += 0.02) {
    const out = "#" + from.map((v, i) => Math.round(v + (to[i] - v) * k).toString(16).padStart(2, "0")).join("");
    if (contrast(out, bg) >= 4.5) return out;
  }
  return toward;
}

function workbench(t) {
  const c = t.colors;
  const bg = t.background;
  const fg = t.foreground;
  const red = t.ansi[1];
  const light = t.type === "light";

  const colors = {
    focusBorder: c.ring,
    foreground: fg,
    descriptionForeground: c.muted,
    disabledForeground: c.dim,
    errorForeground: red,
    "icon.foreground": c.muted,
    "widget.border": c.border,
    "widget.shadow": light ? "#5f533d33" : "#00000080",
    "selection.background": t.selection,
    "sash.hoverBorder": c.accent,
    "textLink.foreground": c.accent,
    "textLink.activeForeground": c.accent,
    "textPreformat.foreground": t.ansi[light ? 5 : 3],
    "textBlockQuote.background": c.surface,
    "textBlockQuote.border": c.border,
    "textCodeBlock.background": c.surface,

    // Lightsaber accents: buttons, badges, progress.
    "button.background": c.solid,
    "button.foreground": c.solid_foreground,
    "button.hoverBackground": a(c.solid, 0.85),
    "button.secondaryBackground": c.raised,
    "button.secondaryForeground": fg,
    "button.secondaryHoverBackground": c.hover,
    "badge.background": c.accent,
    "badge.foreground": c.accent_foreground,
    "activityBarBadge.background": c.accent,
    "activityBarBadge.foreground": c.accent_foreground,
    "progressBar.background": c.accent,
    "checkbox.background": c.popover,
    "checkbox.border": c.border,

    // Inputs and dropdowns. `input` is a border tone in the layout themes.
    "input.background": c.popover,
    "input.foreground": fg,
    "input.border": c.border,
    "input.placeholderForeground": c.dim,
    "inputOption.activeBorder": c.accent,
    "inputOption.activeBackground": a(c.accent, 0.2),
    "inputValidation.errorBorder": red,
    "inputValidation.errorBackground": c.popover,
    "inputValidation.warningBorder": c.blocked,
    "inputValidation.warningBackground": c.popover,
    "inputValidation.infoBorder": c.working,
    "inputValidation.infoBackground": c.popover,
    "dropdown.background": c.popover,
    "dropdown.foreground": fg,
    "dropdown.border": c.border,

    // Window frame.
    "titleBar.activeBackground": c.chrome,
    "titleBar.activeForeground": fg,
    "titleBar.inactiveBackground": c.chrome,
    "titleBar.inactiveForeground": c.dim,
    "titleBar.border": c.border,
    "activityBar.background": c.canvas,
    "activityBar.foreground": c.accent,
    "activityBar.inactiveForeground": c.dim,
    "activityBar.activeBorder": c.accent,
    "activityBar.border": c.border,
    "sideBar.background": c.surface,
    "sideBar.foreground": fg,
    "sideBar.border": c.border,
    "sideBarTitle.foreground": c.muted,
    "sideBarSectionHeader.background": c.chrome,
    "sideBarSectionHeader.foreground": c.muted,
    "sideBarSectionHeader.border": c.border,
    "panel.background": c.surface,
    "panel.border": c.border,
    "panelTitle.activeForeground": fg,
    "panelTitle.activeBorder": c.accent,
    "panelTitle.inactiveForeground": c.dim,
    "statusBar.background": c.chrome,
    "statusBar.foreground": c.muted,
    "statusBar.border": c.border,
    "statusBar.noFolderBackground": c.chrome,
    "statusBar.debuggingBackground": c.blocked,
    "statusBar.debuggingForeground": light ? "#ffffff" : "#000000",
    "statusBarItem.hoverBackground": c.hover,
    "statusBarItem.remoteBackground": c.solid,
    "statusBarItem.remoteForeground": c.solid_foreground,
    "statusBarItem.errorBackground": red,
    "statusBarItem.errorForeground": "#ffffff",

    // Tabs: the active one gets a lit blade along its top.
    "editorGroupHeader.tabsBackground": c.chrome,
    "editorGroupHeader.tabsBorder": c.border,
    "editorGroup.border": c.border,
    "editorGroup.dropBackground": a(c.accent, 0.15),
    "tab.activeBackground": bg,
    "tab.activeForeground": fg,
    "tab.activeBorderTop": c.accent,
    "tab.inactiveBackground": c.chrome,
    "tab.inactiveForeground": c.dim,
    "tab.hoverBackground": c.hover,
    "tab.border": c.border,
    "tab.unfocusedActiveBorderTop": a(c.accent, 0.4),
    "tab.unfocusedActiveForeground": c.muted,
    "breadcrumb.foreground": c.muted,
    "breadcrumb.focusForeground": fg,
    "breadcrumb.activeSelectionForeground": c.accent,
    "breadcrumbPicker.background": c.popover,

    // Lists and trees.
    "list.hoverBackground": c.hover,
    "list.hoverForeground": fg,
    "list.activeSelectionBackground": c.selected,
    "list.activeSelectionForeground": fg,
    "list.inactiveSelectionBackground": c.raised,
    "list.inactiveSelectionForeground": fg,
    "list.focusOutline": c.ring,
    "list.highlightForeground": c.accent,
    "list.errorForeground": red,
    "list.warningForeground": c.blocked,
    "tree.indentGuidesStroke": c.border,

    // Menus, widgets, pickers.
    "menu.background": c.popover,
    "menu.foreground": fg,
    "menu.selectionBackground": c.selected,
    "menu.selectionForeground": fg,
    "menu.separatorBackground": c.border,
    "menu.border": c.border,
    "quickInput.background": c.popover,
    "quickInput.foreground": fg,
    "quickInputList.focusBackground": c.selected,
    "quickInputList.focusForeground": fg,
    "pickerGroup.foreground": c.accent,
    "pickerGroup.border": c.border,
    "editorWidget.background": c.popover,
    "editorWidget.border": c.border,
    "editorSuggestWidget.background": c.popover,
    "editorSuggestWidget.border": c.border,
    "editorSuggestWidget.selectedBackground": c.selected,
    "editorSuggestWidget.highlightForeground": c.accent,
    "editorHoverWidget.background": c.popover,
    "editorHoverWidget.border": c.border,
    "notifications.background": c.popover,
    "notifications.border": c.border,
    "notificationCenterHeader.background": c.chrome,
    "notificationsErrorIcon.foreground": red,
    "notificationsWarningIcon.foreground": c.blocked,
    "notificationsInfoIcon.foreground": c.working,

    // Editor.
    "editor.background": bg,
    "editor.foreground": fg,
    "editorCursor.foreground": t.cursor,
    "editor.selectionBackground": t.selection,
    "editor.inactiveSelectionBackground": a(t.selection, 0.6),
    "editor.selectionHighlightBackground": a(t.selection, 0.5),
    "editor.wordHighlightBackground": a(t.selection, 0.45),
    "editor.wordHighlightStrongBackground": a(t.selection, 0.7),
    "editor.findMatchBackground": a(c.blocked, 0.45),
    "editor.findMatchHighlightBackground": a(c.blocked, 0.22),
    "editor.findMatchBorder": c.blocked,
    "editor.lineHighlightBackground": c.surface,
    "editor.lineHighlightBorder": "#00000000",
    "editor.rangeHighlightBackground": a(c.accent, 0.08),
    "editorLineNumber.foreground": c.dim,
    "editorLineNumber.activeForeground": c.accent,
    "editorIndentGuide.background1": a(c.border, 0.6),
    "editorIndentGuide.activeBackground1": c.dim,
    "editorWhitespace.foreground": a(c.dim, 0.4),
    "editorRuler.foreground": c.border,
    "editorBracketMatch.background": a(c.accent, 0.15),
    "editorBracketMatch.border": c.accent,
    "editorCodeLens.foreground": c.dim,
    "editorLink.activeForeground": c.accent,
    "editorError.foreground": red,
    "editorWarning.foreground": c.blocked,
    "editorInfo.foreground": c.working,
    "editorGutter.addedBackground": c.done,
    "editorGutter.modifiedBackground": c.working,
    "editorGutter.deletedBackground": red,
    "editorOverviewRuler.border": c.border,
    "editorOverviewRuler.errorForeground": red,
    "editorOverviewRuler.warningForeground": c.blocked,
    "editorOverviewRuler.findMatchForeground": c.blocked,
    "scrollbarSlider.background": a(c.dim, 0.35),
    "scrollbarSlider.hoverBackground": a(c.dim, 0.55),
    "scrollbarSlider.activeBackground": a(c.accent, 0.6),
    "minimap.selectionHighlight": t.selection,
    "peekView.border": c.accent,
    "peekViewEditor.background": c.surface,
    "peekViewResult.background": c.popover,
    "peekViewTitle.background": c.chrome,

    // Diffs and git: done adds, working edits, red removes.
    "diffEditor.insertedTextBackground": a(t.ansi[2], light ? 0.18 : 0.22),
    "diffEditor.removedTextBackground": a(red, light ? 0.15 : 0.22),
    "gitDecoration.addedResourceForeground": t.ansi[2],
    "gitDecoration.untrackedResourceForeground": t.ansi[2],
    "gitDecoration.modifiedResourceForeground": t.ansi[4],
    "gitDecoration.deletedResourceForeground": red,
    "gitDecoration.conflictingResourceForeground": t.ansi[3],
    "gitDecoration.ignoredResourceForeground": c.dim,
    "merge.currentHeaderBackground": a(t.ansi[2], 0.4),
    "merge.incomingHeaderBackground": a(t.ansi[4], 0.4),

    // The integrated terminal: the layout's exact palette, so Claude Code's
    // light-ansi / dark-ansi theme looks the same here as in Herdr.
    "terminal.background": bg,
    "terminal.foreground": fg,
    "terminalCursor.foreground": t.cursor,
    "terminal.selectionBackground": t.selection,
    "terminal.border": c.border,
  };
  t.ansi.forEach((hex, i) => (colors[`terminal.ansi${ANSI_KEYS[i]}`] = hex));
  return colors;
}

function tokens(t) {
  const p = Object.fromEntries(
    Object.entries(t.roles).map(([role, i]) => [role, t.ansi[i]]),
  );
  // The layout's dim tone, nudged toward the text color until it is readable.
  p.comment = readable(t.colors.dim, t.foreground, t.background);
  p.punctuation = t.colors.muted;
  p.invalid = t.ansi[1];

  const rule = (name, scope, foreground, fontStyle) => ({
    name, scope, settings: { foreground, ...(fontStyle && { fontStyle }) },
  });
  return [
    rule("Comments", ["comment", "punctuation.definition.comment"], p.comment, "italic"),
    rule("Keywords", ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new", "keyword.operator.expression", "keyword.operator.logical.python"], p.keyword),
    rule("Operators and punctuation", ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator", "punctuation.terminator"], p.punctuation),
    rule("Strings", ["string", "string.quoted", "string.template", "markup.inline.raw", "markup.fenced_code"], p.string),
    rule("String interpolation", ["punctuation.definition.template-expression", "punctuation.section.embedded"], p.keyword),
    rule("Escapes", ["constant.character.escape", "constant.character.format.placeholder"], p.escape),
    rule("Regular expressions", ["string.regexp"], p.regex),
    rule("Numbers and constants", ["constant.numeric", "constant.language", "constant.other", "variable.other.constant", "variable.other.enummember", "support.constant"], p.number),
    rule("Functions", ["entity.name.function", "support.function", "meta.function-call entity.name.function", "variable.function"], p.func),
    rule("Types and classes", ["entity.name.type", "entity.name.class", "entity.name.namespace", "support.type", "support.class", "entity.other.inherited-class", "storage.type.class.jsdoc"], p.type),
    rule("Variables", ["variable", "variable.other.readwrite", "meta.definition.variable"], t.foreground),
    rule("Parameters", ["variable.parameter"], t.foreground, "italic"),
    rule("This and self", ["variable.language", "variable.language.this", "variable.language.self"], p.keyword, "italic"),
    rule("Properties", ["variable.other.property", "variable.other.object.property", "support.variable.property", "meta.object-literal.key"], p.property),
    rule("Tags", ["entity.name.tag", "punctuation.definition.tag"], p.tag),
    rule("Attributes", ["entity.other.attribute-name"], p.attribute, "italic"),
    rule("Decorators", ["meta.decorator", "entity.name.function.decorator", "punctuation.decorator"], p.number),
    rule("JSON and YAML keys", ["support.type.property-name", "entity.name.tag.yaml"], p.keyword),
    rule("CSS properties", ["support.type.property-name.css", "support.type.vendored.property-name.css"], p.type),
    rule("Markdown headings", ["markup.heading", "entity.name.section.markdown", "markup.heading punctuation.definition.heading"], p.keyword, "bold"),
    rule("Markdown bold", ["markup.bold"], t.foreground, "bold"),
    rule("Markdown italic", ["markup.italic"], t.foreground, "italic"),
    rule("Markdown links", ["markup.underline.link", "string.other.link"], p.type),
    rule("Markdown quotes", ["markup.quote"], p.comment, "italic"),
    rule("Markdown lists", ["punctuation.definition.list.begin.markdown"], p.number),
    rule("Diff inserted", ["markup.inserted"], p.string),
    rule("Diff deleted", ["markup.deleted"], p.invalid),
    rule("Diff changed", ["markup.changed"], p.number),
    rule("Invalid", ["invalid", "invalid.illegal"], p.invalid, "underline"),
  ];
}

// vsce wants a LICENSE next to package.json; it is the repo's own.
copyFileSync(join(here, "..", "LICENSE"), join(here, "LICENSE"));

const problems = [];
mkdirSync(join(here, "themes"), { recursive: true });

for (const spec of THEMES) {
  const t = { ...JSON.parse(readFileSync(join(herdrThemes, spec.source), "utf8")), ...spec };
  const tokenColors = tokens(t);

  for (const r of tokenColors) {
    const ratio = contrast(r.settings.foreground, t.background);
    if (ratio < 4.5) {
      problems.push(`${spec.name}: "${r.name}" ${r.settings.foreground} is ${ratio.toFixed(2)}:1 on ${t.background}`);
    }
  }

  const theme = {
    $schema: "vscode://schemas/color-theme",
    name: spec.name,
    type: spec.type,
    semanticHighlighting: true,
    colors: workbench(t),
    tokenColors,
    semanticTokenColors: {
      "variable.readonly": t.ansi[t.roles.number],
      "property.readonly": t.ansi[t.roles.number],
      enumMember: t.ansi[t.roles.number],
      parameter: { foreground: t.foreground, italic: true },
      "*.deprecated": { strikethrough: true },
    },
  };
  writeFileSync(join(here, "themes", spec.out), JSON.stringify(theme, null, 2) + "\n");
  console.log(`wrote themes/${spec.out}`);
}

if (problems.length) {
  console.error("\nContrast below 4.5:1:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("All syntax colors pass 4.5:1 contrast.");
