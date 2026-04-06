#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./app.js";
import { setDefaultServer, setDefaultName } from "./lib/store.js";

const cli = meow(
  `
  Usage
    $ terminal-poker [options]

  Options
    --server, -s  Server URL (default: saved or https://terminal-poker.up.railway.app)
    --name, -n    Your display name
    --join, -j    Join a room immediately by code
    --help        Show this help

  Examples
    $ terminal-poker
    $ terminal-poker --join ABC12
    $ terminal-poker --server http://localhost:4000
`,
  {
    importMeta: import.meta,
    flags: {
      server: { type: "string", shortFlag: "s" },
      name: { type: "string", shortFlag: "n" },
      join: { type: "string", shortFlag: "j" },
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

const { waitUntilExit } = render(<App />);

waitUntilExit().then(() => {
  process.exit(0);
});
