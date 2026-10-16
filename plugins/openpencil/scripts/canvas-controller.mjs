import { readFile } from 'node:fs/promises';
import { EditorSession } from './editor-session.mjs';
import { startPanel } from './canvas-panel.mjs';
import { forward, errorReply } from './transport.mjs';
import { readCanvasSelection, prepareSelectionEdit } from './canvas-selection.mjs';
import { SelectionEdits } from './selection-edits.mjs';

export const CANVAS_URI = 'ui://openpencil/canvas/v0.3.1.html';
const schema = properties => ({ type: 'object', properties, additionalProperties: false });
const filePath = { type: 'string', description: 'Absolute .op path; omit to create or reopen this session’s canvas.' };
export const canvasTools = [
  { name: 'open_canvas', title: 'OpenPencil Canvas', description: 'Open the complete editable Rust canvas in the conversation panel. Optional filePath loads an existing .op into an isolated managed session. All subsequent OpenPencil tools target this canvas until the bridge closes. Omit the path for a new document. Returns a local panel URL for hosts without MCP Apps UI.',
    inputSchema: schema({ filePath }), annotations: { destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: CANVAS_URI }, 'openai/ui': { entrypoints: [{ type: 'thread' }] } } },
  { name: 'canvas_status', description: 'Read managed canvas file, recovery path, document version and selection.', inputSchema: schema({}),
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'canvas_selection', description: 'Read the current managed canvas selection: exact node IDs, names, types, parents, active page and document version. Call before modifying selected elements from a chat prompt; read these nodes with batch_get, then edit only their subtrees. Empty selection means no target, never the entire page.',
    inputSchema: schema({}), annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'canvas_prepare_edit', description: 'Prepare a prompt tied to an exact selection, without editing or sending it. Refuses an empty or changed selection and unsynced browser snapshots.',
    inputSchema: schema({ prompt: { type: 'string', minLength: 1, maxLength: 8000 },
      expectedSelection: { type: 'object', properties: { pageId: { type: 'string' }, nodeIds: { type: 'array', items: { type: 'string' }, minItems: 1 } }, required: ['pageId', 'nodeIds'], additionalProperties: false },
      docJson: { type: 'string', description: 'UI-only flushed document snapshot.' } }),
    annotations: { readOnlyHint: true, openWorldHint: false }, _meta: { ui: { visibility: ['app'] } } },
  { name: 'canvas_edit_status', description: 'Report progress for a captured selection edit request. Report working before editing. Report completed only after inspecting the affected screenshot and saving the current document with canvas_save; provide a verification summary. Report failed when stopped. This updates progress only and never edits or retries the design.',
    inputSchema: { ...schema({ requestId: { type: 'string', minLength: 1, maxLength: 80 },
      status: { type: 'string', enum: ['working', 'completed', 'failed'] }, detail: { type: 'string', minLength: 1, maxLength: 500 } }), required: ['requestId', 'status', 'detail'] },
    annotations: { destructiveHint: false, openWorldHint: false }, _meta: { ui: { visibility: ['model'] } } },
  { name: 'canvas_save', description: 'Save the managed canvas to its original path or a new absolute .op path. Refuses external changes or an existing Save As destination. UI must flush its snapshot first; never automatically retry.',
    inputSchema: schema({ filePath, docJson: { type: 'string', description: 'UI-only flushed document snapshot, used to reject stale saves.' } }),
    annotations: { destructiveHint: true, openWorldHint: false } },
  { name: 'canvas_checkpoint', description: 'Persist a recovery draft of the managed canvas without overwriting its source.', inputSchema: schema({}),
    annotations: { destructiveHint: false, openWorldHint: false }, _meta: { ui: { visibility: ['app'] } } },
];

const toolResult = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });

export class CanvasController {
  constructor(options = {}) { this.options = options; this.queue = Promise.resolve(); this.session = null; this.panel = null; this.edits = new SelectionEdits(); }
  enqueue(work) { const result = this.queue.then(work); this.queue = result.catch(() => {}); return result; }
  async ensurePanel() { if (!this.panel) this.panel = await startPanel(this); return this.panel; }
  async open({ filePath } = {}) {
    const panel = await this.ensurePanel();
    if (this.session && filePath && filePath !== this.session.source && filePath !== this.session.draft) {
      throw new Error('This conversation already has a canvas. Save it, then open the other document in a new conversation.');
    }
    if (!this.session) {
      this.session = await EditorSession.start({ filePath, allowOrigin: panel.origin, runtimeRoot: this.options.runtimeRoot });
      await this.options.onToolsChanged?.();
    }
    this.session.assertLive();
    const value = { filePath: this.session.source, recoveryPath: this.session.draft, panelUrl: panel.url, version: this.session.version };
    return { ...toolResult(value), _meta: { canvas: { editorOrigin: `http://127.0.0.1:${this.session.port}`,
      token: this.session.token, panelUrl: panel.url } } };
  }
  async call(name, args) {
    if (name === 'open_canvas') return this.open(args);
    if (!this.session) throw new Error('Open a managed canvas with open_canvas first.');
    if (name === 'canvas_save') return toolResult(await this.session.save(args));
    if (name === 'canvas_checkpoint') return toolResult(await this.session.checkpoint());
    if (name === 'canvas_edit_status') return toolResult(await this.edits.report(args, this.session));
    const current = await readCanvasSelection(this.session, { fresh: name === 'canvas_prepare_edit' });
    if (name === 'canvas_prepare_edit') {
      const prepared = prepareSelectionEdit(args, current, this.session);
      this.edits.prepare(prepared);
      return toolResult(prepared);
    }
    return toolResult({ filePath: this.session.source, recoveryPath: this.session.draft, version: current.live.version, selection: current.selection, editRequest: this.edits.current() });
  }
  async resource() {
    const panel = await this.ensurePanel();
    const template = await readFile(new URL('../ui/app.html', import.meta.url), 'utf8');
    return { contents: [{ uri: CANVAS_URI, mimeType: 'text/html;profile=mcp-app', text: template,
      _meta: { ui: { prefersBorder: false, permissions: { clipboardWrite: {} }, csp: { frameDomains: [panel.origin], connectDomains: [], resourceDomains: [] } },
        'openai/ui': { availableDisplayModes: ['inline', 'fullscreen'], preferredDisplayMode: 'fullscreen' } } }] };
  }
  async dispatch(message) {
    if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' ||
        (Object.hasOwn(message, 'id') && message.id !== null && !['string','number'].includes(typeof message.id))) {
      return errorReply(null, -32600, 'Expected a JSON-RPC 2.0 request or notification.');
    }
    const reply = result => ({ jsonrpc: '2.0', id: message.id, result });
    try {
      if (message.method === 'resources/read' && message.params?.uri === CANVAS_URI) return reply(await this.resource());
      if (message.method === 'resources/list') return reply({ resources: [{ uri: CANVAS_URI, name: 'OpenPencil Canvas', mimeType: 'text/html;profile=mcp-app' }] });
      if (message.method === 'tools/call' && canvasTools.some(tool => tool.name === message.params?.name)) {
        return reply(await this.call(message.params.name, message.params.arguments || {}));
      }
      if (this.session && message.method === 'tools/call' && message.params?.name === 'save_document') {
        if (message.params.arguments?.sourceFilePath) throw new Error('Source-copy save is unavailable while a managed canvas is active.');
        return reply(await this.call('canvas_save', message.params.arguments || {}));
      }
      const upstream = this.session ? await this.session.forward(message) : await forward(message, this.options);
      if (!Object.hasOwn(message, 'id')) return null;
      if (message.method === 'initialize') {
        const result = upstream?.result || { protocolVersion: message.params?.protocolVersion || '2025-11-25', serverInfo: { name: 'codex-openpencil', version: '0.3.1' } };
        result.capabilities = { ...result.capabilities, tools: { listChanged: true }, resources: {} };
        return reply(result);
      }
      if (message.method === 'tools/list') return reply({ ...upstream?.result, tools: [...(upstream?.result?.tools || []), ...canvasTools] });
      return upstream;
    } catch (error) {
      if (!Object.hasOwn(message, 'id')) return null;
      if (message.method === 'tools/call') return reply({ content: [{ type: 'text', text: error.message }], isError: true,
        ...(error.code ? { structuredContent: { code: error.code } } : {}) });
      return errorReply(message.id, -32000, error.message);
    }
  }
  async close() {
    await this.queue;
    try { if (this.session) await this.session.close(); } finally { if (this.panel) await this.panel.close(); }
  }
}
