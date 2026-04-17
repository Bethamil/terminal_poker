# terminal-poker-cli

Terminal client for **[Terminal Poker](https://github.com/Bethamil/terminal_poker)** — planning poker with a keyboard-first workflow. The CLI connects to a running Terminal Poker **server** (HTTP + Socket.IO); it does not bundle the backend or database.

## Requirements

- **Node.js** 18 or newer
- A **Terminal Poker server** you can reach (self-hosted or another deployment)

## Install

```bash
npm install -g terminal-poker-cli
```

Then run:

```bash
terminal-poker
```

You can also use `npx` without a global install:

```bash
npx terminal-poker-cli --server https://your-server.example.com
```

## Usage

### Command-line options

| Option | Short | Description |
|--------|-------|-------------|
| `--server` | `-s` | Server base URL (e.g. `http://localhost:4000`) |
| `--name` | `-n` | Your display name |
| `--join` | `-j` | Join a room immediately by code |
| `--observer` | `-o` | Join as an observer |
| `--help` | | Show help |

### Examples

```bash
terminal-poker
terminal-poker --server http://localhost:4000
terminal-poker --join ABC12
terminal-poker --join ABC12 --observer
terminal-poker --server https://poker.example.com --name Alex
```

### Inside the app

- Commands are typed with a **leading slash** (e.g. `/create`, `/join ROOMCODE`, `/vote 5`). You can also submit a vote by typing a **deck value** directly when a round is open.
- On the home screen you can set a default server with `/server URL` and your name with `/name YourName`; those defaults are stored locally.
- Use `/quit` to exit the client.

Host (moderator) actions include `/reveal`, `/next`, `/deck`, `/passcode`, and others; voters use `/vote` or the deck value directly. The on-screen help lists commands for your current role.

## Self-hosting the server

The CLI is only a client. To run your own stack, see the main repo: [Terminal Poker — Getting Started](https://github.com/Bethamil/terminal_poker#readme) and the `docs/` folder there.

## Developing this package (monorepo)

From the repository root:

```bash
pnpm install
pnpm --filter terminal-poker-cli build
node apps/cli/dist/index.js --server http://localhost:4000
```

Watch mode:

```bash
pnpm --filter terminal-poker-cli dev
```

## License

See the [Terminal Poker repository](https://github.com/Bethamil/terminal_poker) for license terms.
