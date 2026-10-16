# Architecture and scope

```text
Codex plugin host -> Node.js stdio bridge -> one serialized controller
  before open_canvas -> instance-verified existing Rust MCP editor
  after open_canvas  -> owned managed Rust daemon -> shared document

MCP Apps resource -> capability-protected loopback panel -> full Rust WASM editor
                       Save/Save As/checkpoint              live sync
                              |                              |
                              +------ managed daemon --------+
```

The Rust engine owns native design tools, layouts, rendering, undo and live sync.
The plugin adds `open_canvas`, `canvas_status`, `canvas_selection`, `canvas_edit_status`,
`canvas_save` and app-only `canvas_prepare_edit` / `canvas_checkpoint`. It reuses
the complete editable engine. Native images and JSON-RPC errors pass through.

## Process and document ownership

Reading the UI resource starts only a lightweight panel server; it never switches
the active document. Opening a canvas verifies every runtime manifest SHA-256
entry, platform and release. If configuration is absent, the pinned platform
archive downloads on demand through the existing HTTPS proxy settings. The
installer bounds download and extraction sizes, rejects links/traversal, checks
archive and file hashes, and activates a complete runtime atomically. Existing
valid custom runtimes remain selected; invalid configurations fail explicitly.
The daemon launches with `--serve-web --managed
--port 0` on a recovery copy, its own supervisor lease and settings root. The
bounded handshake must match the bundle version. Discovery does not download or
start the Rust editor.

While managed, all native tools route to the owned daemon; browser edits and
Codex therefore share a document. `save_document` uses the guarded save. One
conversation cannot silently replace its canvas with another file. On EOF or
shutdown, the bridge checkpoints and stops only its own child. Recovery drafts
persist; reopen them in a new chat after a stopped session.

Before opening a canvas, desktop discovery verifies the `openpencil-mcp` marker
and live instance token for each request. Explicit loopback ports verify the
marker. Stale records, redirects, legacy REST and unrelated listeners are rejected.
No failed mutation is replayed automatically.

## UI and persistence contract

`ui://openpencil/canvas/v0.3.4.html` is `text/html;profile=mcp-app`. `open_canvas`
advertises `_meta.ui.resourceUri` and the `openai/ui` thread entrypoint. The wrapper
negotiates `ui/initialize`, handles tool results and sends selection context when
supported. Its CSP permits only this panel's exact origin. The panel checks an
opaque 256-bit URL capability, Host and Origin, and accepts only five panel controls.
The iframe lifecycle token stays in private UI state, outside model-facing text.
Editor messages require the exact frame source and origin. No global MCP config
or anonymous browser is created.

Plugin chrome mirrors `Theme::light()` and `Theme::dark()` in the pinned Rust
runtime's `crates/op-editor-ui/src/theme.rs`: neutral surfaces and borders, blue
interactive accents, and the editor's success/destructive colors. Review these
values in `ui/panel.css` and the loading wrapper whenever the runtime catalog
changes. The host theme selects the palette; design document colors are separate.

The default edit input is the current Codex chat. The panel displays selection
and a chat guide. Only a host advertising `message.text` exposes the collapsed
canvas shortcut; unsupported or standalone hosts never display a copy workflow.
The shortcut flushes and freezes its file/page/node scope before `ui/message`.
Delivery acknowledgements establish submission only. A bounded session registry
tracks request IDs, and the model-only `canvas_edit_status` control reports
working/completed/failed. The HTTP panel cannot report its own progress. Completion
requires a changed document and a successful guarded save of the current version;
the design skill additionally requires visual inspection and saved-file verification.
Polling matches the exact request ID and never infers completion from other edits.

The panel flushes the editor snapshot gate before Save. The controller compares
that disk snapshot to the daemon's document, resolving only schema-owned image
references and checking page/geometry metadata. Text, variables and free-form
state are never normalized away. Stale snapshots stop the save. Saved UI snapshots
retain compact images and editor metadata; native saves and recovery checkpoints
preserve daemon page/geometry metadata.

Existing sources are SHA-256 checked before staging and again before atomic
replacement. Save As creates exclusively and refuses an existing destination.
A later edit keeps the UI dirty when an earlier save completes. Source conflicts
preserve external content and recovery drafts. These checks are not a distributed
lock against an external write between the final check and rename. Model-triggered
Save uses the daemon snapshot; use the UI Save button to explicitly flush pending
interactive edits first.

Stdio and panel controls share an ordered queue. Reads/requests are bounded at
32 MiB. Identity probes have a 3-second deadline, normal MCP requests 120 seconds,
startup 20 seconds and UI saves 15 seconds. A timeout never retries an edit.

## Ownership and validation boundaries

The portable MCP entry uses an executable launcher (with a Windows `.cmd`
counterpart). Setup atomically records `process.execPath` in the private
`~/.codex-openpencil/node-path` file. The launcher validates Node 22+ before
starting the bridge, retaining literal paths with spaces and shell characters.
It does not rely on desktop login-shell PATH import or change global settings.
After registration, setup starts `codex app-server` and checks
`mcpServerStatus/list` for the plugin's canvas tools. This uses the actual plugin
manifest/cache/launcher path, opens no chat and performs no design mutation.
It remains distinct from the loaded tools and visible UI in an existing chat.

- `ZSeven-W/openpencil`: Rust engine, schemas, renderer and persistence.
- `ZSeven-W/codex-openpencil`: plugin, session adapter, UI and workflows.
- `ZSeven-W/dsh-openpencil`: DSH integration and compatible runtime packaging.

Native tool/resource loading, browser interaction and Codex desktop MCP Apps
presentation are separate checks. Consult [validation](validation.md). A browser
panel alone does not prove embedded presentation. Automatic runtime acquisition and
fresh application-state onboarding are covered by the published six-platform
checks; system prerequisites are documented in [INSTALL.md](../INSTALL.md).
Embedded host presentation and public directory submission remain separate work;
there are no install hooks.

The UI follows [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)
and [OpenAI UI extensions](https://developers.openai.com/plugins/build/chatgpt-ui).
Repo marketplace distribution does not imply public directory approval.
