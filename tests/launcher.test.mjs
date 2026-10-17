import test from 'node:test';
import assert from 'node:assert/strict';
import { createUiHarness, initializeApp, openPanel, settle } from './ui-harness.mjs';

test('Codex sandbox launches loopback canvas without navigating a blocked iframe', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'dark');
  const url = await openPanel(app);
  assert.equal(app.navigation.length, 0);
  assert.equal(app.frame.hidden, true);
  assert.equal(app.element('launcher').hidden, false);
  assert.equal(app.element('canvas-url').value, url + '#theme=dark');
  app.host({ jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { theme: 'light' } });
  assert.equal(app.element('canvas-url').value, url + '#theme=light');
  assert.equal(app.navigation.length, 0);
});

test('A host that omits the local frame origin gets the browser launcher', async () => {
  const app = await createUiHarness('app');
  await initializeApp(app, 'light', { serverTools: {}, sandbox: { csp: { frameDomains: [] } } });
  await openPanel(app);
  assert.equal(app.navigation.length, 0);
  assert.equal(app.element('launcher').hidden, false);
});

test('Launcher uses the local browser action and reports rejection without claiming success', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'light', { serverTools: {}, openLinks: {} });
  await openPanel(app);
  let prevented = false;
  app.element('open-canvas').emit('click', { preventDefault() { prevented = true; } });
  const request = app.hostMessages.find(item => item.data.params?.name === 'canvas_launch_browser').data;
  assert.equal(prevented, true);
  assert.equal(request.params.arguments.theme, 'light');
  assert.equal(app.hostMessages.some(item => item.data.method === 'ui/open-link'), false);
  app.host({ jsonrpc: '2.0', id: request.id, result: { isError: true } });
  await settle();
  assert.match(app.element('launch-status').textContent, /未确认/);
  assert.equal(app.element('open-canvas').disabled, false);
  assert.equal(app.navigation.length, 0);
});

test('A launcher acknowledgment stays pending until the actual browser editor reports ready', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'dark'); await openPanel(app);
  const click = () => app.element('open-canvas').emit('click', { preventDefault() {} });
  click(); click();
  const launches = app.hostMessages.filter(item => item.data.params?.name === 'canvas_launch_browser');
  assert.equal(launches.length, 1);
  const launchId = 'b'.repeat(22);
  app.host({ jsonrpc: '2.0', id: launches[0].data.id, result: { structuredContent: { launchId, state: 'pending' } } });
  await settle();
  assert.match(app.element('launch-status').textContent, /等待画布连接/);
  assert.equal(app.element('open-canvas').disabled, true);
  assert.equal(app.timers.size, 1);
  app.timers.values().next().value();
  await settle();
  const poll = app.hostMessages.find(item => item.data.params?.name === 'canvas_launch_status').data;
  assert.equal(poll.params.arguments.launchId, launchId);
  app.host({ jsonrpc: '2.0', id: poll.id, result: { structuredContent: { launchId, state: 'connected' } } });
  await settle();
  assert.match(app.element('launch-status').textContent, /^画布已连接/);
  assert.equal(app.element('open-canvas').disabled, false);
});

test('Copy fallback uses the current theme URL and survives clipboard denial', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'dark'); const url = await openPanel(app);
  app.element('copy-canvas').emit('click'); await settle();
  assert.deepEqual(app.clipboard, [url + '#theme=dark']);
  assert.match(app.element('launch-status').textContent, /链接已复制/);
  let selected = false;
  app.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  app.element('canvas-url').select = () => { selected = true; };
  app.element('copy-canvas').emit('click'); await settle();
  assert.equal(selected, true);
  assert.match(app.element('launch-status').textContent, /手动复制/);
});

test('Timeout never retries a browser launch or announces a connected canvas', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'light'); await openPanel(app);
  app.element('open-canvas').emit('click', { preventDefault() {} });
  app.timers.values().next().value(); await settle();
  assert.match(app.element('launch-status').textContent, /未确认/);
  assert.equal(app.hostMessages.filter(item => item.data.params?.name === 'canvas_launch_browser').length, 1);
  assert.equal(app.element('open-canvas').disabled, false);
});

test('Bare acknowledgments and expired launches offer copy fallback instead of success', async () => {
  for (const result of [{}, { structuredContent: { launchId: 'b'.repeat(22), state: 'unconfirmed' } }]) {
    const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
    await initializeApp(app, 'light'); await openPanel(app);
    app.element('open-canvas').emit('click', { preventDefault() {} });
    const launch = app.hostMessages.find(item => item.data.params?.name === 'canvas_launch_browser').data;
    app.host({ jsonrpc: '2.0', id: launch.id, result }); await settle();
    assert.match(app.element('launch-status').textContent, /未确认/);
    assert.equal(app.element('copy-fallback').open, true);
    assert.equal(app.hostMessages.filter(item => item.data.params?.name === 'canvas_launch_browser').length, 1);
  }
});

test('Launcher rejects foreign URLs before exposing a link', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'light');
  const request = app.hostMessages.find(item => item.data.method === 'tools/call').data;
  app.host({ jsonrpc: '2.0', id: request.id, result: { structuredContent: { panelUrl: 'https://foreign.example/canvas/' + 'a'.repeat(43) } } });
  await settle();
  assert.equal(app.element('launcher').hidden, true);
  assert.equal(app.element('canvas-url').value, '');
  assert.equal(app.navigation.length, 0);
});
