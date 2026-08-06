const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// The api package lives in a pnpm workspace; node_modules/.pnpm is at the workspace root.
const apiRoot = path.resolve(__dirname, '..');
let workspaceRoot = apiRoot;
while (workspaceRoot !== path.dirname(workspaceRoot)) {
  if (fs.existsSync(path.join(workspaceRoot, 'pnpm-workspace.yaml'))) break;
  workspaceRoot = path.dirname(workspaceRoot);
}
const root = workspaceRoot;
// Vercel scans .vercel/output within the rootDirectory (apps/api).
const outDir = path.join(apiRoot, '.vercel', 'output');

// 1. Build the application (turbo -> dist/src/server.js) and ensure node_modules present.
execSync('pnpm exec turbo run build --filter=@college-hub/api...', {
  cwd: root,
  stdio: 'inherit'
});

const funcDir = path.join(outDir, 'functions', 'index.func');
fs.rmSync(funcDir, { recursive: true, force: true });
fs.mkdirSync(funcDir, { recursive: true });

// Force CJS module mode inside the function dir (the api package.json has "type":"module").
fs.writeFileSync(
  path.join(funcDir, 'package.json'),
  JSON.stringify({ type: 'commonjs', name: 'campizo-lambda', version: '1.0.0' }, null, 2)
);

// 2. Bundle the entire app into a single CJS file with esbuild.
//    argon2 is a native addon: keep it external so its prebuild binary is loaded
//    at runtime, and copy the argon2 package dir into the function.
const esbuild = require('esbuild');
esbuild.buildSync({
  entryPoints: [path.join(apiRoot, 'dist', 'src', 'server.js')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['argon2'],
  outfile: path.join(funcDir, 'app.js'),
  logLevel: 'error',
  absWorkingDir: apiRoot
});

// 3. Copy the argon2 package (with native prebuilds) to node_modules inside the function.
const nmDest = path.join(funcDir, 'node_modules');
fs.rmSync(nmDest, { recursive: true, force: true });

function findPnpmPkgEntry(name) {
  const pnpmDir = path.join(root, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (entry.startsWith(name + '@')) {
        const candidate = path.join(pnpmDir, entry, 'node_modules', name);
        if (fs.existsSync(candidate)) return path.join(pnpmDir, entry);
      }
    }
  }
  return null;
}

function copyDep(name) {
  const pnpmEntry = findPnpmPkgEntry(name);
  let copied = false;
  if (pnpmEntry) {
    const nmBlock = path.join(pnpmEntry, 'node_modules');
    if (fs.existsSync(nmBlock)) {
      fs.cpSync(nmBlock, nmDest, { recursive: true });
      copied = true;
    }
  }
  if (!copied) {
    const src = path.join(root, 'node_modules', name);
    if (!fs.existsSync(src)) {
      console.warn('[vercel-output] WARNING: could not locate ' + name);
      return false;
    }
    const dest = path.join(nmDest, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
  return true;
}

const depsToCopy = ['argon2'];
for (const d of depsToCopy) {
  copyDep(d);
}

// 4. Lambda entry: import buildApp, reuse a single Fastify instance across warm invocations.
//    Use app.inject() so we don't depend on a real Node http server; manually serialize the
//    Fastify Response into the Vercel-provided res object.
fs.writeFileSync(
  path.join(funcDir, 'handler.js'),
  `const { buildApp } = require('./app.js');
let appPromise;
async function getApp() {
  if (!appPromise) { appPromise = buildApp().then(a => a.ready().then(() => a)); }
  return appPromise;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on('data', (c) => { chunks.push(c); len += c.length; if (len > 10 * 1024 * 1024) { req.destroy(); reject(new Error('body too large')); } });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
module.exports = async function handler(req, res) {
  try {
    const app = await getApp();
    const url = req.url || '/';
    const method = req.method || 'GET';
    const headers = {};
    for (const k of Object.keys(req.headers || {})) { headers[k] = req.headers[k]; }
    let body;
    try { body = await readBody(req); } catch (e) { body = null; }
    let payload;
    if (body && body.length > 0) {
      const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
      if (ct.includes('application/json')) { payload = body.toString('utf8'); }
      else if (ct.includes('text/plain')) { payload = body.toString('utf8'); }
      else { payload = body; }
    }
    const injectOpts = { method, url, headers, payload };
    const reply = await app.inject(injectOpts);
    res.statusCode = reply.statusCode;
    for (const [k, v] of Object.entries(reply.headers || {})) {
      if (Array.isArray(v)) { res.setHeader(k, v); } else { res.setHeader(k, String(v)); }
    }
    res.end(reply.body);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'server error', detail: String(err && err.message ? err.message : String(err)) }));
  }
};
`
);

// 5. Config + routing.
fs.writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify(
    { runtime: 'nodejs20.x', handler: 'handler.js', launcherType: 'Nodejs', maxDuration: 30 },
    null,
    2
  )
);

fs.mkdirSync(path.join(outDir, 'static'), { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'config.json'),
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/' }] }, null, 2)
);

const sz = (getSize(funcDir) / 1024 / 1024).toFixed(1);
console.log('[vercel-output] function size: ' + sz + 'MB');
console.log('[vercel-output] Build Output API v3 generated at', outDir);

function getSize(p) {
  let total = 0;
  for (const f of fs.readdirSync(p)) {
    const fp = path.join(p, f);
    const st = fs.statSync(fp);
    total += st.isDirectory() ? getSize(fp) : st.size;
  }
  return total;
}
