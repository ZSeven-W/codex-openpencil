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
  assert.equal(app.element('open-canvas').href, url + '#theme=dark');
  app.host({ jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { theme: 'light' } });
  assert.equal(app.element('open-canvas').href, url + '#theme=light');
  assert.equal(app.navigation.length, 0);
});

test('A host that omits the local frame origin gets the browser launcher', async () => {
  const app = await createUiHarness('app');
  await initializeApp(app, 'light', { serverTools: {}, sandbox: { csp: { frameDomains: [] } } });
  await openPanel(app);
  assert.equal(app.navigation.length, 0);
  assert.equal(app.element('launcher').hidden, false);
});

test('Launcher uses the host link action and reports rejection without claiming success', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'light', { serverTools: {}, openLinks: {} });
  const url = await openPanel(app);
  let prevented = false;
  app.element('open-canvas').emit('click', { preventDefault() { prevented = true; } });
  const request = app.hostMessages.find(item => item.data.method === 'ui/open-link').data;
  assert.equal(prevented, true);
  assert.equal(request.params.url, url + '#theme=light');
  app.host({ jsonrpc: '2.0', id: request.id, result: { isError: true } });
  await settle();
  assert.match(app.element('launch-status').textContent, /未能打开/);
  assert.equal(app.navigation.length, 0);
});

test('Launcher rejects foreign URLs before exposing a link', async () => {
  const app = await createUiHarness('app', { protocol: 'codex-sandbox:' });
  await initializeApp(app, 'light');
  const request = app.hostMessages.find(item => item.data.method === 'tools/call').data;
  app.host({ jsonrpc: '2.0', id: request.id, result: { structuredContent: { panelUrl: 'https://foreign.example/canvas/' + 'a'.repeat(43) } } });
  await settle();
  assert.equal(app.element('launcher').hidden, true);
  assert.equal(app.element('open-canvas').href, undefined);
  assert.equal(app.navigation.length, 0);
});
