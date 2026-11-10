#!/usr/bin/env bash
# Installs the Jedi Archives and Sith Citadel layouts into Herdr.
#
#   ./install.sh               install (from a clone of this repo)
#   ./install.sh --uninstall   remove them again
#   curl -fsSL https://raw.githubusercontent.com/ikentrock/herdr-star-wars/main/install.sh | bash
#
# Herdr's folder is $HERDR_APP_HOME, else ~/.config/herdr-app. Files that
# would be replaced are backed up first. Herdr picks the new files up live.
set -euo pipefail

REPO="ikentrock/herdr-star-wars"
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
FILES=(
  layouts/jedi.json layouts/jedi.svg
  layouts/sith.json layouts/sith.svg
  themes/jedi.json themes/sith.json themes/star-wars.json
  mods/starwars
)

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

uninstall() {
  [ -d "$HOME_DIR" ] || die "no Herdr folder at $HOME_DIR"
  if command -v herdr-app >/dev/null 2>&1; then
    current="$(herdr-app status 2>/dev/null | sed -n 's/.*"layout": *"\([^"]*\)".*/\1/p' | head -1 || true)"
    if [ "$current" = "jedi" ] || [ "$current" = "sith" ]; then
      herdr-app do layout.switch '{"name":"main"}' >/dev/null 2>&1 || true
    fi
  fi
  for f in "${FILES[@]}"; do rm -rf "${HOME_DIR:?}/$f"; done
  say "Removed the Star Wars layouts from $HOME_DIR."
}

install() {
  local src="$1"
  [ -d "$src/mods/starwars" ] || die "can't find the files to install in $src"
  if [ ! -d "$HOME_DIR" ]; then
    say "No Herdr folder at $HOME_DIR. Start Herdr once first (or set HERDR_APP_HOME)."
    exit 1
  fi

  local backup=""
  for f in "${FILES[@]}"; do
    if [ -e "$HOME_DIR/$f" ] && ! diff -rq -x gpui-kit.d.ts -x jsconfig.json "$src/$f" "$HOME_DIR/$f" >/dev/null 2>&1; then
      [ -n "$backup" ] || backup="$HOME_DIR/.herdr-star-wars-backup-$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$backup/$(dirname "$f")"
      cp -R "$HOME_DIR/$f" "$backup/$f"
    fi
  done

  mkdir -p "$HOME_DIR/layouts" "$HOME_DIR/themes" "$HOME_DIR/mods"
  for f in layouts/jedi.json layouts/jedi.svg layouts/sith.json layouts/sith.svg \
           themes/jedi.json themes/sith.json themes/star-wars.json; do
    cp "$src/$f" "$HOME_DIR/$f"
  done
  # Replace the mod folder whole, keeping files Herdr generates there.
  mkdir -p "$HOME_DIR/mods/starwars"
  find "$HOME_DIR/mods/starwars" -mindepth 1 -maxdepth 1 \
    ! -name gpui-kit.d.ts ! -name jsconfig.json -exec rm -rf {} +
  cp -R "$src/mods/starwars/." "$HOME_DIR/mods/starwars/"

  say "Installed into $HOME_DIR."
  [ -z "$backup" ] || say "Replaced files were backed up to $backup."

  if command -v herdr-app >/dev/null 2>&1; then
    herdr-app check "$HOME_DIR/mods/starwars" >/dev/null 2>&1 \
      && say "Mod check passed." \
      || say "warning: 'herdr-app check' failed; run it to see why: herdr-app check $HOME_DIR/mods/starwars"
  fi
  say ""
  say "Open Herdr's Settings > Layouts and pick 'jedi' or 'sith', or run:"
  say "  herdr-app do layout.switch '{\"name\":\"sith\"}'"
}

case "${1:-}" in
  --uninstall|-u) uninstall; exit 0 ;;
  --help|-h) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) die "unknown option: $1 (try --help)" ;;
esac

# From a clone: install the files next to this script. Piped from curl:
# download this repo's main branch first.
here=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
if [ -n "$here" ] && [ -d "$here/mods/starwars" ]; then
  install "$here"
else
  command -v curl >/dev/null 2>&1 || die "curl is needed to download $REPO"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  say "Downloading $REPO..."
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.tar.gz" | tar -xz -C "$tmp"
  install "$tmp/herdr-star-wars-main"
fi
