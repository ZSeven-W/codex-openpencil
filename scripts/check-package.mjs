import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const marketplace = await json(join(root, '.agents/plugins/marketplace.json'));
assert.equal(marketplace.plugins.length, 1);
const entry = marketplace.plugins[0];
assert.ok(entry.source.path.startsWith('./'));
const pluginRoot = resolve(root, entry.source.path);
assert.ok(!relative(root, pluginRoot).startsWith('..'));
const manifest = await json(join(pluginRoot, 'plugin.json'));
const pkg = await json(join(root, 'package.json'));
assert.equal(manifest.name, entry.name);
assert.equal(manifest.version, pkg.version);
assert.equal(entry.policy.installation, 'AVAILABLE');
assert.equal(manifest.extensions['com.openai'].requires_local_executor, true);
for (const path of [manifest.extensions['com.openai'].onboardingSkill, './LICENSE']) {
  // LICENSE belongs to the plugin package too, not only the marketplace repo.
  assert.ok(path.startsWith('./'));
  const target = resolve(pluginRoot, path);
  assert.ok(!relative(pluginRoot, target).startsWith('..'));
  assert.ok((await stat(target)).isFile());
}
const mcp = await json(join(pluginRoot, 'mcp.json'));
assert.equal(mcp.mcpServers.codex_openpencil.type, 'stdio');
assert.equal(mcp.mcpServers.codex_openpencil.command, 'node');
for (const arg of mcp.mcpServers.codex_openpencil.args) {
  const path = arg.replace('${PLUGIN_ROOT}', pluginRoot);
  assert.ok((await stat(path)).isFile());
}
for (const asset of ['app.html', 'panel.html', 'panel.css', 'panel.js']) {
  assert.ok((await stat(join(pluginRoot, 'ui', asset))).isFile(), `Missing canvas asset: ${asset}`);
}
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await scan(path);
    else {
      // Git may check text out with CRLF on Windows; validate content, not line endings.
      const body = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
      assert.ok(!body.includes('/Users/fini/'), `Machine path in ${path}`);
      assert.ok(body.split('\n').length <= 800, `File exceeds 800 lines: ${path}`);
      if (entry.name === 'SKILL.md') {
        assert.match(body, /^---\nname: [a-z0-9-]+\ndescription: .+\n---/);
        const matches = [...body.matchAll(/\]\(([^)]+)\)/g)];
        for (const [, link] of matches) {
          if (/^https?:/.test(link)) continue;
          const target = resolve(dir, link);
          assert.ok(!relative(pluginRoot, target).startsWith('..'), `Escaping reference ${link}`);
          assert.ok((await stat(target)).isFile(), `Missing reference ${link}`);
        }
      }
    }
  }
}
await scan(pluginRoot);
console.log('Plugin identity, MCP paths, skill references, portability and license: OK');
