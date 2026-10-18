import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiHarness } from './ui-harness.mjs';
import { panelHtml } from '../plugins/openpencil/scripts/canvas-panel.mjs';
import { launcherPlist } from '../scripts/install-file-opener.mjs';

test('Finder opening waits for editor readiness and opens the document exactly once', async () => {
  const doc = JSON.stringify({ children: [{ type: 'frame', id: 'board', x: 3000, width: 1440, height: 1200 }] });
  const ui = await createUiHarness('panel', { openDocument: doc });
  ui.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 }, 'https://foreign.example');
  assert.equal(ui.editorMessages.filter(m => m.type === 'op-bridge/open-document').length, 0);
  ui.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 });
  assert.equal(ui.element('save').disabled, true);
  ui.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 });
  const opens = ui.editorMessages.filter(m => m.type === 'op-bridge/open-document');
  assert.equal(opens.length, 1);
  assert.equal(opens[0].json, doc);
  ui.editor({ type: 'op-bridge/opened', generation: 99 });
  assert.equal(ui.element('save').disabled, true);
  ui.editor({ type: 'op-bridge/opened', generation: 1 });
  assert.equal(ui.element('save').disabled, false);
  assert.equal(ui.element('loading').hidden, true);
});

test('Ordinary Codex panels never reopen or replace the managed document', async () => {
  const ui = await createUiHarness('panel');
  ui.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 });
  assert.equal(ui.element('save').disabled, false);
  assert.equal(ui.editorMessages.some(m => m.type === 'op-bridge/open-document'), false);
});

test('Inline document text cannot escape the panel script', async () => {
  const html = await panelHtml({ openDocument: JSON.stringify({children:[{type:'text',content:'</script><script>alert(1)</script>'}]}) });
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
  assert.ok(html.includes('\\u003c/script>'));
});

test('Finder association is an alternate handler and only allows local networking', () => {
  const plist = launcherPlist();
  assert.match(plist, /LSHandlerRank<\/key><string>Alternate/);
  assert.match(plist, /NSAllowsLocalNetworking/);
  assert.doesNotMatch(plist, /NSAllowsArbitraryLoads/);
});
