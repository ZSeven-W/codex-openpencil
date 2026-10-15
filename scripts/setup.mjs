import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRuntime, installRuntime } from '../plugins/openpencil/scripts/runtime-install.mjs';
import { CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';
import { EditorSession } from '../plugins/openpencil/scripts/editor-session.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--runtime-only', '--repair-runtime'].includes(arg))) {
  throw new Error('Usage: node scripts/setup.mjs [--runtime-only] [--repair-runtime]');
}
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('OpenPencil requires Node.js 22 or later.');
const root = fileURLToPath(new URL('../', import.meta.url));
function codex(command) {
  const binary = process.env.OPENPENCIL_CODEX_BIN || (process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const result = spawnSync(binary, command, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', timeout: 180_000 });
  if (result.error?.code === 'ENOENT') throw new Error('Codex CLI is missing from PATH. Install the current official @openai/codex CLI, then run setup again.');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Codex ${command.slice(0, 3).join(' ')} failed. A recent Codex CLI with plugin support is required.`);
}

export async function verifyRuntime(runtimeRoot) {
  const dir = await mkdtemp(join(tmpdir(), 'openpencil-install-check-'));
  const filePath = join(dir, 'setup-check.op');
  const controller = new CanvasController({ runtimeRoot });
  try {
    await writeFile(filePath, JSON.stringify({ version: '0.8.5', children: [
      { type: 'frame', id: 'setup-check', name: 'Installation check', width: 400, height: 300, children: [] },
    ] }));
    const opened = await controller.open({ filePath });
    if (!(await fetch(opened.structuredContent.panelUrl)).ok) throw new Error('Canvas panel did not load.');
    const reply = await controller.dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
      name: 'update_node', arguments: { nodeId: 'setup-check', data: { name: 'Verified installation' } },
    } });
    if (reply.error || reply.result?.isError) throw new Error('Native editor modification failed.');
    await controller.call('canvas_save', { filePath });
    if (!(await readFile(filePath, 'utf8')).includes('Verified installation')) throw new Error('Saved edit was missing.');
    await controller.close();
    const reopened = await EditorSession.start({ filePath, allowOrigin: 'http://127.0.0.1:1', runtimeRoot });
    try {
      if (!JSON.stringify((await reopened.document()).document).includes('Verified installation')) throw new Error('Saved document did not reopen.');
    } finally { await reopened.close(); }
  } finally { await controller.close(); await rm(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Acquire and verify before registering the plugin; an interrupted download
    // must not leave an apparently ready plugin with no usable editor.
    const runtime = args.includes('--repair-runtime') ? await installRuntime() : await ensureRuntime();
    await verifyRuntime(runtime.root);
    if (!args.includes('--runtime-only')) {
      codex(['plugin', 'marketplace', 'add', root]);
      codex(['plugin', 'add', 'openpencil@zseven-openpencil']);
    }
    console.log(JSON.stringify({ ok: true, runtime: runtime.version, platform: `${process.platform}-${process.arch}`,
      verified: ['panel', 'native-edit', 'save', 'reopen'], pluginInstalled: !args.includes('--runtime-only'),
      next: 'Call open_canvas if available. Otherwise run npm run canvas in a persistent terminal to use the canvas now; reconnect the plugin or start a new chat to load its tools.' }, null, 2));
  } catch (error) { console.error(`OpenPencil setup failed: ${error.message}`); process.exitCode = 1; }
}
