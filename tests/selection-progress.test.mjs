import test from 'node:test';
import assert from 'node:assert/strict';
import { SelectionEdits } from '../plugins/openpencil/scripts/selection-edits.mjs';
import { CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';

const prepared = (requestId = 'req-1') => ({ requestId, version: 7, recoveryPath: '/recovery.op' });
const report = (status, requestId = 'req-1') => ({ requestId, status, detail: 'Inspected the selected card and saved the design.' });

test('Completion requires a known working request, a document change and a successful current save', async () => {
  const edits = new SelectionEdits();
  let version = 7;
  const session = { draft: '/recovery.op', document: async () => ({ version }) };
  await assert.rejects(edits.report(report('working'), session), /Unknown/);
  edits.prepare(prepared());
  assert.equal(edits.current().status, 'prepared');
  await assert.rejects(edits.report(report('completed'), session), /working/);
  await edits.report(report('working'), session);
  await assert.rejects(edits.report(report('completed'), session), /No document change/);
  version = 8;
  await assert.rejects(edits.report(report('completed'), session), /Save the current/);
  session.lastSave = { version: 7 };
  await assert.rejects(edits.report(report('completed'), session), /Save the current/);
  session.lastSave = { version: 8 };
  assert.equal((await edits.report(report('completed'), session)).status, 'completed');
  assert.equal((await edits.report(report('completed'), session)).status, 'completed', 'Same terminal report is idempotent');
  await assert.rejects(edits.report(report('working'), session), /already finished/);
});

test('Progress is request bound, bounded in memory and never retargeted by old reports', async () => {
  const edits = new SelectionEdits(), session = { draft: '/recovery.op' };
  edits.prepare(prepared());
  await assert.rejects(edits.report(report('working'), { draft: '/other.op' }), /Unknown/);
  await assert.rejects(edits.report({ ...report('working'), detail: '' }, session), /summary/);
  await assert.rejects(edits.report(report('queued'), session), /Use working/);
  edits.prepare(prepared('req-2'));
  await edits.report(report('failed'), session);
  assert.equal(edits.current().requestId, 'req-2');
  assert.equal(edits.current().status, 'prepared');
  for (let i = 3; i < 104; i++) edits.prepare(prepared(`req-${i}`));
  assert.equal(edits.requests.size, 100);
  await assert.rejects(edits.report(report('working'), session), /Unknown/);
});

test('Only the model-facing control can report progress; the panel cannot mark its own edit complete', async t => {
  const controller = new CanvasController();
  t.after(() => controller.close());
  controller.session = { draft: '/recovery.op', close: async () => {} };
  controller.edits.prepare(prepared());
  const response = await controller.dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'canvas_edit_status', arguments: report('working') } });
  assert.equal(response.result.structuredContent.status, 'working');
  const panel = await controller.ensurePanel();
  const blocked = await fetch(panel.url + '/rpc', { method: 'POST', body: JSON.stringify({ name: 'canvas_edit_status', arguments: report('completed') }) });
  assert.equal(blocked.status, 403);
  assert.equal(controller.edits.current().status, 'working');
});
