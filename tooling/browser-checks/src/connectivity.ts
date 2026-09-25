// S02 connectivity check in a real browser: a first-time visitor silently gets a Convex guest account and
// joins the game server. WEB_URL may point at a deployed build.
import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const WAIT_MS = 20_000;

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`  page error: ${error.message}`));
  await page.goto(`${WEB_URL}/?debug=connectivity`);
  await page
    .getByTestId('convex-status')
    .filter({ hasText: /guest [a-z0-9]{8,}/ })
    .waitFor({ timeout: WAIT_MS });
  console.info(`✓ ${await page.getByTestId('convex-status').innerText()}`);
  await page
    .getByTestId('server-status')
    .filter({ hasText: 'joined' })
    .waitFor({ timeout: WAIT_MS });
  console.info(`✓ ${await page.getByTestId('server-status').innerText()}`);

  // Same browser profile → same guest (token persisted), not a new account per visit.
  const firstGuest = await page.getByTestId('convex-status').innerText();
  await page.reload();
  await page
    .getByTestId('convex-status')
    .filter({ hasText: /guest [a-z0-9]{8,}/ })
    .waitFor({ timeout: WAIT_MS });
  const secondGuest = await page.getByTestId('convex-status').innerText();
  if (firstGuest !== secondGuest)
    throw new Error(`guest changed across reload: ${firstGuest} → ${secondGuest}`);
  console.info('✓ guest identity persists across reload');
  console.info('connectivity: PASS');
} catch (error) {
  console.error('connectivity: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
