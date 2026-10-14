# Architecture and scope

```text
Codex plugin host
  -> bundled Node.js stdio bridge
  -> discovery record + verified JSON-RPC ping
  -> loopback Rust OpenPencil HTTP MCP
  -> native editor state / selected file-backed host
```

The plugin does not implement design tools itself. Tool discovery, schemas,
calls, errors, and image blocks originate from the Rust server. The bridge only
adapts newline-delimited stdio messages to the current Rust JSON HTTP transport.
It intentionally does not support the retired TypeScript REST transport or an
arbitrary remote MCP endpoint.

Discovery is performed for every message. Default discovery verifies both the
server marker and the live instance token. Explicit local ports verify the
server marker and are useful for isolated headless servers. No token is sent
in diagnostic output. Redirects and proxy routing are not used.

Messages are serialized to preserve edit order. Input and response sizes are
bounded at 32 MiB. Identity probes have a 3-second deadline; requests have a
120-second deadline. No failed request is replayed automatically. A disconnect
or timeout is ambiguous for a mutation; inspect state before deciding to repeat.
Server JSON-RPC errors and MCP image blocks are passed through unchanged.

The editor is a prerequisite. Starting it automatically would introduce process
ownership, download/install policy, and document-selection behavior, so the setup
skill handles that explicitly. Tool discovery needs a reachable server at chat
startup. This package uses no lifecycle hooks and makes no global MCP config
changes of its own.

## Host boundaries

- `ZSeven-W/openpencil`: Rust engine, tool schemas, rendering and `.op` persistence.
- `ZSeven-W/codex-openpencil`: plugin distribution, local bridge and Codex workflows.
- `ZSeven-W/dsh-openpencil`: DSH cards, interactive previews and managed runtimes.

## Follow-up work

1. Validate a clean desktop plugin install with Node/editor absent and present.
2. Assess Codex-supported MCP UI resources before implementing embedded previews.
   A browser panel or PNG alone is not the DSH interactive-canvas experience.
3. Package editor acquisition/launch only after choosing process ownership and
   update behavior. Keep that independent of design tool implementation.
4. Public directory submission is a separate release action. Local stdio MCP
   submission currently requires an allowlisted OpenAI partner, as documented in
   [desktop-only plugins](https://developers.openai.com/plugins/deploy/desktop-only).

Repo/CLI marketplace distribution does not imply public directory approval.
