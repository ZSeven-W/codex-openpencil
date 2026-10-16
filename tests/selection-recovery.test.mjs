import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiHarness, settle } from './ui-harness.mjs';

const transition = '选区或页面正在切换，请确认选中的元素后重试。';
const selected = (node = 'title', pageId = '0') => ({pageId,nodeIds:[node],count:1,nodes:[{id:node,name:node,type:'text'}]});
async function panel() {
  const ui = await createUiHarness('panel');
  ui.host({type:'codex-canvas/theme',colorScheme:'light',canSendPrompt:true});
  ui.editor({type:'op-bridge/ready',generation:1,revision:0});
  ui.rpc(() => ({version:7,selection:selected()}));
  await ui.state('refreshCanvas()');
  ui.element('edit-prompt').value = '改成蓝色'; ui.element('edit-prompt').oninput();
  return ui;
}
function flush(ui) {
  const request = ui.editorMessages.findLast(item => item.type === 'op-bridge/snapshot');
  ui.editor({type:'op-bridge/snapshot-result',requestId:request.requestId,docJson:'{}',generation:1,revision:0});
}

test('Selection/page transition polling recovers automatically, including older bridge responses', async () => {
  for (const code of ['SELECTION_TRANSITION',undefined]) {
    const ui = await panel();
    ui.rpc(() => ({error:transition,code}),{raw:true});
    await ui.state('refreshCanvas()');
    assert.equal(ui.element('error').hidden,true);
    assert.equal(ui.element('selection-label').textContent,'正在同步选区…');
    assert.equal(ui.element('edit-submit').disabled,true);
    assert.notEqual(ui.element('status').textContent,'画布连接中断');
    assert.equal(ui.hostMessages.at(-1).data.selection,null,'The host must not retain a stale target');
    ui.rpc(() => ({version:7,selection:selected('next-title','page-2')}));
    await ui.state('refreshCanvas()');
    assert.match(ui.element('selection-label').textContent,/next-title/);
    assert.equal(ui.element('error').hidden,true);
    assert.equal(ui.element('edit-submit').disabled,false);
    assert.equal(ui.element('edit-prompt').value,'改成蓝色');
    assert.ok(ui.rpcCalls.every(call => ['canvas_status'].includes(JSON.parse(call.options.body).name)));
  }
});

test('Real connection failures remain visible and clear when the canvas reconnects', async () => {
  const ui = await panel();
  ui.rpc(() => { throw new Error('Runtime disconnected'); });
  await ui.state('refreshCanvas()');
  assert.equal(ui.element('error').hidden,false);
  assert.equal(ui.element('error-message').textContent,'Runtime disconnected');
  assert.equal(ui.element('status').textContent,'画布连接中断');
  ui.rpc(() => ({version:7,selection:selected()}));
  await ui.state('refreshCanvas()');
  assert.equal(ui.element('error').hidden,true);
  assert.equal(ui.element('status').textContent,'画布已连接');
  assert.equal(ui.element('edit-submit').disabled,false);
});

test('Successful selection polls cannot erase failed saves or sync conflict warnings', async () => {
  const ui = await panel();
  ui.rpc(({name}) => {
    if (name === 'canvas_save') throw new Error('Source changed outside the canvas');
    return {version:8,selection:selected()};
  });
  const saving = ui.state('save()'); flush(ui); await saving;
  assert.equal(ui.element('error-message').textContent,'Source changed outside the canvas');
  await ui.state('refreshCanvas()');
  assert.equal(ui.element('error').hidden,false);
  assert.equal(ui.element('status').textContent,'保存未完成');
  ui.rpc(() => { throw new Error('Offline'); }); await ui.state('refreshCanvas()');
  assert.equal(ui.element('error-message').textContent,'Source changed outside the canvas');
  ui.editor({type:'op-bridge/sync-conflict'});
  ui.rpc(() => ({version:8,selection:selected()})); await ui.state('refreshCanvas()');
  assert.equal(ui.element('error').hidden,false);
  assert.match(ui.element('error-message').textContent,/同步过程中发生变化/);
  assert.equal(ui.element('status').textContent,'同步冲突');
});

test('Changed selection submission preserves the draft and its warning clears after a valid read', async () => {
  const ui = await panel(); let available = false;
  ui.rpc(({name}) => {
    if (name === 'canvas_prepare_edit') return {error:'选区已变化。请确认当前元素，再提交修改要求。',code:'SELECTION_CHANGED'};
    if (!available) return {error:transition,code:'SELECTION_TRANSITION'};
    return {structuredContent:{version:7,selection:selected('other')}};
  },{raw:true});
  const submitting = ui.state('submitSelectionPrompt()'); flush(ui); await submitting; await settle();
  assert.equal(ui.element('edit-prompt').value,'改成蓝色');
  assert.equal(ui.element('error').hidden,false);
  assert.match(ui.element('error-message').textContent,/选区已变化/);
  assert.equal(ui.clipboard.length,0);
  available = true; await ui.state('refreshSelection()');
  assert.equal(ui.element('error').hidden,true);
  assert.match(ui.element('selection-label').textContent,/other/);
  assert.equal(ui.element('edit-submit').disabled,false);
  assert.ok(!ui.rpcCalls.some(call => ['canvas_save','canvas_checkpoint'].includes(JSON.parse(call.options.body).name)));
});

test('Dismissed persistent warnings stay closed across identical polls and reappear for a new failure', async () => {
  const ui = await panel();
  ui.rpc(() => { throw new Error('Offline'); }); await ui.state('refreshCanvas()');
  ui.element('error-dismiss').onclick();
  assert.equal(ui.element('error').hidden,true);
  await ui.state('refreshCanvas()'); assert.equal(ui.element('error').hidden,true);
  assert.equal(ui.element('status').textContent,'画布连接中断');
  ui.rpc(() => { throw new Error('Runtime ended'); }); await ui.state('refreshCanvas()');
  assert.equal(ui.element('error').hidden,false);
  assert.equal(ui.element('error-message').textContent,'Runtime ended');
});
