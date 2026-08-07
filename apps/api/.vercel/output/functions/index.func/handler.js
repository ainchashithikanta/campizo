const { buildApp } = require('./app.js');
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
