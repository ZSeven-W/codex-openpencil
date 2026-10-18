import Cocoa
import WebKit
import CoreServices
import UniformTypeIdentifiers

// Each Finder document owns a supervised Node/Rust session and a WebKit window.
final class CanvasWindow: NSObject, NSWindowDelegate, WKUIDelegate {
    let window: NSWindow
    let webView = WKWebView()
    let process = Process()
    let input = Pipe()
    let output = Pipe()
    var buffer = Data()
    var started = false
    var onClose: (() -> Void)?

    init(file: URL, node: String, script: String) throws {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1200, height: 850),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        super.init()
        window.title = file.lastPathComponent + " — OpenPencil Canvas"
        window.isReleasedWhenClosed = false
        window.delegate = self
        webView.uiDelegate = self
        window.contentView = webView
        window.center()
        process.executableURL = URL(fileURLWithPath: node)
        process.arguments = [script, file.path]
        process.standardInput = input
        process.standardOutput = output
        process.standardError = FileHandle.nullDevice
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            DispatchQueue.main.async { self?.receive(data) }
        }
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                guard let self, self.window.isVisible else { return }
                self.showError("The canvas process ended. Close this window and reopen the .op file. Unsaved recovery drafts remain in ~/.codex-openpencil/sessions/.")
            }
        }
        try process.run()
        window.makeKeyAndOrderFront(nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) { [weak self] in
            guard let self, !self.started, self.process.isRunning else { return }
            self.showError("Canvas startup has not finished. Check the OpenPencil runtime with npm run setup, then reopen this file.")
        }
    }

    func receive(_ data: Data) {
        guard !started else { return }
        buffer.append(data)
        guard buffer.count <= 65536 else { showError("Invalid canvas startup response."); return }
        while let newline = buffer.firstIndex(of: 10) {
            let line = buffer[..<newline]
            buffer.removeSubrange(...newline)
            guard let value = try? JSONSerialization.jsonObject(with: line) as? [String: Any] else { continue }
            if let error = value["error"] as? String { showError(error); return }
            guard value["ready"] as? Bool == true,
                  let text = value["panelUrl"] as? String, let url = URL(string: text),
                  url.scheme == "http", url.host == "127.0.0.1", url.port != nil,
                  url.path.hasPrefix("/canvas/"), url.user == nil, url.password == nil else { continue }
            started = true
            webView.load(URLRequest(url: url))
            return
        }
    }

    func showError(_ message: String) {
        started = true
        let alert = NSAlert()
        alert.messageText = "OpenPencil Canvas"
        alert.informativeText = message
        alert.beginSheetModal(for: window)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        // Native close must not bypass the browser's unsaved-change warning.
        webView.evaluateJavaScript("typeof dirty === 'boolean' && dirty") { [weak self] result, _ in
            guard let self else { return }
            if result as? Bool == true {
                let alert = NSAlert()
                alert.messageText = "Close without saving?"
                alert.informativeText = "Use Save in the canvas to update the original file. A recovery draft is retained when closing."
                alert.addButton(withTitle: "Keep editing")
                alert.addButton(withTitle: "Close")
                alert.beginSheetModal(for: self.window) { response in
                    if response == .alertSecondButtonReturn { self.window.close() }
                }
            } else { self.window.close() }
        }
        return false
    }

    func windowWillClose(_ notification: Notification) {
        output.fileHandleForReading.readabilityHandler = nil
        process.terminationHandler = nil
        try? input.fileHandleForWriting.close()
        let child = process
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { if child.isRunning { child.terminate() } }
        onClose?()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var documents: [String: CanvasWindow] = [:]
    func application(_ sender: NSApplication, openFiles filenames: [String]) {
        guard let resources = Bundle.main.resourceURL,
              let data = try? Data(contentsOf: resources.appendingPathComponent("launcher.json")),
              let config = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let node = config["node"] else {
            report("Launcher configuration is missing. Reinstall the Finder launcher.")
            sender.reply(toOpenOrPrint: .failure); return
        }
        var success = true
        for name in filenames {
            let file = URL(fileURLWithPath: name).standardizedFileURL
            guard file.pathExtension.lowercased() == "op" else { report("Choose an .op document."); success = false; continue }
            if let existing = documents[file.path] { existing.window.makeKeyAndOrderFront(nil); continue }
            do {
                let canvas = try CanvasWindow(file: file, node: node, script: resources.appendingPathComponent("scripts/open-file.mjs").path)
                documents[file.path] = canvas
                canvas.onClose = { [weak self] in self?.documents.removeValue(forKey: file.path) }
            } catch { report(error.localizedDescription); success = false }
        }
        sender.activate(ignoringOtherApps: true)
        sender.reply(toOpenOrPrint: success ? .success : .failure)
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let item = NSMenuItem()
        menu.addItem(item)
        let submenu = NSMenu()
        submenu.addItem(withTitle: "Quit OpenPencil Canvas", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        item.submenu = submenu
        let fileItem = NSMenuItem()
        menu.addItem(fileItem)
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = fileMenu
        let editItem = NSMenuItem()
        menu.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        editItem.submenu = editMenu
        NSApp.mainMenu = menu
    }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if documents.isEmpty { return .terminateNow }
        // Ask each window to resolve its unsaved state; a subsequent Quit exits.
        for canvas in Array(documents.values) { canvas.window.performClose(nil) }
        return .terminateCancel
    }
    func report(_ text: String) {
        let alert = NSAlert(); alert.messageText = "OpenPencil Canvas"; alert.informativeText = text; alert.runModal()
    }
}

if CommandLine.arguments.contains("--set-default") {
    guard let type = UTType(filenameExtension: "op")?.identifier else { exit(1) }
    let status = LSSetDefaultRoleHandlerForContentType(type as CFString,
                                                      .all, "org.zseven.codex-openpencil.canvas" as CFString)
    exit(status == noErr ? 0 : 1)
}
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
