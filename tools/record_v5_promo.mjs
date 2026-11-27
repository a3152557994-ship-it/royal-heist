#!/usr/bin/env node
/**
 * Captures smooth 25fps real Metal-WebGL gameplay frame sequences and crisp high-res stills
 * from ./dist for Royal Heist v5.0 (Blender 5.2 sculpted GLBs + Poly Haven PBR + Moonlit HDRI).
 * Saves raw frames into /tmp/rh-v5-media-raw/ (auto-cleaned by compose_v5_media.py after encoding).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'rh-v5-media-raw');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

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
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
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

const debugPort = 19622 + Math.floor(Math.random() * 200);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-v5-chrome-'));

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
    '--window-size=1280,960',
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

  const snapPng = async (outPath) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(r.data, 'base64'));
  };

  const snapJpg = async (outPath, quality = 88) => {
    const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality });
    fs.writeFileSync(outPath, Buffer.from(r.data, 'base64'));
  };

  const keyDown = (key, code, vk) =>
    cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
  const keyUp = (key, code, vk) =>
    cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });

  const clickButtonMatching = (regexStr) =>
    evalJs(`(() => {
      const re = new RegExp(${JSON.stringify(regexStr)});
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(el => re.test(el.innerText));
      if (b) { b.click(); return b.innerText.trim(); }
      return null;
    })()`);

  /**
   * Captures a sequence of frames cleanly at ~15fps real-time (encoded smoothly to 25fps via minterpolate/fps)
   * while running timed gameplay key scripts!
   */
  async function recordClip(dirName, totalMs, actions = []) {
    const dir = path.join(OUT, dirName);
    fs.mkdirSync(dir, { recursive: true });
    const start = Date.now();
    const sorted = actions.map((a) => ({ ...a, done: false })).sort((a, b) => a.at - b.at);
    let idx = 0;
    while (true) {
      const elapsed = Date.now() - start;
      for (const act of sorted) {
        if (!act.done && elapsed >= act.at) {
          act.done = true;
          await act.fn();
        }
      }
      if (elapsed >= totalMs) break;
      const fName = path.join(dir, `f_${String(idx).padStart(4, '0')}.jpg`);
      await snapJpg(fName, 90);
      idx++;
      await sleep(30);
    }
    // Release any keys safely
    for (const [k, c, vk] of [
      ['w', 'KeyW', 87],
      ['a', 'KeyA', 65],
      ['s', 'KeyS', 83],
      ['d', 'KeyD', 68],
      ['Shift', 'ShiftLeft', 16],
    ]) {
      await keyUp(k, c, vk);
    }
    console.log(`RECORDED ${dirName}: ${idx} frames in ${Date.now() - start}ms`);
    return idx;
  }

  const setHudHidden = (hidden) =>
    evalJs(`(() => {
      document.querySelectorAll('header').forEach(el => { el.style.visibility = ${hidden} ? 'hidden' : ''; });
      const canvas = document.querySelector('canvas');
      if (canvas && canvas.parentElement && canvas.parentElement.parentElement) {
        const container = canvas.parentElement.parentElement;
        [...container.children].forEach(ch => {
          if (!ch.contains(canvas)) ch.style.visibility = ${hidden} ? 'hidden' : '';
        });
      }
      // Also hide Lobby overlay text/cards when capturing clean Lobby 3D still
      document.querySelectorAll('main, section, footer').forEach(el => {
        if (!el.contains(canvas)) el.style.visibility = ${hidden} ? 'hidden' : '';
      });
      // Hide direct overlay siblings inside root wrapper
      const root = document.getElementById('root');
      if (root && canvas) {
        root.querySelectorAll('div').forEach(div => {
          if (!div.contains(canvas) && !canvas.contains(div)) {
            const st = getComputedStyle(div);
            if (st.position === 'absolute' || st.position === 'fixed') {
              div.style.visibility = ${hidden} ? 'hidden' : '';
            }
          }
        });
      }
    })()`);

  await cdp('Page.enable');
  await cdp('Runtime.enable');

  // === PART A: 100% PURE HUD-FREE HIGH-RES 3D STILLS FOR COVERS (1200x900) ===
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp('Page.navigate', { url: baseUrl });
  await sleep(3200);
  await setHudHidden(true);
  await sleep(120);
  await snapPng(path.join(OUT, 'still_lobby_4x3.png'));
  await setHudHidden(false);

  // Enter Heshen Manor gameplay
  await clickButtonMatching('夜行潜入|立即开摸');
  await sleep(1400);
  await clickButtonMatching('知道了|开始夜探摸金');
  await sleep(600);
  await setHudHidden(true);
  await sleep(120);
  await snapPng(path.join(OUT, 'still_pier_4x3.png'));
  await setHudHidden(false);

  // Walk into main courtyard in front of folding screen & patrolling guards
  await keyDown('w', 'KeyW', 87);
  await sleep(2250);
  await keyUp('w', 'KeyW', 87);
  await sleep(300);
  await setHudHidden(true);
  await sleep(120);
  await snapPng(path.join(OUT, 'still_courtyard_4x3.png'));
  await setHudHidden(false);

  // Walk right around screen & throw smoke bomb for dramatic action shot!
  await keyDown('d', 'KeyD', 68);
  await sleep(1100);
  await keyUp('d', 'KeyD', 68);
  await keyDown('w', 'KeyW', 87);
  await sleep(1250);
  await keyUp('w', 'KeyW', 87);
  await keyDown('1', 'Digit1', 49);
  await keyUp('1', 'Digit1', 49);
  await sleep(400);
  await setHudHidden(true);
  await sleep(120);
  await snapPng(path.join(OUT, 'still_action_4x3.png'));
  await setHudHidden(false);

  // === PART B: PORTRAIT 9:16 GAMEPLAY CLIPS (540x760 @ 2x -> 1080x1520 crisp WebGL window!) ===
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 540,
    height: 760,
    deviceScaleFactor: 2,
    mobile: false,
  });

  // CLIP 03: Three-map real 3D Lobby showcase! (portrait map buttons read "两淮盐运司", "和大人王府", "紫禁皇库")
  await cdp('Page.navigate', { url: baseUrl });
  await sleep(2400);
  await recordClip('clip03_maps', 9000, [
    { at: 2800, fn: () => clickButtonMatching('两淮盐运司') },
    { at: 5800, fn: () => clickButtonMatching('紫禁') },
  ]);

  // CLIP 01: Stealth infiltration at Heshen Manor (Pier -> Screen -> Guard sneak -> Smoke/Coin!)
  await clickButtonMatching('和大人王府');
  await sleep(500);
  await clickButtonMatching('夜行潜入|立即开摸');
  await sleep(1100);
  await clickButtonMatching('知道了|开始夜探摸金');
  await sleep(400);
  await recordClip('clip01_stealth', 9500, [
    { at: 500, fn: () => keyDown('w', 'KeyW', 87) },
    { at: 2800, fn: () => keyUp('w', 'KeyW', 87) },
    { at: 3000, fn: () => keyDown('d', 'KeyD', 68) },
    { at: 4300, fn: () => keyUp('d', 'KeyD', 68) },
    { at: 4400, fn: () => keyDown('w', 'KeyW', 87) },
    { at: 6300, fn: () => keyUp('w', 'KeyW', 87) },
    { at: 6400, fn: async () => { await keyDown('2', 'Digit2', 50); await keyUp('2', 'Digit2', 50); } },
    { at: 7400, fn: async () => { await keyDown('1', 'Digit1', 49); await keyUp('1', 'Digit1', 49); } },
    { at: 7800, fn: () => keyDown('a', 'KeyA', 65) },
    { at: 9100, fn: () => keyUp('a', 'KeyA', 65) },
  ]);

  // CLIP 02: Salt Office GUARANTEED open-chest route (portrait card label is "两淮盐运司"):
  // spawn(750,1080) -> N(1.05s -> y~845) -> E(1.70s -> ch_4 at 1120,840, zero guards!) -> open chest & soar rarity beam -> sprint back W+S toward Wupeng boat!
  await cdp('Page.navigate', { url: baseUrl });
  await sleep(1800);
  await clickButtonMatching('两淮盐运司');
  await sleep(400);
  await clickButtonMatching('夜行潜入|立即开摸');
  await sleep(1100);
  await clickButtonMatching('知道了|开始夜探摸金');
  await sleep(300);
  await recordClip('clip02_loot', 10000, [
    { at: 200, fn: () => keyDown('w', 'KeyW', 87) },
    { at: 1280, fn: () => keyUp('w', 'KeyW', 87) },
    { at: 1320, fn: () => keyDown('d', 'KeyD', 68) },
    { at: 3080, fn: () => keyUp('d', 'KeyD', 68) },
    // Lockpick RosewoodChest ch_4 (1.3s -> lid swings open + soaring rarity beam + loot toast!)
    { at: 5800, fn: () => keyDown('Shift', 'ShiftLeft', 16) },
    { at: 5820, fn: () => keyDown('a', 'KeyA', 65) },
    { at: 7200, fn: () => keyUp('a', 'KeyA', 65) },
    { at: 7220, fn: () => keyDown('s', 'KeyS', 83) },
    { at: 8300, fn: () => keyUp('s', 'KeyS', 83) },
    { at: 8320, fn: () => keyUp('Shift', 'ShiftLeft', 16) },
  ]);

  // Also grab a 100% pure HUD-free vertical still from Heshen Manor gameplay for Xiaohongshu 3:4 cover!
  await cdp('Page.navigate', { url: baseUrl });
  await sleep(1600);
  await clickButtonMatching('和大人王府');
  await sleep(400);
  await clickButtonMatching('夜行潜入|立即开摸');
  await sleep(1000);
  await clickButtonMatching('知道了|开始夜探摸金');
  await sleep(300);
  await keyDown('w', 'KeyW', 87);
  await sleep(2300);
  await keyUp('w', 'KeyW', 87);
  await sleep(300);
  await setHudHidden(true);
  await sleep(120);
  await snapPng(path.join(OUT, 'still_vertical_courtyard.png'));
  await setHudHidden(false);

  console.log('RECORD_V5_PROMO_COMPLETE ->', OUT);
} finally {
  try { ws?.close(); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
  server.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}
