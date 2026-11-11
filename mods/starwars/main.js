// Star Wars for Herdr: the Jedi Archives (light) and the Sith Citadel (dark).
// One mod in roles, like Herdr 98. The layouts give each copy props
// { side: "jedi" | "sith", role }:
//   bar      emblem, title, tabs as plates, crawl, mute, switch sides
//   sidebar  spaces as holocrons/systems, agents as padawans/apprentices
//   header   a pane's header: its title and a lightsaber that ignites on focus
//   status   agent counts in the side's words, location, clock
//   droid    a floating droid that tells you when an agent needs you
//   crawl    the opening crawl (a dialog)
//   council  side panel: agents waiting on you, their question, and a box to answer
//   folders  holocron folders: the right-click menu (popup) and the name dialog

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Bar from "./bar.js";
import Sidebar from "./sidebar.js";
import Header from "./header.js";
import Status from "./status.js";
import Droid from "./droid.js";
import Crawl from "./crawl.js";
import Folders from "./folders.js";
import Council from "./council.js";

const ROLES = { bar: Bar, sidebar: Sidebar, header: Header, status: Status, droid: Droid, crawl: Crawl, folders: Folders, council: Council };

export default class StarWars extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role] ?? Header;
    this.role = new R();
    this.role.init?.(pr, cx);
  }

  render(cx) {
    return this.role.render(cx);
  }
}
