const el = id => document.getElementById(id);
const frame = el('editor');
let ready = false, saving = false, dirty = false, source = grant.source;
let generation = 0, revision = 0, savedVersion = null, checkpointTimer;
const snapshots = new Map();

function fail(error) { el('error').textContent = error.message || String(error); el('error').hidden = false; }
function status(text) { el('status').textContent = text; }
function send(value) { frame.contentWindow?.postMessage(JSON.stringify(value), grant.editorOrigin); }
function initialize() { send({ type: 'op-bridge/init', token: grant.token }); }
async function rpc(name, args = {}) {
  const response = await fetch(grant.rpcPath, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, arguments: args }), signal: AbortSignal.timeout(15_000) });
  const value = await response.json();
  if (!response.ok || value.error || value.isError) throw new Error(value.error || value.content?.[0]?.text || '画布操作失败');
  return value.structuredContent;
}
function updateSource() { el('document-label').textContent = source || '未命名设计 · 独立文档'; el('document-label').title = source || ''; }
function flush() {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { snapshots.delete(requestId); reject(new Error('画布同步超时。请检查内容后重新保存，操作不会自动重试。')); }, 15_000);
    snapshots.set(requestId, { resolve, reject, timer });
    send({ type: 'op-bridge/snapshot', purpose: 'save', requestId });
  });
}
async function save(path = source) {
  if (!ready || saving) return;
  if (!path) { el('save-dialog').showModal(); el('file-path').focus(); return; }
  saving = true; el('save').disabled = el('save-as').disabled = true; status('正在保存…'); el('error').hidden = true;
  try {
    const snapshot = await flush();
    const result = await rpc('canvas_save', { filePath: path, docJson: snapshot.docJson });
    source = result.filePath; savedVersion = result.version;
    // A later edit must stay dirty even when an earlier Save completes.
    if (generation === snapshot.generation && revision === snapshot.revision) dirty = false;
    send({ type: 'op-bridge/save-committed', generation: snapshot.generation, revision: snapshot.revision });
    updateSource(); status(dirty ? '有新的未保存修改' : '已保存');
  } catch (error) { fail(error); status('保存未完成'); }
  finally { saving = false; el('save').disabled = el('save-as').disabled = !ready; }
}
function checkpointSoon() {
  clearTimeout(checkpointTimer);
  checkpointTimer = setTimeout(() => { if (!saving && ready) rpc('canvas_checkpoint').catch(fail); }, 1000);
}
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== grant.editorOrigin || typeof event.data !== 'string') return;
  let value; try { value = JSON.parse(event.data); } catch { return; }
  if (value.type === 'op-bridge/listening') initialize();
  if (value.type === 'op-bridge/ready') {
    if (!Number.isSafeInteger(value.generation) || !Number.isSafeInteger(value.revision)) return;
    ready = true; generation = value.generation; revision = value.revision;
    el('loading').hidden = true; el('save').disabled = el('save-as').disabled = false;
    status('画布已连接');
  }
  if (value.type === 'op-bridge/dirty-changed') {
    if (!Number.isSafeInteger(value.generation) || !Number.isSafeInteger(value.revision)) return;
    generation = value.generation; revision = value.revision; dirty = Boolean(value.dirty) || dirty;
    if (!saving && dirty) status('未保存'); checkpointSoon();
  }
  if (value.type === 'op-bridge/sync-conflict') { dirty = true; status('同步冲突'); fail(new Error('设计在同步过程中发生变化。请在编辑器中处理冲突，再保存。')); }
  if (value.type === 'op-bridge/snapshot-result' || value.type === 'op-bridge/snapshot-conflict') {
    const pending = snapshots.get(value.requestId);
    if (!pending) return;
    clearTimeout(pending.timer); snapshots.delete(value.requestId);
    if (value.type === 'op-bridge/snapshot-conflict') pending.reject(new Error('设计已发生变化，保存已停止。请同步后重试。'));
    else pending.resolve(value);
  }
  if (value.type === 'op-shell/save') void save();
});
frame.addEventListener('load', initialize);
frame.src = `${grant.editorOrigin}/?embed=vscode&locale=zh-CN&theme=light`;
updateSource();
const startup = setInterval(() => { if (ready) clearInterval(startup); else initialize(); }, 1000);
setTimeout(() => { if (!ready) { clearInterval(startup); fail(new Error('编辑器尚未连接。请检查运行包、页面加载或插件连接后重新打开画布。')); } }, 30_000);
el('save').onclick = () => void save();
el('save-as').onclick = () => { el('file-path').value = source || ''; el('save-dialog').showModal(); };
el('cancel').onclick = () => el('save-dialog').close();
el('save-form').onsubmit = event => { event.preventDefault(); const path = el('file-path').value.trim(); if (path) { el('save-dialog').close(); void save(path); } };
window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); } });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
setInterval(async () => {
  if (!ready || saving || document.hidden) return;
  try {
    const result = await rpc('canvas_status');
    if (savedVersion === null) savedVersion = result.version;
    else if (result.version !== savedVersion) { dirty = true; status('未保存'); checkpointSoon(); }
    if (window.parent !== window) window.parent.postMessage({ type: 'codex-canvas/context', filePath: source, selection: result.selection }, '*');
  } catch (error) { fail(error); status('画布连接中断'); }
}, 2500);
