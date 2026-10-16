# Desktop plugin startup — 2026-10-16

v0.3.2 fixes a reproduced desktop-only startup failure. The plugin was installed
and enabled, while the desktop log repeatedly reported `No such file or directory`
for `codex_openpencil`. An isolated profile using the same bundled Codex app-server
(`0.162.0-alpha.17.2`) reproduced that error. A contained diagnostic launcher
confirmed its child PATH could not find `node`, despite a working terminal.
The separately configured native `openpencil` HTTP server is not the same server;
no namespace collision was established, and its configuration was preserved.

The executable launcher now uses the Node executable atomically registered by
setup outside the package, with version validation and local fallbacks. Setup
also checks the actual Codex plugin loader before reporting success. The same
isolated bundled host now loads the canvas controls successfully. The user's
local v0.3.2 installation passed runtime edit/save/reopen and a fresh Codex host
check, exposing 186 tools including `open_canvas`, `canvas_status`,
`canvas_selection` and `canvas_save`. All 69 Node tests and package checks passed.
The launcher regression uses a restricted PATH and a private executable path
containing spaces and an ampersand. Local logs: `artifacts/host-activation/`,
`artifacts/v0.3.2-setup.log`, `artifacts/v0.3.2-tests.log`.

The [six-platform fresh install matrix](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38886578454)
passed with the public Codex CLI, including actual host loading after setup,
installed-bridge native edit/save/reopen, terminal PNG/save flow and repeat setup.
This also verifies Windows resolves the `.cmd` launcher for the portable command.
The [Node 22/24 matrix](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38886577603)
passed all six jobs, including the restricted-PATH launcher regression. A final
host-check guard also requires the expected plugin identity, so a manually
configured server with the same name cannot be mistaken for a loaded plugin;
its negative cases and the user's actual host check passed locally.

This proves a new host connection can load the installed plugin. The current
chat's catalog still lacks those controls. Native computer-use access to the
Codex application was rejected by the tool, so no desktop UI reconnect, embedded
canvas presentation, or actual shortcut message delivery is claimed here.
The existing user design was not modified.

# Chat-first selection edits — 2026-10-16

v0.3.1 makes the current Codex chat the default edit input. The standalone panel
shows the current selection and a chat guide, with no prompt form or copy dialog.
A host advertising `message.text` exposes an optional collapsed shortcut. Its
action is “修改选中内容”. Drafts survive failed sends, capability revocation and
selection changes; uncertain deliveries direct users to check chat before retrying.

Submitted is established by the host acknowledgement. Working and completed
require a matching agent progress report. The model-only control rejects unknown
or finished requests and refuses completion without a document change and a
guarded save of the current version. The design workflow also requires inspecting
the screenshot and verifying the saved design before reporting completion. The
panel cannot report its own completion, and unrelated changes cannot establish it.

Package checks and all 67 Node tests passed locally. The isolated published macOS
ARM64 runtime passed selected-subtree edits, a later selection change without
retargeting, nested and multiple selections, empty/stale rejection, progress/save
guards, native PNG capture, guarded save and reopen. Native PNGs were inspected:
the selected card became navy with white text while its sibling stayed unchanged.
Local report: `artifacts/selection-chat-first/run-p0Aglt/report.json`.

In the existing Chrome profile, an isolated panel visibly showed the compact chat
guide without the old copy button. A real pointer click selected `Accent`; both
the panel label and `canvas_selection` resolved `canvas-card`. A native edit to
that exact node, guarded save, saved readback and independent reopen passed.
Local report: `artifacts/canvas-24dHYC/browser-report.json`. Browser screenshots
were inspected for the default layout and selection guide. Browser extension
automation subsequently timed out, so no live host shortcut/delivery result is
claimed. Embedded Codex presentation and actual `ui/message` follow-up delivery
remain unverified; the 67 tests exercise those protocol boundaries with a
deterministic harness.

# One-prompt installation — 2026-10-16

The repository is public. v0.3.0 adds a complete runtime installer, an agent-facing
`INSTALL.md`, verified setup before plugin registration, and a persistent terminal
canvas for the installation chat before newly installed MCP tools reconnect.
Managed upgrades preserve custom runtime choices and retain the previous
configuration when acquiring a new release fails.

From empty runtime and Codex configuration directories, setup downloaded the
published macOS ARM64 runtime without an override, verified it, completed the
isolated edit/save/reopen check, and installed the actual cached v0.3.0 plugin.
That installed bridge exposed 178 tools and passed a separate edit/save/reopen
smoke. Both pipe and real-PTY terminal fallbacks passed long Chinese input,
inspectable PNG preview and saved readback. Repeating setup reused the verified
runtime and registered marketplace successfully. The installer also creates a
requested, previously absent `CODEX_HOME` before invoking Codex CLI.
Local logs are retained at `artifacts/fresh-published-setup-2.log` and
`artifacts/fresh-published-exercise.log`. Package checks and all 60 Node tests
passed; all six published asset sizes and GitHub SHA-256 digests match the
bundled runtime catalog.

The [fresh public install matrix](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38785451951)
passed on all six native runners. Each starts with empty runtime and Codex state,
installs the public Codex CLI, downloads the public runtime asset, verifies a real
native edit/save/reopen, exercises the actual installed plugin bridge and terminal
PNG/save flow, and repeats setup. The four POSIX runners also pass the real-PTY
long-input regression. System prerequisites come from the runner or the explicit
Linux library step; these are empty application states, not bare OS images.
The [Node 22/24 matrix](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38785444832)
also passes package checks and all 60 tests on macOS, Windows and Linux.

Separately, an unauthenticated HTTPS clone/fetch of the public repository was
updated to the published main commit with Git's credential helper disabled.
Setup, the installed bridge and the real-PTY fallback passed from that checkout
with a new Codex profile, reusing the independently verified runtime cache.

The runtime pins the clean public OpenPencil revision
`40902a3fa595a78b6f97e9409875cef823b0e191` (0.8.5). The
[runtime build](https://github.com/ZSeven-W/codex-openpencil/actions/runs/38778552317)
passed native edit/save/reopen smoke tests on macOS, Windows and Linux for both
ARM64 and x64. The macOS ARM64 archive was independently downloaded and its
archive hash, file manifest and native mobile behavior were checked locally.
Phone widths 375, 390 and 430 retain exactly one complete canonical status bar
through create, edit, save and reopen; a 1440px desktop has none.

A first-use single-page task app was created through the persistent terminal,
visually inspected, saved and reopened in a separate native session. It has one
root, 58 editable nodes and one complete status bar. The before/reopened PNGs
have the same SHA-256:
`9b90faad85e5b64caecc3c10743e643582821edaf10e7bd6729b7f53a700e559`.
The ignored local report is `artifacts/first-use-design-report.json`.
Layout and lint were inspected; nonblocking warnings for tonal card surfaces and
mixed heading/progress geometry were reviewed against the actual PNG.

This test exposed canonical PTY input truncating long JSON batches on macOS.
The terminal entry point now uses raw input and restores the terminal mode on
exit. The regression sends a long Chinese update through a real POSIX PTY,
checks the saved text and inspectable PNG, then closes the owned session.
The PTY test's relay uses Python 3's standard library only; production setup and
canvas remain dependency-free Node.js. Ctrl-C shutdown was also checked locally.

Actual embedded Codex host UI rendering and automatic `ui/message` follow-up
delivery remain separate from these native/terminal tests. A newly installed
plugin may need reconnect or a new chat; the first-chat terminal fallback does
not claim that the MCP tools have already loaded. This public GitHub release has
not been submitted to OpenAI's public plugin directory.

# Selection warning recovery — 2026-10-15

Selection/page changes during a poll now carry a typed read error instead of
being shown as a lost canvas connection. The prompt bar temporarily disables its
target and shows a syncing state; the next stable read restores the selection.
Failed reads also clear the host's stale selection context. Preparation warnings
clear after a valid selection read, while save failures and sync conflicts remain
visible. Error banners have an accessible dismiss button; identical background
failures do not reopen a dismissed banner. Prompts remain intact and no write is
automatically replayed.

`npm run check`, all 45 Node tests, and `git diff --check` passed. New regressions
exercise a transition followed by a stable selection on another page, legacy
untyped bridge responses, typed errors over HTTP/MCP, connection recovery, save
and sync warning retention, draft retention, and dismissal across repeated polls.
The isolated Rust selection/edit/save/reopen smoke passed again; its report is
`artifacts/selection-recovery-20261015/run-iYclf1/report.json`. This validates the
native edit flow separately from the simulated UI recovery tests. Live browser
recovery verification was not completed: native Chrome actions twice yielded to
concurrent user input. The owned test server was closed; the user's live canvas
was not reloaded.

# Selection prompt editing — 2026-10-15

The managed canvas now exposes typed selection context (`canvas_selection`) and
a prompt bar. A submitted request fixes its file/recovery path, page ID, document
version and node IDs. Read-only preparation rejects empty/changed selections and
unsynced browser snapshots. It never applies an edit itself. The design skill
directs Codex to read the captured nodes, modify their subtrees and preview them.

`npm run check` and all 39 Node tests passed. Regression coverage includes nested
and multi-selection, page changes, deleted nodes, empty/stale selection rejection,
snapshot matching, origin/source checks, duplicate message suppression, host
rejection/timeout draft retention, clipboard denial, opaque sandbox origins,
selection context deduplication/clearing, document-image caching and recovery
checkpoints under frequent selection polling.

The isolated Rust smoke passed single-card/descendant edits, a nested title,
multi-selected titles, empty/stale rejection, unchanged siblings, and save/reopen
document equality. Its report and PNGs are retained locally in
`artifacts/selection-edit-20261015/run-OX4XTw/`. The reopened PNG was inspected:
the selected card is blue with white text, the adjacent card retains its styling,
and both headings remain readable. This smoke selects through the native MCP
selection tool; browser gestures were verified separately below.

Actual browser testing used the existing authenticated Chrome profile through
native Computer Use, because its extension connection returned a fetch error.
In a separate fixture at `artifacts/canvas-eEi7hk/design.op`:

- Clicking the Headline layer displayed “已选 1 个元素 · Headline”.
- Entering a prompt enabled “复制修改请求”; clicking it flushed the browser snapshot
  and displayed successful copy feedback while preserving the draft.
- Pasting the copied text back into the fixture's input verified the exact
  `canvas-headline` ID, active page `0`, source/recovery paths and user prompt.
- The agent applied the requested headline edit through that fixture's managed
  controller. The browser visibly showed the new headline and retained the other
  content. UI Save displayed “已保存”; saved readback and a new Rust session both
  retained the edit. Only the test tab and owned test processes were closed.

Direct `ui/message` delivery is capability-gated and regression-tested against a
simulated MCP Apps host. It has not been verified as a live embedded Codex turn.
Standalone browser panels intentionally offer copy/paste; no automatic chat
submission or completed edit is claimed when a request is merely copied.
The bridge follows [OpenAI's MCP Apps UI guidance](https://developers.openai.com/plugins/build/chatgpt-ui)
and [the MCP Apps message/context contract](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts).

# Mobile status bar validation — 2026-10-15

The previously packaged runtime at `442c484` does not contain the mobile
normalization change `cbcfd14`. An isolated managed-canvas smoke reproduced the missing system
chrome: new phone frames had no status bar after creation, a subsequent edit, or
save and reopen. The test loads mobile guidelines and creates only the root;
it never authors replacement status-bar nodes.

The replacement full runtime was built locally from `baf279c07`, including
working-tree changes and a minimal host `--config-root` compatibility patch.
The same smoke passed with canonical `Time` and `Levels` containers, one clock,
cellular and Wi-Fi vector paths, and a complete battery subtree.

| Viewport | Previous runtime: create / edit / reopen | Replacement runtime: create / edit / reopen |
| --- | --- | --- |
| Phone 375 × 812 | 0 / 0 / 0 status bars — FAIL | 1 / 1 / 1 — PASS |
| Phone 390 × 844 | 0 / 0 / 0 status bars — FAIL | 1 / 1 / 1 — PASS |
| Phone 430 × 932 | 0 / 0 / 0 status bars — FAIL | 1 / 1 / 1 — PASS |
| Desktop 1440 × 900 | 0 / 0 / 0 status bars — PASS | 0 / 0 / 0 — PASS |

Each case used its own managed session and run-local state, then a new independent
session for reopening. Readbacks, PNGs, saved files, and per-stage checks are
retained in ignored local artifacts. The replacement report is
`artifacts/mobile-status-20261015/new-runtime/run-WTgKN2/report.json`.
`scripts/mobile-smoke.mjs` takes explicit absolute `--runtime` and `--output`
paths, never targets a live editor, and never retries a mutation.

The generic managed-canvas smoke also passed, as did package checks, all 27 Node
tests, 29 host argument tests, and the WASM gate check.

An existing tall phone design was repaired through its owning canvas controller
and saved, preserving its 97 existing nodes. Its original rendered height of 1433px
was extended by the canonical 62px status bar to an explicit 1495px height;
this avoids the mobile normalizer treating `fit_content` as an 812px viewport
and clipping the design. This saved migration is separate from the isolated
fresh-document smoke results above. A new session on the replacement runtime
reopened the saved file with an identical document snapshot and one status bar.
Repeating the same root-height update left the normalized document unchanged.
The reopened 393 × 1495 PNG matched the independent preview byte-for-byte, with
the bottom navigation retained at y=1417, height=78, and no content clipping.

This is local runtime validation, not a formal release. Newly created canvases
use the replacement runtime; already-running daemons retain their original
runtime until their sessions are reopened. No hot update of all existing
sessions is claimed.

# Theme synchronization fix — 2026-10-15

The panel previously forced `theme=light` and fixed light CSS, while the MCP App
wrapper ignored host theme context. The panel now follows browser media changes;
the MCP App passes initial and updated host themes through to the same panel.
Both routes update the Rust editor with its existing `op-bridge/theme` message,
without navigating the iframe or changing document state.

The installed Codex 26.1007.30912 code maps the app's resolved theme to IAB
`prefers-color-scheme` emulation at page attachment and on theme changes. This is
read-only installed-source evidence, not a live Codex appearance toggle.

`npm run check` and all 27 tests pass. Six theme regressions execute the shipped
UI scripts and cover dark initial load, both switch directions, host priority,
media fallback, startup handshake, origin/source checks, no iframe reload, and
preservation of dirty revision state. The pre-existing save/context tests pass.
The UI tests simulate host/browser events; live embedded visual acceptance remains
separate because Computer Use access to this Codex surface is restricted.

Protocol references: [OpenAI UI context](https://developers.openai.com/plugins/reference)
and [MCP Apps host context notifications](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).

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
