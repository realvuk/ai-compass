// A minimal Chrome DevTools Protocol driver with no dependencies (Node 22+ for the built-in WebSocket).
// It serves this folder on a random local port, starts headless Chrome and lets a script drive one page.
// Used by tools/e2e.mjs (browser tests) and tools/capture.mjs (screenshots, preview image, demo video).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

export async function serve(root = ROOT) {
  const base = normalize(root);
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(base, p));
    if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + server.address().port + '/', close: () => server.close() };
}

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(existsSync);

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Opens one page. Options: width, height, scale (device pixel ratio), mobile (touch + mobile viewport),
// dark (prefers-color-scheme), reducedMotion (prefers-reduced-motion), js (false disables JavaScript).
export async function open(opts = {}) {
  if (!CHROME) throw new Error('Chrome not found. Set the CHROME environment variable to its executable.');
  const { width = 1280, height = 800, scale = 1, mobile = false, dark = false, reducedMotion = false, js = true } = opts;
  const dir = await mkdtemp(join(tmpdir(), 'aic-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) resolve(m[1]); });
    proc.on('exit', () => reject(new Error('Chrome exited early: ' + buf.slice(-400))));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const waits = new Map(), listeners = new Set();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waits.has(m.id)) {
      const [res, rej] = waits.get(m.id); waits.delete(m.id);
      if (m.error) rej(new Error(m.error.message)); else res(m.result);
    } else listeners.forEach(f => f(m));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    waits.set(++id, [res, rej]); ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cmd = (method, params) => send(method, params, sessionId);
  const once = name => new Promise(r => { const f = m => { if (m.method === name) { listeners.delete(f); r(m.params); } }; listeners.add(f); });

  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  if (mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true });
  if (!js) await cmd('Emulation.setScriptExecutionDisabled', { value: true });
  await cmd('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });

  const errors = [];
  listeners.add(m => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  });

  const page = {
    errors, cmd, on: f => listeners.add(f), off: f => listeners.delete(f),
    async goto(url) {
      // a change of #fragment alone stays in the same document and fires no load event
      const loaded = Promise.race([once('Page.loadEventFired'), once('Page.navigatedWithinDocument')]);
      await cmd('Page.navigate', { url }); await loaded;
      if (js) await page.eval('document.fonts.ready.then(() => 1)');
    },
    // Evaluates an expression in the page under test (promises are awaited) and returns its JSON value.
    // This is the DevTools Runtime.evaluate call, not JavaScript eval(): development tooling only, and the
    // expressions come from the test and capture scripts in this folder, never from user input.
    async eval(expression) {
      const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    // Clicks the first element matching a selector (or, with text, the first whose text contains it).
    click(selector, text) {
      return page.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find(e => ${text ? `e.textContent.includes(${JSON.stringify(text)})` : 'true'});
        if (!el) throw new Error('no element for ' + ${JSON.stringify(selector + (text ? ' "' + text + '"' : ''))}); el.click(); })()`);
    },
    async key(key, code) {
      const base = { key, code: code || key, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined, text: key.length === 1 ? key : undefined };
      await cmd('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    text: selector => page.eval(`(document.querySelector(${JSON.stringify(selector)}) || {}).textContent || ''`),
    async shot(file, { full = false } = {}) {
      const params = { format: 'png' };
      if (full) {
        const { cssContentSize: s } = await cmd('Page.getLayoutMetrics');
        Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width: s.width, height: s.height, scale: 1 } });
      }
      const r = await cmd('Page.captureScreenshot', params);
      await writeFile(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() { try { ws.close(); } catch {} proc.kill(); await sleep(100); await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  };
  return page;
}
