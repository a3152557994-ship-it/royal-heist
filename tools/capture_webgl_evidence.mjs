#!/usr/bin/env node
/**
 * Self-contained real-Chrome Metal WebGL screenshot & console-error verifier for royal-heist.
 * Serves ./dist on an ephemeral localhost port, launches an isolated headless Chrome instance,
 * captures Lobby + Pier + Courtyard live gameplay PNGs into ./evidence/, checks console errors & FPS,
 * and cleans up all temporary processes and profile dirs automatically.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const EVIDENCE = path.join(ROOT, 'evidence');
fs.mkdirSync(EVIDENCE, { recursive: true });

const prefix = process.argv[2] || 'live-v1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const full = path.resolve(DIST, rel);
  if (!full.startsWith(DIST) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(full).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/`;

const debugPort = 19222 + Math.floor(Math.random() * 400);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-webgl-'));

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1280,800',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const resp = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const list = await resp.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Timed out waiting for headless Chrome DevTools');
}

let ws;
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

try {
  const wsUrl = await waitForWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (type === 'error' || type === 'warning') consoleErrors.push(`[${type}] ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(msg.params.exceptionDetails?.text || 'Exception');
    } else if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
      }
    }
  });

  const cdp = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evalJs = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return r.result?.value;
  };

  const snap = async (filename) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(EVIDENCE, filename);
    fs.writeFileSync(outPath, Buffer.from(r.data, 'base64'));
    console.log('CAPTURED', outPath);
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp('Page.navigate', { url: baseUrl });
  // Wait for GLB models + Moonlit HDRI PMREM to finish loading and rendering smoothly
  await sleep(3200);
  await snap(`${prefix}-lobby.png`);

  // Click primary start raid button in Lobby!
  const clickedStart = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button')];
    const start = btns.find(b => /夜行潜入|立即开摸/.test(b.innerText));
    if (start) { start.click(); return start.innerText.trim(); }
    return null;
  })()`);
  console.log('CLICKED_START:', clickedStart);
  await sleep(1600);

  // Dismiss onboarding modal if present so we capture crisp unobstructed 3D gameplay!
  const dismissedGuide = await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button')];
    const ok = btns.find(b => /知道了|开始夜探摸金/.test(b.innerText));
    if (ok) { ok.click(); return ok.innerText.trim(); }
    return null;
  })()`);
  console.log('DISMISSED_GUIDE:', dismissedGuide);
  await sleep(1200);
  await snap(`${prefix}-pier.png`);

  // Walk North into the main palace courtyard using real W key hold!
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await sleep(2300);
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await sleep(500);
  await snap(`${prefix}-courtyard.png`);

  // Walk slightly Northeast toward guards & chests to capture closer guard/chest/pillar lighting!
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  await sleep(1400);
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  await sleep(500);
  await snap(`${prefix}-action.png`);

  // Measure real 60-frame average FPS in live WebGL!
  const fps = await evalJs(`new Promise(resolve => {
    let frames = 0;
    const t0 = performance.now();
    function tick() {
      frames++;
      const dt = performance.now() - t0;
      if (dt >= 1000) resolve(Math.round((frames * 1000) / dt));
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })`);
  console.log('LIVE_WEBGL_FPS:', fps);
  console.log('FAILED_REQUESTS:', JSON.stringify(failedRequests));
  console.log('PAGE_ERRORS:', JSON.stringify(pageErrors));
  console.log('CONSOLE_WARNINGS_ERRORS:', JSON.stringify(consoleErrors));
} finally {
  try { ws?.close(); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  server.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}
