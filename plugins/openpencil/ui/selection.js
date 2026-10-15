let selection = null, submittingPrompt = false, canSendPrompt = false, refreshingSelection = false;
const promptReplies = new Map();
const promptInput = el('edit-prompt'), promptSubmit = el('edit-submit');

function isSelectionReadError(error) {
  // A running bridge may still use the earlier, untyped response until reconnect.
  return (typeof error.code === 'string' && error.code.startsWith('SELECTION_')) || error.message === '选区或页面正在切换，请确认选中的元素后重试。';
}
function selectionReadFailed(error) {
  renderSelection(null);
  if (isSelectionReadError(error)) el('selection-label').textContent = error.code === 'SELECTION_STALE' ? error.message : '正在同步选区…';
}

function renderSelection(value) {
  selection = value?.count > 0 && Array.isArray(value.nodeIds) && value.count === value.nodeIds.length ? value : null;
  const names = selection?.nodes?.map(node => node.name || node.id).join('、') || '';
  el('selection-label').textContent = selection ? `已选 ${selection.count} 个元素 · ${names}` : '在画布中选中元素，用提示词修改';
  el('selection-label').title = names;
  promptInput.disabled = !ready || submittingPrompt;
  promptSubmit.disabled = !ready || !selection || !promptInput.value.trim() || submittingPrompt;
  promptSubmit.textContent = submittingPrompt ? '正在提交…' : canSendPrompt ? '发送给 Codex' : '复制修改请求';
  el('edit-hint').textContent = canSendPrompt ? '仅修改选中的元素及其子节点 · ⌘ / Ctrl + Enter 提交' : '也可直接在 Codex 聊天中说“修改选中元素”；或复制含元素位置的请求';
}

async function refreshSelection() {
  if (!ready || refreshingSelection || submittingPrompt || document.hidden) return;
  refreshingSelection = true;
  try { const result = await rpc('canvas_selection'); renderSelection(result.selection); clearError('selection'); }
  catch (error) { selectionReadFailed(error); }
  finally { refreshingSelection = false; }
}

function sendPrompt(prepared) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      promptReplies.delete(prepared.requestId);
      reject(new Error('请求发送状态未确认。请先检查 Codex 聊天，避免重复提交；提示词已保留。'));
    }, 25000);
    promptReplies.set(prepared.requestId, { resolve, reject, timer });
    window.parent.postMessage({ type:'codex-canvas/prompt', requestId:prepared.requestId, message:prepared.message }, parentOrigin && parentOrigin !== 'null' ? parentOrigin : '*');
  });
}

async function copyRequest(message) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(message);
    el('edit-feedback').textContent = '修改请求已复制，请粘贴到当前 Codex 聊天发送。';
  } catch {
    el('request-text').value = message;
    el('request-dialog').showModal();
    el('request-text').focus(); el('request-text').select();
    el('edit-feedback').textContent = '请在弹窗中复制请求，再粘贴到 Codex 聊天。';
  }
}

async function submitSelectionPrompt() {
  const prompt = promptInput.value.trim();
  if (!ready || !selection || !prompt || submittingPrompt) return;
  // Capture the visible target before any asynchronous snapshot/transport work.
  const expectedSelection = { pageId:selection.pageId, nodeIds:[...selection.nodeIds] };
  const direct = canSendPrompt;
  submittingPrompt = true; renderSelection(selection); clearError('prompt'); clearError('selection'); el('edit-feedback').textContent = '';
  try {
    const snapshot = await flush();
    const prepared = await rpc('canvas_prepare_edit', { prompt, expectedSelection, docJson:snapshot.docJson });
    if (direct) {
      await sendPrompt(prepared);
      if (promptInput.value.trim() === prompt) promptInput.value = '';
      el('edit-feedback').textContent = '修改要求已发送给 Codex，结果将在画布中同步。';
    } else await copyRequest(prepared.message);
  } catch (error) {
    if (isSelectionReadError(error)) {
      fail(error, 'selection'); el('edit-feedback').textContent = '选区已更新，请确认当前元素后重新提交；提示词已保留。';
    } else { fail(error, 'prompt'); el('edit-feedback').textContent = '请求未确认，提示词已保留。'; }
  }
  finally { submittingPrompt = false; renderSelection(selection); void refreshSelection(); }
}

window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent || event.origin !== parentOrigin) return;
  const value = event.data;
  if (value?.type === 'codex-canvas/theme') { canSendPrompt = value.canSendPrompt === true; renderSelection(selection); }
  if (value?.type === 'codex-canvas/prompt-result') {
    const pending = promptReplies.get(value.requestId);
    if (!pending) return;
    clearTimeout(pending.timer); promptReplies.delete(value.requestId);
    if (value.ok === true) pending.resolve(); else pending.reject(new Error(value.error || '修改请求未发送，提示词已保留。'));
  }
});
promptInput.oninput = () => renderSelection(selection);
el('edit-form').onsubmit = event => { event.preventDefault(); void submitSelectionPrompt(); };
promptInput.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.isComposing) { event.preventDefault(); void submitSelectionPrompt(); }
});
el('request-close').onclick = () => el('request-dialog').close();
el('request-copy').onclick = () => void copyRequest(el('request-text').value);
window.addEventListener('focus', () => void refreshSelection());
renderSelection(null);
