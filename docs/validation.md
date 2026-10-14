# Interactive canvas validation — 2026-10-15

Validated v0.2.0 on macOS with the complete Rust 0.8.5 runtime. The main Rust
repository and the user's existing desktop document were not modified.

## Actual interactive editing

The local panel was opened in the user's existing authenticated Chrome profile.
The complete Rust editor visibly rendered the fixture, layers, toolbar and zoom.

- A keyboard move changed the selected frame from x=80 to x=82; native MCP
  `batch_get` read that same edit from the managed daemon.
- `update_node` changed the headline through the packaged stdio connection; the
  interactive canvas immediately displayed the updated text.
- UI Save flushed its browser snapshot and displayed “已保存”. File readback
  retained both x=82 and the agent-edited headline.
- UI Save As created a different `.op` file and updated the displayed source path.
- A new independent Rust session reopened that saved file and verified both edits
  and the active page. The automatic canvas smoke also saved and reopened its file.
- A real panel screenshot and source files are retained only in ignored local
  `artifacts/canvas-*` output. They are not bundled example user documents.

This validation found and repaired a save mismatch between disk snapshots
(`editorMeta`, compact image tables) and runtime JSON. A regression checks that
normalization accepts equivalent images while still rejecting edited text,
changed active pages and changes hidden in free-form state.

## Native Codex protocol and installation

- `codex plugin add openpencil@zseven-openpencil --json` installed v0.2.0.
- Native `plugin/read` and `mcpServerStatus/list` loaded the cached plugin and
  discovered 183 tools (179 existing desktop tools plus four canvas controls).
- Native `mcpServer/resource/read` returned `text/html;profile=mcp-app` and the
  canvas tool retained both `ui.resourceUri` and its `openai/ui` thread entrypoint.
- Native `mcpServer/tool/call` opened the saved file with `open_canvas`. Subsequent
  `batch_get` and `canvas_status` read that managed document through the same client.
- This used an ephemeral app-server test context, with zero model turns and no
  user-visible new task. Only owned test processes were stopped.
- Direct managed-runtime tool discovery returned 176 tools (172 native tools in
  the configured runtime plus four controls). Codex's status inventory remained
  cached at 183 after its list-changed notification. Runtime tool availability
  follows the configured release; the UI and core edit/read/save routing were verified.

The current Computer Use tool rejects access to the Codex app. Consequently,
**native desktop embedded presentation remains unverified**. Resource registration
and successful browser interaction do not claim that additional UI check passed.
Reconnect the upgraded plugin or open a new chat to load its entrypoint.

## Checks

`npm run check` and all 21 tests passed. Coverage includes existing discovery and
transport safeguards, external-save conflict protection, non-overwriting Save As,
runtime validation, shared-daemon routing, private lifecycle tokens, ordered
no-retry controls, narrow panel origins, offline resource discovery, disk/live
snapshot equivalence and the executable MCP Apps handshake/context bridge.

Both isolated Rust smoke paths passed: existing-editor create/read/layout/lint/
PNG/save/reopen and managed-canvas native edit/save/new-session reopen. Updated
existing-editor discovery returned 183 tools and lint reported zero issues.
Cross-platform CI runs are available in [GitHub Actions](https://github.com/ZSeven-W/codex-openpencil/actions).
Clean-machine runtime acquisition and public directory publication remain separate.

---

# Initial validation — 2026-10-14

Validated locally with Codex CLI 0.162.0, Node.js 26.7.0, and the Rust
OpenPencil 0.8.5 host on macOS.

## Package and native Codex loading

- `npm run check`: identity/version, relative launch paths, skill references,
  package license, machine-path exclusion, and file-size checks passed.
- Both skills passed the Skill Creator frontmatter validator.
- `codex plugin marketplace add` accepted the repository marketplace.
- `codex plugin add openpencil@zseven-openpencil --json` installed version 0.1.0.
- `codex plugin list` reported the plugin installed and enabled.
- Native app-server `plugin/read` resolved the portable manifest, interface,
  onboarding skill, both namespaced skills, and bundled MCP server.
- Native `skills/list` loaded both skills from the installed plugin cache.
- Native `mcpServerStatus/list` connected the plugin's `codex_openpencil` stdio
  server and discovered 179 Rust tools.

## Protocol regression tests

All 14 tests passed: port validation; token-bound discovery; stale-record refusal;
missing/legacy records; foreign listener rejection; argument, Unicode and image
passthrough; notifications; native errors; single-send writes; timeout handling;
redirect/malformed response rejection; size bounds; invalid requests; and a real
stdio child process receiving split input and multiple messages.

## Isolated Rust smoke test

The smoke runner started its own file-backed HTTP host, then exercised the
packaged stdio bridge through initialize, notification, tools discovery, design
creation, readback, layout inspection, lint, native PNG rendering, save, and reopen.

- Server version: 0.8.5; 179 tools discovered.
- The saved document retained the headline and description after reopening.
- Lint: zero issues.
- PNG: 480 × 320; 12,210 bytes. The image was visually inspected for text and shape
  placement, with no clipping or overlap observed.
- PNG SHA-256: `a4ca5f0d66c3dd72479ed28e6ae445b69ce6a4dcdeb4e9d60765c7a8fcc5d3ae`.
- The smoke run terminated only its own processes and did not target the live canvas.

Local artifacts are intentionally ignored by Git. Run the smoke command to
reproduce them on a machine with a compatible Rust host.

## Cross-platform CI

[CI run #2](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38529138631)
passed all six jobs for Node.js 22/24 on Linux, macOS and Windows at commit
`14d27a5`. Each job ran package checks and all 14 protocol tests. Windows exposed
a CRLF compatibility issue in the skill validator; the fix also passed an
isolated checkout converted entirely to CRLF before it was pushed.

These results do not assert a completed desktop UI workflow.
Clean-machine installation, absent-runtime onboarding, embedded interactive
canvas, and public-directory submission remain separate validation/release work.
