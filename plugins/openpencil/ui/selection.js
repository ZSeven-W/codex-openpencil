let selection = null, submittingPrompt = false, canSendPrompt = false, refreshingSelection = false;
let shortcutOpen = false, activeEdit = null;
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
  el('selection-label').textContent = selection ? `已选 ${selection.count} 个元素${names ? ` · ${names}` : ''}` : '选中元素后';
  el('selection-label').title = names;
  el('selection-guide').textContent = '在当前 Codex 聊天描述修改';
  el('edit-toggle').hidden = !canSendPrompt;
  el('edit-toggle').textContent = shortcutOpen ? '收起快捷输入' : '在画布内提要求';
  el('edit-toggle').ariaExpanded = String(canSendPrompt && shortcutOpen);
  el('edit-shortcut').hidden = !canSendPrompt || !shortcutOpen;
  promptInput.disabled = !canSendPrompt || !ready || submittingPrompt;
  promptSubmit.disabled = !canSendPrompt || !ready || !selection || !promptInput.value.trim() || submittingPrompt;
  promptSubmit.textContent = submittingPrompt ? '正在提交…' : '修改选中内容';
}

function editFeedback(text, state = '') {
  el('edit-feedback').textContent = text;
  el('edit-feedback').dataset.state = state;
}
function renderEditProgress(value) {
  if (!activeEdit || value?.requestId !== activeEdit.requestId) return;
  activeEdit.progress = value;
  if (submittingPrompt) return;
  const labels = { working:'正在修改…', completed:'已完成 · 已检查预览并保存', failed:'修改未完成，请在 Codex 聊天查看原因' };
  if (labels[value.status]) {
    clearError('prompt');
    if (value.status === 'failed' && !activeEdit.draftRestored) {
      activeEdit.draftRestored = true;
      if (!promptInput.value) { promptInput.value = activeEdit.prompt; renderSelection(selection); }
    }
    editFeedback(labels[value.status], value.status);
    el('edit-feedback').title = value.detail || '';
  }
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

async function submitSelectionPrompt() {
  const prompt = promptInput.value.trim();
  if (!canSendPrompt || !ready || !selection || !prompt || submittingPrompt) return;
  // Capture the visible target before any asynchronous snapshot/transport work.
  const expectedSelection = { pageId:selection.pageId, nodeIds:[...selection.nodeIds] };
  activeEdit = null;
  submittingPrompt = true; renderSelection(selection); clearError('prompt'); clearError('selection'); editFeedback('正在提交…', 'submitting');
  el('edit-feedback').title = '';
  try {
    const snapshot = await flush();
    if (!canSendPrompt) throw new Error('快捷发送已不可用。请在当前 Codex 聊天描述修改；提示词已保留。');
    const prepared = await rpc('canvas_prepare_edit', { prompt, expectedSelection, docJson:snapshot.docJson });
    if (!canSendPrompt) throw new Error('快捷发送已不可用。请在当前 Codex 聊天描述修改；提示词已保留。');
    activeEdit = { requestId:prepared.requestId, prompt };
    await sendPrompt(prepared);
    if (promptInput.value.trim() === prompt) promptInput.value = '';
    editFeedback('已提交 · 等待 Codex 处理', 'submitted');
  } catch (error) {
    if (isSelectionReadError(error)) {
      fail(error, 'selection'); editFeedback('请确认当前选区后重新提交；提示词已保留。', 'failed');
    } else { fail(error, 'prompt'); editFeedback('请求未确认，请先检查 Codex 聊天；提示词已保留。', 'unconfirmed'); }
  }
  finally { submittingPrompt = false; renderSelection(selection); renderEditProgress(activeEdit?.progress); void refreshSelection(); }
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
el('edit-toggle').onclick = () => {
  if (!canSendPrompt) return;
  shortcutOpen = !shortcutOpen; renderSelection(selection);
  if (shortcutOpen) promptInput.focus();
};
el('edit-form').onsubmit = event => { event.preventDefault(); void submitSelectionPrompt(); };
promptInput.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.isComposing) { event.preventDefault(); void submitSelectionPrompt(); }
});
window.addEventListener('focus', () => void refreshSelection());
renderSelection(null);
