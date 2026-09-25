import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { type Browser, chromium } from 'playwright-core';

const PLAYWRIGHT_CACHE = join(homedir(), 'Library/Caches/ms-playwright');

/** Prefer Playwright's own browser; fall back to any cached headless shell (offline-friendly). */
function cachedHeadlessShell(): string | undefined {
  if (!existsSync(PLAYWRIGHT_CACHE)) return undefined;
  const dir = readdirSync(PLAYWRIGHT_CACHE).find((name) =>
    name.startsWith('chromium_headless_shell-'),
  );
  if (!dir) return undefined;
  const binary = join(
    PLAYWRIGHT_CACHE,
    dir,
    'chrome-headless-shell-mac-arm64',
    'chrome-headless-shell',
  );
  return existsSync(binary) ? binary : undefined;
}

export async function launchBrowser(): Promise<Browser> {
  const bundled = chromium.executablePath();
  const executablePath = existsSync(bundled) ? bundled : cachedHeadlessShell();
  return chromium.launch(executablePath ? { executablePath } : {});
}
