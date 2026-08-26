// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/app/store.js';
import { initJobsController } from '../../src/modules/jobs/jobs-controller.js';

function createRoot() {
  document.body.innerHTML = `
    <form id="add-job-form"><input name="company" value="OpenAI"><input name="position" value="Product Intern"><input name="batch" value="日常实习"><button type="submit">保存</button></form>
    <input id="job-search"><select id="batch-filter"><option value="all">全部</option><option value="日常实习">日常实习</option></select>
    <div id="kanban-board"><section class="kanban-col" data-stage="关注"><span class="col-count"></span><button class="add-card"></button></section><section class="kanban-col" data-stage="已投递"><span class="col-count"></span><button class="add-card"></button></section></div>`;
  return document;
}

afterEach(() => document.body.replaceChildren());

describe('initJobsController', () => {
  it('creates through the service and renders the changed store state', async () => {
    const root = createRoot();
    const store = createAppStore();
    const service = {
      create: vi.fn(async (input) => store.setJobs([{ id: 'job-1', ...input, stage: '关注' }])),
      changeStage: vi.fn(),
      remove: vi.fn(),
    };

    initJobsController({ root, store, service, showToast: vi.fn() });
    root.querySelector('#add-job-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(service.create).toHaveBeenCalledOnce());

    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
      company: 'OpenAI', position: 'Product Intern', batch: '日常实习', stage: '关注',
    }));
    expect(root.querySelector('.job-card')).not.toBeNull();
  });

  it('cleans up a prior initialization before binding the controller again', async () => {
    const root = createRoot();
    const store = createAppStore();
    const service = { create: vi.fn(), move: vi.fn(), remove: vi.fn() };

    initJobsController({ root, store, service, showToast: vi.fn() });
    initJobsController({ root, store, service, showToast: vi.fn() });
    root.querySelector('#add-job-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(service.create).toHaveBeenCalledOnce());
  });

  it('delegates detail and delete actions to persistent handlers', async () => {
    const root = createRoot();
    const store = createAppStore({ jobs: [{ id: 'job-1', company: 'OpenAI', position: 'Product Intern', batch: '日常实习', stage: '关注' }] });
    const detail = vi.fn();
    const service = { create: vi.fn(), move: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) };
    root.defaultView.__OFFER_OS_OPEN_JOB_DETAIL__ = detail;
    root.defaultView.confirm = vi.fn(() => true);

    initJobsController({ root, store, service, showToast: vi.fn() });
    root.querySelector('[data-job-action="detail"]').click();
    root.querySelector('[data-job-action="delete"]').click();

    expect(detail).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(service.remove).toHaveBeenCalledWith('job-1'));
  });
});
