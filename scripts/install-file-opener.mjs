import { cp, mkdir, mkdtemp, rename, rm, writeFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function launcherPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>OpenPencilCanvas</string>
<key>CFBundleIdentifier</key><string>org.zseven.codex-openpencil.canvas</string>
<key>CFBundleName</key><string>OpenPencil Canvas</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>15.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
<key>CFBundleDocumentTypes</key><array><dict>
<key>CFBundleTypeName</key><string>OpenPencil Document</string>
<key>CFBundleTypeRole</key><string>Editor</string>
<key>LSHandlerRank</key><string>Alternate</string>
<key>CFBundleTypeExtensions</key><array><string>op</string></array>
<key>LSItemContentTypes</key><array><string>org.zseven.codex-openpencil.document</string></array>
</dict></array>
<key>UTImportedTypeDeclarations</key><array><dict>
<key>UTTypeIdentifier</key><string>org.zseven.codex-openpencil.document</string>
<key>UTTypeConformsTo</key><array><string>public.data</string></array>
<key>UTTypeTagSpecification</key><dict><key>public.filename-extension</key><array><string>op</string></array></dict>
</dict></array>
</dict></plist>\n`;
}
function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status}).`);
}
export async function installFileOpener({ destination = join(homedir(), 'Applications', 'OpenPencil Canvas.app'), setDefault = false } = {}) {
  if (process.platform !== 'darwin') throw new Error('The Finder launcher currently supports macOS only.');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
  destination = resolve(destination);
  try { await access(destination); throw new Error(`Already exists: ${destination}. Move the old launcher aside before reinstalling.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const root = fileURLToPath(new URL('../', import.meta.url));
  await mkdir(dirname(destination), { recursive: true });
  const stage = await mkdtemp(join(dirname(destination), '.openpencil-launcher-'));
  const app = join(stage, 'OpenPencil Canvas.app');
  const contents = join(app, 'Contents');
  try {
    await mkdir(join(contents, 'MacOS'), { recursive: true });
    await mkdir(join(contents, 'Resources', 'scripts'), { recursive: true });
    run('xcrun', ['swiftc', join(root, 'scripts/macos/OpenPencilCanvas.swift'), '-o', join(contents, 'MacOS/OpenPencilCanvas'), '-framework', 'Cocoa', '-framework', 'WebKit']);
    await writeFile(join(contents, 'Info.plist'), launcherPlist());
    await writeFile(join(contents, 'Resources/launcher.json'), JSON.stringify({ node: process.execPath }));
    await cp(join(root, 'scripts/open-file.mjs'), join(contents, 'Resources/scripts/open-file.mjs'));
    await cp(join(root, 'plugins'), join(contents, 'Resources/plugins'), { recursive: true });
    run('/usr/bin/codesign', ['--force', '--sign', '-', app]);
    await rename(app, destination);
  } finally { await rm(stage, { recursive: true, force: true }); }
  run('/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister', ['-f', destination]);
  if (setDefault) run(join(destination, 'Contents/MacOS/OpenPencilCanvas'), ['--set-default']);
  return destination;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--set-default')) throw new Error('Usage: npm run install-file-opener -- [--set-default]');
    const destination = await installFileOpener({ setDefault: args.includes('--set-default') });
    console.log(`Installed ${destination}\nUse Finder > Open With > OpenPencil Canvas${args.includes('--set-default') ? ' (now the default for .op)' : '; existing default handlers were not changed'}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
