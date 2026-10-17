import test from 'node:test';
import assert from 'node:assert/strict';
import { browserCommand, launchCanvas, browserLaunchStatus } from '../plugins/openpencil/scripts/browser-launch.mjs';
import { canvasTools, CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';
import { createUiHarness, settle } from './ui-harness.mjs';

const panelUrl = 'http://127.0.0.1:1234/canvas/' + 'a'.repeat(43);
const launchedUrl = panelUrl + '#theme=dark&launch=' + 'b'.repeat(22);
function fixture(launchBrowser = async () => {}) {
  return { options: { launchBrowser }, panel: { url: panelUrl }, session: { assertLive() {} } };
}

test('Browser launch is shell-free and limited to a loopback canvas on every platform', () => {
  assert.deepEqual(browserCommand(launchedUrl, 'darwin'), ['/usr/bin/open', [launchedUrl]]);
  assert.deepEqual(browserCommand(launchedUrl, 'linux'), ['xdg-open', [launchedUrl]]);
  assert.deepEqual(browserCommand(launchedUrl, 'win32'), ['rundll32.exe', ['url.dll,FileProtocolHandler', launchedUrl]]);
  for (const raw of [launchedUrl.replace('127.0.0.1', 'foreign.example'), launchedUrl.replace('http:', 'https:'),
    launchedUrl.replace('/canvas/', '/other/'), launchedUrl + '&command=evil', launchedUrl.replace('#', '?url=evil#'),
    launchedUrl.replace('127.0.0.1', 'user@127.0.0.1')]) assert.throws(() => browserCommand(raw), /managed loopback/);
  assert.throws(() => browserCommand(launchedUrl, 'other'), /No default browser/);
});

test('Only an explicit app click launches the existing canvas and a ready receipt confirms it', async () => {
  const calls = [], controller = fixture(async url => calls.push(url));
  const launch = await launchCanvas(controller, { theme: 'dark' });
  assert.equal(launch.state, 'pending');
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).origin + new URL(calls[0]).pathname, panelUrl);
  assert.equal(new URL(calls[0]).hash, `#theme=dark&launch=${launch.launchId}`);
  await launchCanvas(controller, { theme: 'light' });
  assert.equal(calls.length, 1, 'Repeated in-flight clicks must not open another browser');
  assert.throws(() => browserLaunchStatus(controller, { launchId: 'foreign' }, true), /Unknown/);
  assert.equal(browserLaunchStatus(controller, { launchId: launch.launchId }).state, 'pending');
  assert.equal(browserLaunchStatus(controller, { launchId: launch.launchId }, true).state, 'connected');
  assert.equal(browserLaunchStatus(controller, { launchId: launch.launchId }).state, 'connected');
  for (const name of ['canvas_launch_browser', 'canvas_launch_status']) {
    assert.deepEqual(canvasTools.find(tool => tool.name === name)._meta.ui.visibility, ['app']);
  }
  assert.equal(canvasTools.some(tool => tool.name === 'canvas_launch_ready'), false, 'Ready receipts are local panel RPC only');
});

test('Untrusted arguments, missing browsers and expired receipts cannot become a successful launch', async () => {
  const controller = fixture(async () => { throw new Error('No browser handler'); });
  for (const args of [{}, { theme: 'evil' }, { theme: 'dark', url: 'https://foreign.example' }]) {
    await assert.rejects(launchCanvas(controller, args), /theme|URLs/);
  }
  await assert.rejects(launchCanvas(controller, { theme: 'dark' }), /No browser handler/);
  assert.equal(controller.browserLaunch.state, 'failed');
  controller.options.launchBrowser = async () => {};
  const result = await launchCanvas(controller, { theme: 'light' });
  controller.browserLaunch.expiresAt = 0;
  assert.equal(browserLaunchStatus(controller, { launchId: result.launchId }, true).state, 'unconfirmed');
});

test('A panel acknowledges only its native editor ready event and preserves the requested browser theme', async () => {
  const launchId = 'b'.repeat(22);
  const panel = await createUiHarness('panel', { embedded: false, dark: false, hash: `#theme=dark&launch=${launchId}` });
  assert.equal(panel.theme(), 'dark');
  panel.editor({ type: 'op-bridge/listening' });
  assert.equal(panel.rpcCalls.length, 0);
  panel.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 });
  panel.editor({ type: 'op-bridge/ready', generation: 0, revision: 0 });
  await settle();
  const calls = panel.rpcCalls.map(item => JSON.parse(item.options.body));
  assert.deepEqual(calls, [{ name: 'canvas_launch_ready', arguments: { launchId } }]);
});

test('Ready receipts are origin checked and cannot trigger a browser launch through panel HTTP', async t => {
  const controller = new CanvasController();
  t.after(() => controller.close());
  const panel = await controller.ensurePanel();
  controller.browserLaunch = { launchId: 'b'.repeat(22), state: 'pending', expiresAt: Date.now() + 30_000 };
  controller.session = { assertLive() {}, close: async () => {} };
  const body = JSON.stringify({ name: 'canvas_launch_ready', arguments: { launchId: 'b'.repeat(22) } });
  const foreign = await fetch(panel.url + '/rpc', { method: 'POST', headers: { Origin: 'https://foreign.example' }, body });
  assert.equal(foreign.status, 403);
  assert.equal(controller.browserLaunch.state, 'pending');
  const denied = await fetch(panel.url + '/rpc', { method: 'POST', body: JSON.stringify({ name: 'canvas_launch_browser', arguments: { theme: 'dark' } }) });
  assert.equal(denied.status, 403);
  const ready = await fetch(panel.url + '/rpc', { method: 'POST', headers: { Origin: panel.origin }, body });
  assert.equal((await ready.json()).structuredContent.state, 'connected');
});
