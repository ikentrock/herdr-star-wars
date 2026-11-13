# Herdr Star Wars Themes for VS Code

The colors of the [herdr-star-wars](https://github.com/ikentrock/herdr-star-wars) layouts, for VS Code:

- **Jedi Archives**: light parchment, a blue blade.
- **Sith Citadel**: near black, a red blade.
- **Star Wars (Herdr)**: the colors-only dark theme, with a yellow accent.

The active tab carries a lit blade along its top, and keywords take the blade's color. Strings, numbers, functions and types use the same terminal colors as the layout, and every syntax color has at least 4.5:1 contrast against the editor.

**The terminal matches Herdr exactly.** VS Code's integrated terminal gets the layout's 16 colors. Claude Code's `light-ansi` and `dark-ansi` themes (which the starwars-claude-mods droid-console sets inside Herdr) take their colors from the terminal, so Claude Code looks the same in VS Code as in Herdr. Pick one of those in Claude Code's `/config` if you run it in VS Code's terminal.

The theme files are generated from Herdr's themes in `../themes`. After changing those, run `node build.mjs` here.
