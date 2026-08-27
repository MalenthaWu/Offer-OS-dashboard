import { expect, test } from '@playwright/test';

async function completeDemoLogin(page) {
  await page.goto('./');
  await page.locator('#login-email').fill('dashboard@example.com');
  await page.locator('#login-send-email').click();
  const code = (await page.locator('#login-demo-email').textContent()).match(/(\d{6})/)?.[1];
  expect(code).toBeTruthy();
  await page.locator('#login-code-email').fill(code);
  await page.locator('#login-submit').click();
  await expect(page.locator('#login-gate')).toBeHidden();
}

async function addJob(page, company, position) {
  await page.getByRole('button', { name: '添加岗位' }).first().click();
  await page.locator('#new-company').fill(company);
  await page.locator('#new-position').fill(position);
  await page.locator('#add-job-form').getByRole('button', { name: '加入岗位池' }).click();
  await expect(page.locator('#add-job-dialog')).toBeHidden();
  return page.locator('.job-card').filter({ hasText: company }).filter({ hasText: position }).getAttribute('data-id');
}

async function moveToSubmitted(page, jobId) {
  const source = page.locator(`.job-card[data-id="${jobId}"]`);
  const target = page.locator('.kanban-col[data-stage="已投递"]');
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
}

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('persists a newly submitted application in the dashboard total and today heat cell', async ({ page }) => {
  await completeDemoLogin(page);
  const today = localDateKey();
  const total = page.locator('.dash-stat').filter({ hasText: '已投递' }).locator('strong');
  const todayCell = page.locator(`#heat-grid [data-date="${today}"]`);
  const beforeTotal = Number(await total.textContent());
  const beforeToday = Number(await todayCell.getAttribute('data-count'));

  await page.locator('.nav-item[data-section="jobs"]').click();
  const jobId = await addJob(page, 'Dashboard Sync', 'Product Intern');
  await moveToSubmitted(page, jobId);
  await expect(page.locator('.kanban-col[data-stage="已投递"] .job-card', { hasText: 'Dashboard Sync' })).toBeVisible();

  await page.locator('.nav-item[data-section="dashboard"]').click();
  await expect(total).toHaveText(String(beforeTotal + 1));
  await expect(todayCell).toHaveAttribute('data-count', String(beforeToday + 1));

  await page.reload();
  await expect(total).toHaveText(String(beforeTotal + 1));
  await expect(todayCell).toHaveAttribute('data-count', String(beforeToday + 1));
});
