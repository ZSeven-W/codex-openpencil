# Image acquisition

## Stock search is the default and fallback

Keep existing/user-provided images unless the task asks to replace them. For new
image slots, use `type: "image"`, explicit dimensions and a concrete English
`imageSearchQuery` describing subject, action and composition. Omit `imagePrompt`
when generation is not authorized. The presence of image intent in a node is not
user consent to spend quota.

After structural repair, reread current node IDs. Run the native `enrich_images`
with `root_ids` scoped to the requested roots or selected image nodes, then read
its `targets`, `resolved`, `failed` and `unresolved` counts. Never omit scope for a
selected-subtree edit: omission fills the whole active page. Check the live tool
schema; if this runtime lacks `root_ids`, do not broaden a partial edit to the page.

`enrich_images` is search-only (Openverse with Wikimedia fallback). A slot with
only `imagePrompt` is explicitly Generate and will be skipped. For an unresolved
slot covered by the user's search/default-fallback choice, set a concrete
`imageSearchQuery` and clear `imagePrompt` with `update_node` before enrichment.
Both fields together mean Auto; prefer explicit Search for the default flow.
Do not overwrite already populated or unrelated slots. No search result does not
authorize generation: refine the query when appropriate, then report remaining
missing assets honestly. Search uses network access; it does not call `image_gen`.

## Authorized Codex generation

Follow the consent rule in `SKILL.md` before any generation, including edits and
regenerations. Keep the approved asset list, call count and resolved target IDs
in the current task. Count submitted calls even when the result times out; check
for an existing output instead of resubmitting. Use no more than the approved
calls, and reuse completed assets after an import/save failure.

Generate only the required photo, illustration or product asset with the host's
built-in tool; do not flatten the whole editable interface into a generated image.
Preserve transparency when requested. Inspect the actual generated image before
using it. No built-in generation tool means use the search fallback, not an
implicit switch to an API/CLI that requires separate credentials.

## Import, inspect and persist

For a managed canvas:

1. Persist a chosen generated asset in the user's project asset directory with a
   non-overwriting filename. Copy the actual output path returned by the tool, or
   materialize its available output bytes; do not guess a path or rely only on a
   preview. If the host exposes neither readable bytes nor a file, report that
   import is blocked rather than regenerating. Preserve each successful output
   independently if other assets fail. User-supplied files can stay at their
   chosen location.
2. Read the current canvas and target. Confirm the document, page and original
   image node still match the task. A later selection change does not retarget an
   in-flight asset. Create an image node first if the design needs a new slot.
3. Call `canvas_import_image` with the absolute local `filePath`, exact `nodeId`,
   active `pageId` and fresh `expectedVersion` from `canvas_status`. It accepts
   PNG/JPEG/WebP up to 8 MiB, embeds the bytes in the document, clears resolved
   acquisition hints and preserves geometry. A version mismatch requires a fresh
   read and target review, not blind retry. It does not generate or save.
4. Render and view the affected root, inspect crop/subject/transparency and
   unrelated content, then use `canvas_save`. Reopen/read the saved `.op` and
   verify the image bytes are embedded, not a temporary path or `blob:` URL.

For a directly connected desktop editor, `canvas_import_image` requires a managed
canvas and must not open another document over the user's editor. Use its native
supported image import/update and save workflow; verify portable image data in
the saved document. Never claim a host-local path alone works in the WASM canvas.

Report which assets were generated or searched, any missing ones, and the saved
file. A generation failure says nothing about whether the host charged quota;
do not promise a refund or claim zero usage from the error alone.
