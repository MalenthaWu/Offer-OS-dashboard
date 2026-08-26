import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await page.goto('./');
  await page.locator('#login-email').fill('demo@example.com');
  await page.locator('#login-send-email').click();
  const demoText = await page.locator('#login-demo-email').textContent();
  const code = demoText.match(/(\d{6})/)?.[1];
  expect(code).toBeTruthy();
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-gate')).toBeHidden();
}

async function dragJobToStage(page, jobId, stage) {
  const source = page.locator(`.job-card[data-id="${jobId}"]`);
  const target = page.locator(`.kanban-col[data-stage="${stage}"]`);
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
}

test('keeps created jobs and stage changes after reload', async ({ page }) => {
  await completeDemoLogin(page);
  await page.locator('.nav-item[data-section="jobs"]').click();
  await page.getByRole('button', { name: '添加岗位' }).first().click();
  await page.locator('#new-company').fill('OpenAI');
  await page.locator('#new-position').fill('Product Intern');
  await page.locator('#add-job-form').getByRole('button', { name: '加入岗位池' }).click();

  const card = page.locator('.job-card').filter({ hasText: 'OpenAI' }).filter({ hasText: 'Product Intern' });
  await expect(card).toBeVisible();

  await page.reload();
  await page.locator('.nav-item[data-section="jobs"]').click();
  await expect(page.locator('.kanban-col[data-stage="关注"] .job-card', { hasText: 'OpenAI' })).toBeVisible();

  await expect(card).toHaveCount(1);
  const jobId = await card.getAttribute('data-id');
  await dragJobToStage(page, jobId, '已投递');
  await expect(page.locator('.kanban-col[data-stage="已投递"] .job-card', { hasText: 'OpenAI' })).toBeVisible();

  await page.reload();
  await page.locator('.nav-item[data-section="jobs"]').click();
  await expect(page.locator('.kanban-col[data-stage="已投递"] .job-card', { hasText: 'OpenAI' })).toBeVisible();
});
