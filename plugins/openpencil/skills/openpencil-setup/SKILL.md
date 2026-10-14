---
name: openpencil-setup
description: Connect and diagnose the local Rust OpenPencil editor for the Codex OpenPencil plugin. Use for initial setup, missing tools, or a disconnected local canvas.
---

# Connect OpenPencil

The plugin bridges MCP stdio to the running Rust editor's loopback `/mcp`
endpoint. It does not bundle the editor or automatically launch a process.

1. Try `get_editor_state` through this plugin's OpenPencil tools. A response proves
   the actual connection; an installed package alone does not.
2. If unavailable, run `node scripts/mcp-bridge.mjs --doctor` from the installed
   plugin directory (two levels above this file). The doctor reads the editor's
   `~/.openpencil/.op-mcp-port` and verifies the instance identity. Node.js 22+
   must be available in the local executor's PATH.
3. For a missing editor, use the official [OpenPencil installation instructions](https://github.com/ZSeven-W/openpencil).
   When launch is within the user's request, run `op start`, then enable MCP
   in the editor's Agent Settings. An old `op` binary may not discover the current
   Rust editor; trust the bridge doctor and editor state over that binary's status.
4. For an intentional headless/web endpoint without a live discovery record,
   set `OPENPENCIL_MCP_PORT` in the MCP process environment or append
   `--port PORT` to the bundled server args. Only local loopback ports are accepted.
   Do not guess a port or rewrite unrelated Codex server configuration.
5. If MCP discovery failed at session startup, reconnect/reload the plugin or
   start a new chat after the editor is reachable. Verify `get_editor_state`
   again and report the active document/page before editing.

A stale identity error requires reopening the intended editor or fixing its MCP
setting. The bridge refuses to silently fall back to a different canvas. Keep
discovery tokens out of chat, logs, committed files, and reports.

This version offers native MCP tools and PNG previews in chat. It does not
implement the DSH embedded interactive canvas or managed-editor tool card.
