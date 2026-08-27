import { expect, test } from '@playwright/test';

test('labels demo access and browser-local data truthfully', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.login-intro')).toContainText('本地演示访问');
  await expect(page.locator('.login-intro')).toContainText('数据只保存在当前浏览器');
  await expect(page.locator('.login-foot')).toContainText('不会创建云端账号');

  await page.locator('#login-email').fill('demo@example.com');
  await page.locator('#login-send-email').click();
  const demoText = await page.locator('#login-demo-email').textContent();
  const code = demoText.match(/(\d{6})/)?.[1];
  expect(code).toBeTruthy();
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();

  await expect(page.locator('#profile-sub')).toHaveText('本地演示访问');
  if (await page.locator('#mobile-menu').isVisible()) {
    await page.locator('#mobile-menu').click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
  }
  await page.locator('#profile-settings').press('Enter');
  await expect(page.locator('#settings-account-row')).toContainText('数据只保存在当前浏览器');
  await expect(page.locator('#settings-dialog')).not.toContainText('多设备间同步');
  await expect(page.locator('#settings-dialog')).not.toContainText('已验证');
});
