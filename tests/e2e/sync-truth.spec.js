import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await page.goto('./');
  await page.locator('#login-email').fill('sync-truth@example.com');
  await page.locator('#login-send-email').click();
  const code = (await page.locator('#login-demo-email').textContent()).match(/(\d{6})/)?.[1];
  expect(code).toBeTruthy();
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-gate')).toBeHidden();
}

async function revealNavigation(page) {
  const menuButton = page.locator('#mobile-menu');
  const sidebarOpen = await page.locator('#sidebar').evaluate((sidebar) => sidebar.classList.contains('open'));
  if (await menuButton.isVisible() && !sidebarOpen) {
    await menuButton.click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
  }
}

test('never presents unavailable cloud sync as connected or successful', async ({ page }) => {
  await completeDemoLogin(page);
  await expect(page.locator('.sync-state')).toHaveText('云端同步不可用 · 数据仅存本浏览器');

  await revealNavigation(page);
  await page.locator('.nav-item[data-section="jobs"]').press('Enter');
  await expect(page.locator('#page-jobs')).toHaveClass(/active/);
  await expect(page.locator('#sync-jobs')).toHaveText('云端同步不可用');
  await page.locator('#sync-jobs').press('Enter');
  await expect(page.locator('#toast-text')).toHaveText('未执行同步：当前未连接飞书，请使用本地导出备份');

  await revealNavigation(page);
  await expect(page.locator('.tool-nav[data-tool="feishu"]')).toContainText('未连接');
  await page.locator('.tool-nav[data-tool="feishu"]').press('Enter');
  await expect(page.locator('#tool-dialog-title')).toHaveText('飞书同步（未连接）');
  await expect(page.locator('#tool-dialog-body')).toContainText('当前未连接飞书');
  await expect(page.locator('#tool-dialog-body')).not.toContainText('已连接');
  await expect(page.locator('#tool-dialog-body')).not.toContainText('最近同步');
  await expect(page.locator('#tool-dialog-body')).not.toContainText('无冲突');
  await expect(page.locator('#tool-primary')).toHaveText('了解本地备份');
  await page.locator('#tool-primary').press('Enter');
  await expect(page.locator('#toast-text')).toHaveText('未执行同步：当前未连接飞书，请使用本地导出备份');
});
