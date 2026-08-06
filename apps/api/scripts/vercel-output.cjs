const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.vercel', 'output');

execSync('pnpm exec turbo run build --filter=@college-hub/api...', {
  cwd: root,
  stdio: 'inherit'
});

const funcDir = path.join(outDir, 'functions', 'index.func');
fs.rmSync(funcDir, { recursive: true, force: true });
fs.mkdirSync(funcDir, { recursive: true });

fs.writeFileSync(
  path.join(funcDir, 'index.js'),
  `module.exports = async function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, time: Date.now() }));
};
`
);

fs.writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify(
    { runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', maxDuration: 10 },
    null,
    2
  )
);

fs.mkdirSync(path.join(outDir, 'static'), { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'config.json'),
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/' }] }, null, 2)
);

console.log('[vercel-output] Build Output API v3 generated at', outDir);
