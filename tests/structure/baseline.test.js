import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import playwrightConfig from '../../playwright.config.js';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const legacyApp = readFileSync(new URL('../../src/legacy/legacy-app.js', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const document = new JSDOM(html).window.document;

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

  it('uses cross-platform Playwright commands', () => {
    expect(packageJson.scripts['test:e2e']).toBe('playwright test');
    expect(playwrightConfig.webServer.command).toBe('npm run dev -- --host 127.0.0.1 --port 4174');
    expect(playwrightConfig.webServer.command).not.toContain('env -u');
  });

  it('keeps the legacy fallback JD tags mutable for Vite dependency scanning', () => {
    expect(legacyApp).toContain('const p = position.toLowerCase(); let tags = [];');
  });

  it('describes local demo access without verification or sync claims', () => {
    expect(legacyApp).not.toContain('邮箱已验证');
    expect(legacyApp).not.toContain('手机已验证');
    expect(legacyApp).not.toContain('多设备间同步');
    expect(legacyApp).toContain('本地演示访问');
    expect(legacyApp).toContain('数据只保存在当前浏览器');
  });

  it('documents the Node versions supported by the locked Vite major', () => {
    expect(readme).toContain('Node.js 22.12+');
    expect(readme).toContain('Node.js 20.19+');
    expect(readme).toContain('Node.js 21 不在 Vite 7 支持范围内');
    expect(readme).not.toContain('Node.js 20 或更高版本');
  });

  it('preserves each main workspace exactly once', () => {
    for (const id of ['page-dashboard', 'page-jobs', 'page-resume', 'page-interview', 'page-review']) {
      expect(document.querySelectorAll(`#${id}`)).toHaveLength(1);
    }
  });

  it('keeps the dashboard first-slice elements exactly once', () => {
    for (const selector of [
      '#heatmap-card',
      '.next-moment-compact',
      '.month-agenda',
      '#month-days',
    ]) {
      expect(document.querySelectorAll(selector)).toHaveLength(1);
    }
  });

  it('loads only the module entry', () => {
    expect(document.querySelectorAll('script[type="module"][src="/src/main.js"]')).toHaveLength(1);
    expect(document.querySelectorAll('style')).toHaveLength(0);
  });
});
