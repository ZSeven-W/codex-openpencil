// Private stdio service for the optional Finder app. No shell or OS browser.
import { resolve } from 'node:path';
import { CanvasController } from '../plugins/openpencil/scripts/canvas-controller.mjs';

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error('Usage: node scripts/open-file.mjs /absolute/design.op');
const controller = new CanvasController({ openInEditor: true });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  process.stdin.pause();
  await controller.enqueue(() => controller.close());
}
process.stdin.resume();
process.stdin.on('end', close);
process.stdin.on('data', close);
process.once('SIGTERM', close);
process.once('SIGINT', close);
try {
  const result = await controller.enqueue(() => controller.open({ filePath: resolve(args[0]) }));
  if (!closing) console.log(JSON.stringify({ ready: true, panelUrl: result.structuredContent.panelUrl }));
} catch (error) {
  console.log(JSON.stringify({ error: error.message }));
  await close();
  process.stdin.pause();
  process.exitCode = 1;
}
