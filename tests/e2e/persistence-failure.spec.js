import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await expect(page.locator('#login-submit')).toHaveText('进入本地演示');
  if (!(await page.locator('#login-gate').isVisible())) return;
  await page.locator('#login-email').fill('demo@example.com');
  await page.locator('#login-send-email').click();
  const code = (await page.locator('#login-demo-email').textContent()).match(/(\d{6})/)?.[1];
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-gate')).toBeHidden();
}

async function navigateTo(page, section) {
  if (await page.locator('#mobile-menu').isVisible()) {
    await page.locator('#mobile-menu').click();
  }
  await page.locator(`.nav-item[data-section="${section}"]`).click();
}

test('keeps job changes disabled when IndexedDB is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
  });
  await page.goto('./');
  await completeDemoLogin(page);
  await navigateTo(page, 'jobs');

  await expect(page.locator('#persistence-unavailable')).toBeVisible();
  await expect(page.locator('#persistence-unavailable')).toContainText('本地存储不可用');
  await expect(page.locator('#top-add-job')).toBeDisabled();
  await expect(page.locator('.add-job-trigger').first()).toBeDisabled();

  await page.getByRole('tab', { name: '实习信息搜集' }).click();
  const poolButton = page.locator('.pool-button').first();
  await expect(poolButton).toBeDisabled();
  await poolButton.evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await expect(poolButton).toHaveText('加入岗位池');
  await expect(page.locator('#toast-text')).not.toContainText('机会已加入岗位看板');

  const cardsBefore = await page.locator('#kanban-board .job-card').count();
  await page.locator('#add-job-dialog').evaluate((dialog) => dialog.showModal());
  await page.locator('#add-job-form').evaluate((form) => {
    form.elements.company.value = 'Should Not Save';
    form.elements.position.value = 'Read-only Job';
  });
  await page.locator('#add-job-form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  await expect(page.locator('#add-job-dialog')).toBeVisible();
  await expect(page.locator('#kanban-board .job-card')).toHaveCount(cardsBefore);
  await expect(page.locator('#toast-text')).not.toContainText('已加入岗位池');
  await expect.poll(() => page.evaluate(() => window.__OFFER_OS_FEATURES__)).toMatchObject({
    jobs: false,
    backup: false,
    persistence: { available: false },
  });

  await page.reload();
  await completeDemoLogin(page);
  await navigateTo(page, 'jobs');
  await expect(page.locator('.job-card', { hasText: 'Should Not Save' })).toHaveCount(0);
});

test('keeps job changes disabled when the initial persistent reload fails', async ({ page }) => {
  await page.addInitScript(() => {
    const originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function patchedTransaction(...args) {
      const [storeNames, mode] = args;
      if (storeNames === 'jobs' && mode !== 'readwrite') throw new Error('Simulated jobs reload failure');
      return originalTransaction.apply(this, args);
    };
  });
  await page.goto('./');
  await completeDemoLogin(page);
  await navigateTo(page, 'jobs');

  await expect(page.locator('#persistence-unavailable')).toBeVisible();
  await navigateTo(page, 'dashboard');
  await expect(page.locator('#dashboard-persistence-unavailable')).toBeVisible();
  await expect(page.locator('.dash-stat strong')).toHaveText(['—', '—', '—', '—']);
  await expect(page.locator('#heat-grid .heat-cell')).toHaveCount(0);
  await expect(page.locator('#top-add-job')).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.__OFFER_OS_FEATURES__)).toMatchObject({
    jobs: false,
    backup: false,
    persistence: { available: false },
  });
});
