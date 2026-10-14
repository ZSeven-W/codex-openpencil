# Codex OpenPencil

Design editable vector UI with Codex and the local Rust
[OpenPencil](https://github.com/ZSeven-W/openpencil) editor.

[中文说明](README.zh.md) · [Architecture](docs/architecture.md)

This repository packages an OpenPencil **Codex plugin**, a dependency-free
stdio-to-HTTP MCP bridge, and focused setup/design skills. It reuses the editor's
native tool catalog instead of implementing a second design engine.

## Install

Requires Node.js 22+ in the local executor's PATH, a recent Codex client with
plugin marketplace support, and a running Rust OpenPencil editor with MCP enabled.

```sh
git clone git@github.com:ZSeven-W/codex-openpencil.git
cd codex-openpencil
codex plugin marketplace add .
codex plugin add openpencil@zseven-openpencil
```

For a repository you can access through HTTPS, the marketplace can also be added
directly with `codex plugin marketplace add ZSeven-W/codex-openpencil`.
Clients without `plugin add` can install from the local source in the desktop
Plugins Directory. Restart/reconnect or open a new chat to load the installed
skills and MCP server.

Open the Rust OpenPencil editor, enable MCP in Agent Settings, and run:

```sh
npm run doctor
```

The doctor verifies the running instance described in
`~/.openpencil/.op-mcp-port`. The bridge never hard-codes a user-specific port.
For an intentional headless endpoint, pass a local port:

```sh
npm run doctor -- --port 3100
```

Use the setup workflow after installing, then try:

> Create a single-page dashboard in OpenPencil. Inspect its layout, show a PNG
> preview, and save the editable design to a new .op file in this project.

## What's included

- Native Rust MCP tools for creating, reading, refining, rendering, and saving
  real `.op` documents.
- Instance-verified connection to the live editor; explicit port support for
  isolated/headless hosts.
- `openpencil-setup` for connection diagnostics and `openpencil-design` for
  script-based creation, content preservation, layout/visual QA, and save checks.
- Native image blocks passed through without converting PNGs to text.
- A repo marketplace, regression tests, and an isolated end-to-end smoke runner.

**Current boundary:** this first version does not reproduce DSH's embedded
interactive canvas or managed-editor cards. Edit interactively in OpenPencil;
Codex can inspect and modify it through MCP and display PNG previews.
It is not listed in OpenAI's public Plugin Directory.

## Connection behavior

The bundled `codex_openpencil` server in `mcp.json` launches
`node ${PLUGIN_ROOT}/scripts/mcp-bridge.mjs`.
There are no npm runtime dependencies and no package install hooks.

On each request, the bridge reads the discovery record and verifies the
`openpencil-mcp` identity and matching instance token before forwarding to
`127.0.0.1`. It rejects stale records, legacy REST endpoints, and unrelated
listeners. It does not automatically start/stop the editor or retry writes.
An editor must be reachable during tool discovery; after starting a missing
editor, reconnect the plugin or begin a new chat.

For intentional ports without a live record, set `OPENPENCIL_MCP_PORT` in the
MCP process environment or add `--port PORT` to the server args. The endpoint
still must identify as OpenPencil. Do not commit machine-specific settings.

Existing direct `mcp_servers.openpencil` configuration may show a duplicate tool
catalog alongside this plugin. Test the plugin connection first, then remove
the old direct entry if you choose to migrate; installation does not remove it.

## Development and validation

```sh
npm run check
npm test
npm run smoke -- --binary /path/to/openpencil-desktop
```

The smoke runner launches a separate file-backed Rust HTTP host on a temporary
port. It uses the real stdio bridge to initialize, discover tools, create a frame,
read its content, inspect layout/lint, render a native PNG, save, and reopen.
Outputs go to ignored `artifacts/smoke-*` directories. It terminates only its own
processes and never edits the live canvas. CI tests the bridge on Linux, macOS,
and Windows with Node.js 22/24; a Rust host is required for the smoke test.

After edits, reinstall with `codex plugin add openpencil@zseven-openpencil` and
restart/reconnect to refresh the cached package.

## Package layout

```text
.agents/plugins/marketplace.json
plugins/openpencil/
  plugin.json
  mcp.json
  scripts/{mcp-bridge,transport}.mjs
  skills/{openpencil-setup,openpencil-design}/
scripts/{check-package,smoke}.mjs
tests/transport.test.mjs
```

The portable Agent Plugins manifest and `${PLUGIN_ROOT}` stdio launch follow
[OpenAI's packaging guide](https://developers.openai.com/plugins/build/plugins)
and [local MCP guide](https://developers.openai.com/plugins/deploy/desktop-only).

MIT licensed. The node/layout reference is adapted from OpenPencil's bundled
skill; see [NOTICE](NOTICE). This project is maintained by ZSeven-W and is not
an OpenAI-authored plugin.
