// Chicken lab shots: the ADR-008 cast in four tints across key clips, plus fps and errors.
// Usage: tsx src/chicken-lab.ts <outDir>   (web dev server on :5173)
import { chromium } from 'playwright-core';

const out = process.argv[2] ?? '/tmp';
const b = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu'],
});
const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
const errs: string[] = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 300));
});
await p.goto('http://localhost:5173/?debug=chicken', { timeout: 90000 });
await p.waitForTimeout(8000);
await p.screenshot({ path: `${out}/lab-idle.png` });
for (const c of ['run', 'shoot', 'kick', 'win']) {
  await p.getByRole('button', { name: c, exact: true }).click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/lab-${c}.png` });
}
// The motion layer and the hand socket: a stand-in blaster, a flap and a lean while shooting.
await p.getByRole('button', { name: 'shoot', exact: true }).click();
for (const k of ['prop', 'flap', 'lean'])
  await p.getByRole('button', { name: k, exact: true }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/lab-layer.png` });
await p.getByRole('button', { name: 'squash', exact: true }).click();
await p.waitForTimeout(60);
await p.screenshot({ path: `${out}/lab-squash.png` });
console.info('fps', await p.locator('text=/fps/').first().textContent());
console.info('errors', errs.slice(0, 5));
await b.close();
