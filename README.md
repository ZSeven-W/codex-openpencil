# Codex OpenPencil

Design editable vector UI with Codex and the local Rust [OpenPencil](https://github.com/ZSeven-W/openpencil) engine.

[中文说明](README.zh.md) · [Architecture](docs/architecture.md) · [Validation](docs/validation.md)

v0.2.0 adds the complete interactive Rust canvas, an MCP Apps UI resource and
Codex thread entrypoint. Interactive edits and Codex tools share one document.
The plugin has no npm runtime dependencies and requires Node.js 22+ and a recent
Codex client with plugin marketplace support.

## Install

```sh
git clone git@github.com:ZSeven-W/codex-openpencil.git
cd codex-openpencil
codex plugin marketplace add .
codex plugin add openpencil@zseven-openpencil
```

The marketplace can also be added directly with
`codex plugin marketplace add ZSeven-W/codex-openpencil` if you have repository
access. Clients without `plugin add` can use the desktop Plugins Directory.
Reconnect the plugin or open a new chat to load its installed skills and tools.

## Interactive canvas

Configure an existing complete Rust editor runtime:

```sh
npm run configure-runtime -- /absolute/path/to/runtime
```

It must contain `openpencil-runtime.json`, `bin/op-host-web-server` (with `.exe`
on Windows), the matching editable WASM bundle and CanvasKit assets. The DSH
plugin's complete runtime package can be reused; DSH itself is not required.
The public read-only web SDK or a desktop binary alone is insufficient. Every
manifest hash, platform and release is verified before launching. Runtime
acquisition is not automated. The location is saved privately in
`~/.codex-openpencil/runtime.json`, never in the plugin. Alternatively set
`OPENPENCIL_EDITOR_RUNTIME_DIR` in the MCP process environment.

After reconnecting or opening a new chat, ask:

> Open an interactive OpenPencil canvas for this conversation.

`open_canvas` starts a separate managed Rust editor. It supports layers, selection,
pan/zoom, text and shape editing. Codex tools and interactive edits target that
same document. Save and Save As write `.op` files; source conflicts stop a save,
and Save As refuses an existing destination. Recovery drafts survive under
`~/.codex-openpencil/sessions/`. Opening an existing file copies it into the session.
A conversation keeps one canvas; use another chat for a different document.

The tool advertises an MCP Apps resource and a Codex thread entrypoint. Hosts
without MCP Apps UI can open its returned loopback `panelUrl`. The URL is temporary:
closing the plugin ends only its owned Rust process. Native resource loading,
browser interaction and desktop embedded presentation are separate validation
steps; see [evidence and remaining checks](docs/validation.md).

The panel and Rust editor follow the host's light/dark appearance. MCP Apps use
the initial host context and live theme notifications; standalone browser panels
use `prefers-color-scheme` (Codex's in-app browser supplies its resolved app theme).
Theme changes update the existing editor without reloading or saving the document.

Select one or more elements, then tell Codex what to change (for example, “make
the selected card dark and enlarge its heading”). `canvas_selection` resolves
the exact active-page node IDs; the design workflow confines edits to those
subtrees. The panel also has a selection prompt bar. A host with MCP Apps text
message support can send it directly to the conversation. A standalone browser
copies a request for you to paste into the current Codex chat. The request freezes
the file, page and element IDs so a later selection change cannot redirect it.
Empty/stale selections stop submission; failed sends preserve the prompt.

Phone designs use the Rust runtime's standard status bar. A runtime can report
the same release version while coming from a branch without the mobile MCP fix;
verify behavior before adopting a runtime with the mobile smoke command below.
This isolated check creates phone screens, checks
that their system indicators appear once, then saves and reopens them. It also
checks that desktop frames do not gain a phone status bar.

## Existing desktop editor

Open Rust OpenPencil, enable MCP in Agent Settings, and run:

```sh
npm run doctor
# An intentional isolated endpoint:
npm run doctor -- --port 3100
```

Until `open_canvas` opens a managed session, the bridge reads
`~/.openpencil/.op-mcp-port` and verifies the server identity and matching instance
token before forwarding to loopback `/mcp`. It rejects stale records, unrelated
listeners and legacy REST endpoints. Once managed, all native tools route to the
owned daemon, including guarded `save_document`. Failed writes are never retried.

The canvas controls and UI resource remain discoverable with the desktop editor
offline. Reconnect after starting a missing desktop editor to refresh its native
catalog. Explicit local ports can use `OPENPENCIL_MCP_PORT` or `--port PORT`; do not
commit machine settings. Existing direct MCP configuration may expose duplicate
tools; installation does not remove unrelated configuration.

## Included workflows

- Native Rust tools for creating, inspecting, refining, rendering and saving UI.
- A complete editable canvas with managed routing, recovery and guarded saves.
- `openpencil-setup` for runtime/connection diagnostics, and `openpencil-design`
  for page-count choices, content preservation, layout/visual QA and saved readback.
- Native MCP image passthrough, a repo marketplace and protocol regressions.

The plugin is not listed in OpenAI's public Plugin Directory.

## Development

```sh
npm run check
npm test
npm run smoke -- --binary /path/to/openpencil-desktop
npm run canvas-smoke
npm run selection-smoke -- --runtime /absolute/path/to/runtime --output /absolute/evidence-dir
npm run mobile-smoke -- --runtime /absolute/path/to/runtime --output /absolute/evidence-dir
# Hold an isolated canvas open for interactive verification:
npm run canvas-smoke -- --hold
```

The smoke runners use isolated file-backed Rust hosts and ignored `artifacts/`
outputs. They terminate only their own processes and never edit the live canvas.
CI checks packaging and protocol behavior on Linux/macOS/Windows with Node.js
22/24. A complete compatible Rust runtime is needed for the canvas smoke.
After edits, reinstall with `codex plugin add openpencil@zseven-openpencil` and
reconnect to refresh the cached package.

The package lives in `plugins/openpencil/`: portable `plugin.json`, `mcp.json`,
Node bridge/session scripts, `ui/` assets and two skills. It follows
[OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins),
[UI extensions](https://developers.openai.com/plugins/build/chatgpt-ui) and
[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview).

MIT licensed; see [NOTICE](NOTICE). Maintained by ZSeven-W, not authored by OpenAI.
