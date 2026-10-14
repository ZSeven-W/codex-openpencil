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
