import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// This is a local plugin action, not navigation inside the MCP Apps sandbox.
// Never accept an arbitrary URL, command, or browser path from the app.
export function browserCommand(raw, platform = process.platform) {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
      !/^\/canvas\/[A-Za-z0-9_-]{43}$/.test(url.pathname) || url.search || url.username || url.password ||
      !/^#theme=(light|dark)&launch=[A-Za-z0-9_-]{22}$/.test(url.hash)) {
    throw new Error('Only this managed loopback canvas may be opened.');
  }
  if (platform === 'darwin') return ['/usr/bin/open', [url.href]];
  if (platform === 'linux') return ['xdg-open', [url.href]];
  if (platform === 'win32') return ['rundll32.exe', ['url.dll,FileProtocolHandler', url.href]];
  throw new Error('No default browser launcher is available on this platform.');
}

export function launchBrowser(url) {
  const [command, args] = browserCommand(url);
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 10_000, windowsHide: true }, error => {
      if (error) reject(new Error('无法启动默认浏览器。请复制画布链接，在浏览器中打开。'));
      else resolve();
    });
  });
}

export async function launchCanvas(controller, args = {}) {
  if (Object.keys(args).some(key => key !== 'theme') || !['light', 'dark'].includes(args.theme)) {
    throw new Error('Choose a light or dark theme; browser URLs cannot be supplied.');
  }
  controller.session.assertLive();
  // Keep a click in flight until its canvas connects, so double clicks cannot
  // open a series of tabs. An uncertain launch is never retried automatically.
  if (controller.browserLaunch?.state === 'pending' && Date.now() < controller.browserLaunch.expiresAt) {
    return browserLaunchStatus(controller, { launchId: controller.browserLaunch.launchId });
  }
  const launchId = randomBytes(16).toString('base64url');
  const url = new URL(controller.panel.url);
  url.hash = `theme=${args.theme}&launch=${launchId}`;
  const launch = { launchId, state: 'pending', expiresAt: Date.now() + 30_000 };
  controller.browserLaunch = launch;
  try { await (controller.options.launchBrowser || launchBrowser)(url.href); }
  catch (error) { launch.state = 'failed'; throw error; }
  return browserLaunchStatus(controller, { launchId });
}

export function browserLaunchStatus(controller, args = {}, connected = false) {
  const launch = controller.browserLaunch;
  if (Object.keys(args).some(key => key !== 'launchId') || typeof args.launchId !== 'string' ||
      !launch || launch.launchId !== args.launchId) throw new Error('Unknown browser launch.');
  if (launch.state === 'pending' && Date.now() >= launch.expiresAt) launch.state = 'unconfirmed';
  if (connected && launch.state === 'pending') launch.state = 'connected';
  return { launchId: launch.launchId, state: launch.state };
}
