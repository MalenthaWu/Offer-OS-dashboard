import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await page.goto('./');
  await page.locator('#login-email').fill('external-links@example.com');
  await page.locator('#login-send-email').click();
  const code = (await page.locator('#login-demo-email').textContent()).match(/(\d{6})/)?.[1];
  expect(code).toBeTruthy();
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-gate')).toBeHidden();
}

async function navigateToJobs(page) {
  const menuButton = page.locator('#mobile-menu');
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
  }
  await page.locator('.nav-item[data-section="jobs"]').click();
  await expect(page.locator('#page-jobs')).toHaveClass(/active/);
}

async function addJob(page, company, position, applyLink) {
  await page.getByRole('button', { name: '添加岗位' }).first().click();
  await page.locator('#new-company').fill(company);
  await page.locator('#new-position').fill(position);
  await page.locator('#new-link').fill(applyLink);
  await page.locator('#add-job-form').getByRole('button', { name: '加入岗位池' }).click();
}

test('rejects unsafe job links and opens safe links without an opener', async ({ page }) => {
  await completeDemoLogin(page);
  await navigateToJobs(page);

  await addJob(page, 'Unsafe Link Co', 'Product Intern', 'javascript:window.opener.__OFFER_OS_UNSAFE_LINK_MARKER__=true');
  await expect(page.locator('#add-job-dialog')).toBeVisible();
  await expect(page.locator('#toast-text')).toHaveText('保存失败：投递链接必须是安全的 http/https 绝对地址');
  await expect(page.locator('.job-card', { hasText: 'Unsafe Link Co' })).toHaveCount(0);

  await page.locator('#add-job-dialog .dialog-close').first().click();
  await addJob(page, 'Safe Link Co', 'Product Intern', 'https://example.com/apply');
  await expect(page.locator('#add-job-dialog')).toBeHidden();
  const card = page.locator('.job-card', { hasText: 'Safe Link Co' });
  await expect(card).toHaveCount(1);

  await page.evaluate(() => {
    window.__offerOsExternalLinkCalls = [];
    window.open = (...args) => {
      const popup = { opener: window };
      window.__offerOsExternalLinkCalls.push({ args, popup });
      return popup;
    };
  });
  await card.getByRole('button', { name: '查看详情' }).click();
  await page.locator('#detail-delivery .dv-action').click();
  expect(await page.evaluate(() => ({
    calls: window.__offerOsExternalLinkCalls.map(({ args }) => args),
    openerWasSevered: window.__offerOsExternalLinkCalls[0]?.popup.opener === null,
  }))).toEqual({
    calls: [['https://example.com/apply', '_blank', 'noopener,noreferrer']],
    openerWasSevered: true,
  });

  await page.locator('#job-detail-dialog .dialog-close').first().click();
  await card.evaluate((element) => { element.dataset.applyLink = 'javascript:window.opener.__OFFER_OS_UNSAFE_LINK_MARKER__=true'; });
  await page.evaluate(() => {
    window.__OFFER_OS_UNSAFE_LINK_MARKER__ = false;
    window.__offerOsExternalLinkCalls = [];
  });
  await card.getByRole('button', { name: '查看详情' }).click();
  await page.locator('#detail-delivery .dv-action').click();
  await expect(page.locator('#toast-text')).toHaveText('无法打开：投递链接必须是安全的 http/https 绝对地址');
  expect(await page.evaluate(() => ({
    marker: window.__OFFER_OS_UNSAFE_LINK_MARKER__,
    opened: window.__offerOsExternalLinkCalls.length,
  }))).toEqual({ marker: false, opened: 0 });
});
