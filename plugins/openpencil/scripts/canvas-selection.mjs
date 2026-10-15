import { randomUUID } from 'node:crypto';
import { snapshotMatches } from './document-format.mjs';

const selectionError = (message, code) => Object.assign(new Error(message), { code });

function editorState(reply) {
  if (reply?.error || reply?.result?.isError) throw new Error('Cannot read the canvas selection.');
  const result = reply?.result;
  let state = result?.structuredContent;
  if (!state) {
    const text = result?.content?.find(item => item.type === 'text')?.text;
    try { state = JSON.parse(text); } catch { throw new Error('Invalid canvas selection response.'); }
  }
  const pageIndex = Number(state.active_page_index);
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0 || typeof state.active_page_id !== 'string' || typeof state.selection_ids !== 'string') {
    throw new Error('Invalid canvas selection state.');
  }
  return { pageId: state.active_page_id, pageIndex,
    nodeIds: [...new Set(state.selection_ids.split(',').filter(id => id && id !== '0'))].sort() };
}

export function sameSelection(a, b) {
  const right = Array.isArray(b?.nodeIds) ? [...b.nodeIds].sort() : [];
  return a?.pageId === b?.pageId && Array.isArray(a?.nodeIds) && Array.isArray(b?.nodeIds) &&
    a.nodeIds.length === b.nodeIds.length && [...a.nodeIds].sort().every((id, index) => id === right[index]);
}

export async function readCanvasSelection(session, { fresh = false } = {}) {
  const state = async () => editorState(await session.forward({ jsonrpc: '2.0', id: 'canvas-selection',
    method: 'tools/call', params: { name: 'get_editor_state', arguments: {} } }));
  const before = await state();
  const live = !fresh && session.selectionDocument ? await session.selectionDocument(before.pageIndex) : await session.document();
  const after = await state();
  if (!sameSelection(before, after) || before.pageIndex !== after.pageIndex || after.pageIndex !== live.activePageIndex) {
    throw selectionError('选区或页面正在切换，请确认选中的元素后重试。', 'SELECTION_TRANSITION');
  }
  const document = live.document;
  const page = document.pages?.length ? document.pages[after.pageIndex] : document;
  if (!page || (document.pages?.length && page.id !== after.pageId)) throw selectionError('页面尚在同步，请稍后重试。', 'SELECTION_TRANSITION');
  const nodes = new Map();
  const visit = (children, parentId = null) => {
    for (const node of children || []) {
      nodes.set(node.id, { id: node.id, name: node.name || node.type, type: node.type, parentId });
      visit(node.children, node.id);
    }
  };
  visit(page.children);
  if (after.nodeIds.some(id => !nodes.has(id))) throw selectionError('选中的元素已不存在，请重新选择。', 'SELECTION_STALE');
  return { live, selection: { ...after, count: after.nodeIds.length, nodes: after.nodeIds.map(id => nodes.get(id)) } };
}

export function prepareSelectionEdit({ prompt, expectedSelection, docJson }, current, session) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new Error('请输入 1–8000 字的修改要求。');
  if (!current.selection.count) throw selectionError('请先在画布中选中要修改的元素。', 'SELECTION_REQUIRED');
  if (!sameSelection(expectedSelection, current.selection)) throw selectionError('选区已变化。请确认当前元素，再提交修改要求。', 'SELECTION_CHANGED');
  if (docJson !== undefined && !snapshotMatches(JSON.parse(docJson), current.live)) {
    throw new Error('画布内容尚未同步，请稍后重新提交。');
  }
  const requestId = randomUUID();
  const scope = { requestId, filePath: session.source, recoveryPath: session.draft, version: current.live.version,
    pageId: current.selection.pageId, nodeIds: current.selection.nodeIds };
  const message = ['请根据以下要求修改 OpenPencil 中指定的元素。',
    '范围已在提交时固定：仅修改这些元素及其子节点，保留其他元素。即使后续选区改变，也不要更换目标。',
    '先读取指定页面和元素；若文档、页面或元素不存在，停止并说明。完成后检查截图。不要自动重试超时的写入。',
    'OpenPencil selection edit scope:', JSON.stringify(scope), '', '用户修改要求：', prompt.trim()].join('\n');
  return { requestId, ...scope, selection: current.selection, prompt: prompt.trim(), message };
}
