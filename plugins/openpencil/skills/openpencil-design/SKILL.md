---
name: openpencil-design
description: Create or edit editable .op UI designs with the Codex OpenPencil plugin, including layout inspection, PNG previews, and verified saves. Use for OpenPencil canvas work, not generic frontend implementation.
---

# Design with OpenPencil

Use the connected Rust MCP tools as the source of truth. Start with
`get_editor_state` and read the relevant nodes. Preserve existing document
content and use the user's chosen file, page, selection, and reference.
For connection failures, see [setup](../openpencil-setup/SKILL.md).

For a requested interactive conversation canvas, call `open_canvas` with the
chosen existing file or without a path for a new document. Verify `canvas_status`
and `get_editor_state`. All native tools then edit that managed canvas. Show the
UI resource or local panel URL. Do not open a new managed document just to inspect
the user's existing desktop selection.

## Establish the output

For a new design, resolve **one page or multiple pages** explicitly if the brief
does not establish it; continue inspecting references while awaiting the answer.
Do not silently choose three pages. Distinguish document pages from top-level
frames/boards. Establish viewport and content goals from the brief. Preserve
provided copy; do not reduce real content to fit a decorative mockup.

Load only the relevant connected design guidelines/style guides/UI kits.
Use [node and layout reference](references/node-schema.md) for field conventions;
the live tool schemas and guidelines take precedence over this bundled snapshot.
Reuse the document's variables, components, and style before inventing new ones.

## Build and edit

- Create fresh UI trees using `batch_design.script`: sandboxed JavaScript with
  `I(parent, node)` and `K(kitRef, parent, overrides)`, helpers, arrays, and loops.
  Build section by section; keep each batch at most 25 recorded operations.
  Reuse returned IDs, not assumed ID sequences.
- Use `batch_design.operations` for editing existing nodes with `U/C/R/M/D/G`.
  Do not mix creation and edits in script, and do not use `I()` in operations.
  Prefer native UI kits (`list_ui_kits`) for standard controls.
- The batch is transactional. When it returns errors, repair the whole failing
  batch before resending. After a transport timeout, inspect the canvas first:
  a write may already have applied. Never automatically retry a mutation.
- Use horizontal/vertical layout, padding, gap, and container sizing deliberately.
  For repeated cards in a row, use consistent `fill_container` widths.
  Absolute x/y coordinates on children do not replace a proper flow layout.
- Use `design_refine` on the affected root when appropriate, then inspect the
  returned changes. A successful refine is not visual acceptance.

## Inspect and deliver

1. Inspect `snapshot_layout` and run `lint_document` on the affected subtree.
   Address clipping, overlap, unreadable text, and missing content.
2. Render affected roots with `get_screenshot` and actually view the image.
   Check copy, hierarchy, spacing, colors, and reference fidelity. If rendering
   is unavailable, report that limit rather than claiming a visual pass.
3. For managed interactive persistence, the panel Save button flushes pending
   browser edits. `canvas_save` and intercepted `save_document` save the daemon's
   current snapshot; verify pending edits have synced before calling them. Save
   As requires a new path; source conflicts stop saves and retain recovery drafts.
   For an existing desktop editor, call `save_document` with the intended absolute
   `.op` path. Read/reopen the saved file to verify page count and key nodes.
   Avoid overwriting unrelated files or changing the active canvas just to test.
4. Return clickable absolute file links and local image previews where available.
   Distinguish changes on canvas, saved artifacts, visual QA, and publication.
   Saving a design does not authorize publishing or submitting it externally.

Use the managed panel, native editor or browser editor for interactive editing. Do not describe
a PNG preview as an embedded interactive canvas. Export to code only when the
user asks, using the live server's supported frameworks.
