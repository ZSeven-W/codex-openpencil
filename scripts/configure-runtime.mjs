import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { resolveRuntime, stateRoot } from '../plugins/openpencil/scripts/editor-runtime.mjs';

if (process.argv.length !== 3) throw new Error('Usage: npm run configure-runtime -- /absolute/runtime/root');
const runtime = await resolveRuntime(resolve(process.argv[2]));
await mkdir(stateRoot(), { recursive: true, mode: 0o700 });
await writeFile(join(stateRoot(), 'runtime.json'), JSON.stringify({ root: runtime.root }) + '\n', { mode: 0o600 });
console.log(`Verified and configured Rust OpenPencil ${runtime.version} (${process.platform}-${process.arch}).`);
