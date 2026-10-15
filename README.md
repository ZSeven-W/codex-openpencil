# Codex OpenPencil

Design editable vector UI with Codex and the local Rust [OpenPencil](https://github.com/ZSeven-W/openpencil) engine.

[中文说明](README.zh.md) · [Architecture](docs/architecture.md) · [Validation](docs/validation.md)

v0.3.0 adds automatic runtime installation and a verified first-run setup.
The complete Rust editor, matching WASM, CanvasKit, fonts and templates download
for the current OS/CPU. No DSH, Rust compiler or separate desktop app is needed.
The plugin has no npm runtime dependencies; Node.js 22+, Git and a recent local
Codex client with plugin support are required.

## One-prompt install and first design

Give Codex this:

> Install and set up https://github.com/ZSeven-W/codex-openpencil following its INSTALL.md, open an editable canvas, and create a single-page mobile task app.

[INSTALL.md](INSTALL.md) guides the agent through prerequisites, public HTTPS
installation, runtime integrity checks, an isolated native edit/save/reopen,
and opening the real canvas. Newly installed tools may need a plugin reconnect;
the terminal canvas entry point lets the agent finish the design in the current
chat. This distinction is reported explicitly.

## Manual install

```sh
git clone https://github.com/ZSeven-W/codex-openpencil.git
cd codex-openpencil
npm run setup
```

Setup registers the persistent checkout and installs `openpencil@zseven-openpencil`.
First use also installs a missing runtime automatically. All six macOS/Windows/
Linux CPU builds are listed in [INSTALL.md](INSTALL.md#supported-runtime-builds).
Linux uses glibc and needs fontconfig/FreeType system libraries.

Existing valid custom runtimes are preserved. To select one explicitly:

```sh
npm run configure-runtime -- /absolute/path/to/runtime
```

Private runtime settings stay in `~/.codex-openpencil/runtime.json`. Neither
machine paths nor downloaded binaries are stored in the plugin package. Both
the archive SHA-256 and every manifest file are checked before use. A failed
download leaves no active partial runtime. Invalid existing configuration is
reported without silently changing the selected editor.

## Interactive canvas

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
