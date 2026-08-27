import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await page.goto('./');
  await page.locator('#login-email').fill('legacy-smoke@example.com');
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

async function navigateTo(page, section) {
  await revealNavigation(page);
  await page.locator(`.nav-item[data-section="${section}"]`).click();
  await expect(page.locator(`#page-${section}`)).toHaveClass(/active/);
}

test('opens and safely exercises every retained workspace and utility', async ({ page }) => {
  await completeDemoLogin(page);

  await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
  const monthBefore = await page.locator('#month-title').textContent();
  await page.locator('#month-next').click();
  await expect(page.locator('#month-title')).not.toHaveText(monthBefore);
  await page.locator('#month-today').click();

  await navigateTo(page, 'jobs');
  await page.locator('#job-search').fill('ByteDance');
  await page.locator('#job-search').fill('');
  await page.locator('[data-job-view="portals"]').click();
  await expect(page.locator('#job-view-portals')).toHaveClass(/active/);
  await page.locator('#check-portals').click();
  await expect(page.locator('#toast-text')).toContainText('个官方入口已检查');

  await navigateTo(page, 'resume');
  await page.locator('#edit-resume').press('Enter');
  await expect(page.locator('#resume-paper')).toHaveAttribute('contenteditable', 'true');
  await page.locator('#edit-resume').press('Enter');
  await expect(page.locator('#resume-paper')).toHaveAttribute('contenteditable', 'false');

  await navigateTo(page, 'interview');
  await page.locator('#history-interview').press('Enter');
  await expect(page.locator('#toast-text')).toContainText('历史：5 场模拟');

  await navigateTo(page, 'review');
  await page.locator('#review-new').press('Enter');
  await page.locator('#review-transcript').fill('我在项目中用数据定位留存问题，并推动转化率提升 12%。');
  await page.locator('#review-suggest').press('Enter');
  await expect(page.locator('#review-suggestion')).toBeVisible();

  await revealNavigation(page);
  await page.locator('#profile-settings').press('Enter');
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('[data-settings-tab="api"]').press('Enter');
  await expect(page.locator('#settings-api-pane')).toBeVisible();
  await page.locator('#settings-close').press('Enter');

  for (const [tool, title] of [
    ['feishu', '飞书同步（未连接）'],
    ['scout', '岗位搜索器'],
    ['apply', '网申助手'],
    ['resume-autofill', '简历自动填写'],
  ]) {
    await revealNavigation(page);
    await page.locator(`.tool-nav[data-tool="${tool}"]`).press('Enter');
    await expect(page.locator('#tool-dialog')).toBeVisible();
    await expect(page.locator('#tool-dialog-title')).toHaveText(title);
    await page.locator('#tool-dialog .dialog-close').first().press('Enter');
  }
});
