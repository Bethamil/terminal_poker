#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import type { JoinableRole } from "@terminal-poker/shared-types";
import { App } from "./app.js";
import { setDefaultServer, setDefaultName } from "./lib/store.js";

const cli = meow(
  `
  Usage
    $ terminal-poker [options]

  Options
    --server, -s  Server URL
    --name, -n    Your display name
    --join, -j    Join a room immediately by code
    --observer, -o  Join as an observer
    --help        Show this help

  Examples
    $ terminal-poker
    $ terminal-poker --join ABC12
    $ terminal-poker --join ABC12 --observer
    $ terminal-poker --server http://localhost:4000
`,
  {
    importMeta: import.meta,
    flags: {
      server: { type: "string", shortFlag: "s" },
      name: { type: "string", shortFlag: "n" },
      join: { type: "string", shortFlag: "j" },
      observer: { type: "boolean", shortFlag: "o", default: false },
    },
  },
);

// Apply CLI flags to config
if (cli.flags.server) {
  setDefaultServer(cli.flags.server);
}
if (cli.flags.name) {
  setDefaultName(cli.flags.name);
}

// Enter alternate screen buffer for fullscreen experience
process.stdout.write("\x1b[?1049h");
process.stdout.write("\x1b[H");

const initialJoinRole: JoinableRole = cli.flags.observer ? "observer" : "participant";
const { waitUntilExit } = render(
  <App initialJoin={cli.flags.join} initialJoinRole={initialJoinRole} />,
);

waitUntilExit().then(() => {
  // Leave alternate screen buffer
  process.stdout.write("\x1b[?1049l");
  process.exit(0);
});
