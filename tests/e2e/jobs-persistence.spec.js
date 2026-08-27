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

async function navigateTo(page, section) {
  const menuButton = page.locator('#mobile-menu');
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
  }
  await page.locator(`.nav-item[data-section="${section}"]`).click();
}

async function dragJobToStage(page, jobId, stage, beforeId = null) {
  const source = page.locator(`.job-card[data-id="${jobId}"]`);
  const column = page.locator(`.kanban-col[data-stage="${stage}"]`);
  const target = beforeId ? page.locator(`.job-card[data-id="${beforeId}"]`) : column;
  const options = { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) };
  if (beforeId) options.clientY = (await target.boundingBox()).y + 1;
  await source.dispatchEvent('dragstart', options);
  await target.dispatchEvent('dragover', options);
  await target.dispatchEvent('drop', options);
  await source.dispatchEvent('dragend', options);
}

async function addJob(page, company, position) {
  await page.getByRole('button', { name: '添加岗位' }).first().click();
  await page.locator('#new-company').fill(company);
  await page.locator('#new-position').fill(position);
  await page.locator('#add-job-form').getByRole('button', { name: '加入岗位池' }).click();
  await expect(page.locator('#add-job-dialog')).toBeHidden();
  const card = page.locator('.job-card').filter({ hasText: company }).filter({ hasText: position });
  await expect(card).toHaveCount(1);
  return card.getAttribute('data-id');
}

test('keeps created jobs and stage changes after reload', async ({ page }, testInfo) => {
  await completeDemoLogin(page);
  await navigateTo(page, 'jobs');
  const openAiId = await addJob(page, 'OpenAI', 'Product Intern');
  const anthropicId = await addJob(page, 'Anthropic', 'Research Intern');

  const card = page.locator('.job-card').filter({ hasText: 'OpenAI' }).filter({ hasText: 'Product Intern' });
  await expect(card).toBeVisible();

  await page.reload();
  await navigateTo(page, 'jobs');
  await expect(page.locator('.kanban-col[data-stage="关注"] .job-card', { hasText: 'OpenAI' })).toBeVisible();

  await expect(card).toHaveCount(1);
  if (testInfo.project.name === 'chromium-mobile-390') {
    await page.locator(`.job-card[data-id="${openAiId}"] [data-job-action="stage"]`).selectOption('已投递');
    await page.locator(`.job-card[data-id="${anthropicId}"] [data-job-action="stage"]`).selectOption('已投递');
  } else {
    await dragJobToStage(page, openAiId, '已投递');
    await dragJobToStage(page, anthropicId, '已投递');
    await dragJobToStage(page, openAiId, '已投递', anthropicId);
  }
  await expect(page.locator('.kanban-col[data-stage="已投递"] .job-card', { hasText: 'OpenAI' })).toBeVisible();

  await page.getByRole('tab', { name: '表格' }).click();
  await expect(page.locator('#job-view-table')).toHaveClass(/active/);
  await page.getByRole('tab', { name: '看板' }).click();
  await page.locator('#job-search').fill('no matching jobs');
  await expect(page.locator('#kanban-empty')).toBeVisible();
  await page.locator('#job-search').fill('');

  await page.reload();
  await navigateTo(page, 'jobs');
  await expect(page.locator('.kanban-col[data-stage="已投递"] .job-card', { hasText: 'OpenAI' })).toBeVisible();
  const orderedIds = await page.locator('.kanban-col[data-stage="已投递"] .job-card').evaluateAll((cards) => cards.map((card) => card.dataset.id));
  expect(orderedIds.indexOf(openAiId)).toBeLessThan(orderedIds.indexOf(anthropicId));
});
