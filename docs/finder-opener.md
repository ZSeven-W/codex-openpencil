# Optional macOS Finder opener

The plugin normally opens a canvas inside Codex. A `.op` link in a code editor
can instead show JSON; the plugin cannot override that editor's file viewer.
The optional Finder app gives saved documents a visual, standalone entry point.

## Install

Run `npm run setup` first. With macOS 15+, Node.js 22+, and Apple's Command Line
Tools (`xcrun swiftc`) available:

```sh
npm run install-file-opener
```

This builds an ad-hoc signed `~/Applications/OpenPencil Canvas.app` and registers
it as an **alternate** `.op` handler. In Finder use **Open With → OpenPencil
Canvas**. To explicitly make double-click use this app:

```sh
npm run install-file-opener -- --set-default
```

Choose one command. Existing installations are never overwritten: quit the app,
move the old app aside, then rerun the installer to update. Rebuild after moving
or removing the Node executable; the installer records its absolute path. The
bridge files are copied into the app, so the checkout need not remain available.
No Swift compiler is needed after installation. This is a locally built helper,
not a notarized distributable or a replacement for the full OpenPencil desktop app.

## Behavior

Each file gets an independent WebKit window and supervised recovery session.
Opening the same path again focuses its window. The shell waits for the real
editor-ready message, then uses `op-bridge/open-document` exactly once to load
and fit the current recovery document, using the editor's own layout bounds and
viewport. Save is enabled only after the matching opened event. Ordinary Codex
canvases do not send this document-open request.

The file stays unchanged until Save. The existing source-conflict checks apply.
Closing a dirty window asks before discarding unsaved changes; recovery drafts
remain under `~/.codex-openpencil/sessions/`. Closing the window releases only
its own daemon. Quit asks open windows to close; use Quit again after resolving
any save prompts. A Finder window is independent of the canvas in a Codex chat:
do not edit the same file in both and expect live synchronization.

Auto-fit includes the active page's visible design content, including extra
shapes outside a board. It is a one-time open action, not a repeated zoom reset.
The helper has no AI chat channel; resume AI editing by opening the saved file
in a new Codex canvas. It does not change how links inside Codex's text editor
are rendered. Windows/Linux file associations are outside this initial change.

To uninstall, quit and remove `OpenPencil Canvas.app`, then use Finder's **Get
Info → Open with → Change All** to select another `.op` application if needed.
Saved designs and recovery drafts are not removed.
