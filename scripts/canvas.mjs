import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--file')) throw new Error('Usage: npm run canvas [-- --file /absolute/design.op]');
const controller = new CanvasController();
const input = createInterface({ input: process.stdin, terminal: false });
const shutdown = () => input.close();
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
try {
  const opened = await controller.open(args.length ? { filePath: resolve(args[1]) } : {});
  console.log(JSON.stringify({ ready: true, ...opened.structuredContent,
    input: 'One JSON object per line: {"name":"get_editor_state","arguments":{}}. Send {"quit":true} to close. Never retry a failed write automatically.' }));
  let id = 0;
  for await (const line of input) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      if (request.quit === true) break;
      const message = request.method ? { ...request, jsonrpc: '2.0', id: ++id }
        : { jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: request.name, arguments: request.arguments || {} } };
      console.log(JSON.stringify(await controller.enqueue(() => controller.dispatch(message))));
    } catch (error) { console.log(JSON.stringify({ error: error.message })); }
  }
} finally { input.close(); await controller.close(); }
