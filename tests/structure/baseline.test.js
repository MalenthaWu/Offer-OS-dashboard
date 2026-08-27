import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import playwrightConfig from '../../playwright.config.js';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const legacyApp = readFileSync(new URL('../../src/legacy/legacy-app.js', import.meta.url), 'utf8');

describe('Vite shell', () => {
  it('covers the first slice at desktop, tablet, and mobile widths', () => {
    expect(playwrightConfig.projects?.map(({ name }) => name)).toEqual([
      'chromium-desktop-1440',
      'chromium-desktop-1024',
      'chromium-mobile-390',
    ]);
  });

  it('runs the mobile viewport in Chromium', () => {
    const mobileProject = playwrightConfig.projects?.find(({ name }) => name === 'chromium-mobile-390');
    expect(mobileProject?.use.browserName).toBe('chromium');
    expect(mobileProject?.use.viewport).toEqual({ width: 390, height: 664 });
  });

  it('uses a dedicated local server port for hermetic browser tests', () => {
    expect(playwrightConfig.use.baseURL).toBe('http://127.0.0.1:4174');
    expect(playwrightConfig.webServer.url).toBe('http://127.0.0.1:4174');
    expect(playwrightConfig.webServer.command).toContain('--port 4174');
  });

  it('keeps the legacy fallback JD tags mutable for Vite dependency scanning', () => {
    expect(legacyApp).toContain('const p = position.toLowerCase(); let tags = [];');
  });

  it('preserves each main workspace exactly once', () => {
    for (const id of ['page-dashboard', 'page-jobs', 'page-resume', 'page-interview', 'page-review']) {
      expect(html.split(`id="${id}"`)).toHaveLength(2);
    }
  });

  it('keeps the dashboard first-slice elements exactly once', () => {
    for (const selector of [
      'id="heatmap-card"',
      'class="next-moment-compact"',
      'class="panel month-agenda"',
      'id="month-days"',
    ]) {
      expect(html.split(selector)).toHaveLength(2);
    }
  });

  it('loads only the module entry', () => {
    expect(html).toContain('<script type="module" src="/src/main.js"></script>');
    expect(html).not.toMatch(/<style>[\s\S]+<\/style>/);
  });
});
