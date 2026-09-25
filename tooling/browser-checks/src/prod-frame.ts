// Production-sandbox probe (PLAN §3 host integration). The Chain simulator frames games with a looser
// sandbox than chain.wtf, so this frames the game from a foreign origin with the exact production
// attributes and reports which browser capabilities survive. No casino host is present, so the
// bridge must also fall back to DemoHost within the handshake timeout (jam gallery hover case).
import { createServer } from 'node:http';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
// A different *local* origin: cross-origin to the game like production, but local so Chrome's
// local-network-access rules don't block framing 127.0.0.1; http so the dev server isn't mixed content.
const HOST_PORT = 9999;
const HOST_ORIGIN = `http://localhost:${HOST_PORT}`;
const PRODUCTION_SANDBOX = 'allow-scripts allow-same-origin';
const DEMO_FALLBACK_BUDGET_MS = 6_000;

const HOST_PAGE = `<!doctype html><title>prod frame</title><body style="margin:0">
  <iframe id="game" src="${WEB_URL}/?debug=casino" sandbox="${PRODUCTION_SANDBOX}"
    style="border:0;width:100vw;height:100vh"></iframe></body>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' }).end(HOST_PAGE);
}).listen(HOST_PORT);

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`${HOST_ORIGIN}/`);
  const frame = await (await page.waitForSelector('#game')).contentFrame();
  if (!frame) throw new Error('game frame missing');

  const started = Date.now();
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'mode: demo' })
    .waitFor({ timeout: DEMO_FALLBACK_BUDGET_MS });
  console.info(`✓ no host → DemoHost after ${Date.now() - started} ms`);

  // Sent as source text: tsx/esbuild would inject a `__name` helper into a serialized function.
  const report = (await frame.evaluate(`(async () => {
    const attempt = async (probe) => {
      try {
        const value = await probe();
        return value === null || value === undefined ? 'null' : String(value);
      } catch (error) {
        return 'blocked (' + (error && error.name ? error.name : 'error') + ')';
      }
    };
    return {
      popup: await attempt(() => (window.open('about:blank') ? 'opened' : null)),
      pointerLock: await attempt(() => document.body.requestPointerLock()),
      fullscreen: await attempt(() => document.documentElement.requestFullscreen()),
      clipboardWrite: await attempt(() => navigator.clipboard.writeText('ruckus').then(() => 'ok')),
      gamepads: await attempt(() => 'api ok (' + navigator.getGamepads().length + ' slots)'),
      webShare: await attempt(() => (typeof navigator.share === 'function' ? 'api present' : null)),
      localStorage: await attempt(() => {
        localStorage.setItem('ruckus:probe', '1');
        return localStorage.getItem('ruckus:probe') === '1' ? 'ok' : 'mismatch';
      }),
      webgpu: await attempt(() => (navigator.gpu ? 'navigator.gpu present' : null)),
      webgl2: await attempt(() => (document.createElement('canvas').getContext('webgl2') ? 'ok' : null)),
      audioContext: await attempt(() => new AudioContext().state),
    };
  })()`)) as Record<string, string>;
  for (const [capability, result] of Object.entries(report))
    console.info(`  ${capability.padEnd(15)} ${result}`);
  // The real hub (not the debug panel) must boot in the same sandbox: demo balance + a live canvas.
  await frame.goto(`${WEB_URL}/?preview`);
  await frame.getByText('DEMO', { exact: true }).waitFor({ timeout: DEMO_FALLBACK_BUDGET_MS });
  await frame.locator('canvas').waitFor({ state: 'attached', timeout: DEMO_FALLBACK_BUDGET_MS });
  console.info('✓ hub boots framed: demo balance shown, canvas attached');
  console.info('prod-frame probe: done');
} catch (error) {
  console.error('prod-frame probe: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
