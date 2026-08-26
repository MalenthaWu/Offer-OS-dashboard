import './legacy/legacy.css';
import { bootstrapOfferOS } from './bootstrap.js';
import { createAppStore } from './app/store.js';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';
import { createJobService } from './domain/job-service.js';
import { initJobsController } from './modules/jobs/jobs-controller.js';

window.__OFFER_OS_FEATURES__ = {
  jobs: false,
  dashboard: false,
  backup: false,
};

const store = createAppStore();
const showToast = (message) => {
  const toast = document.querySelector('#toast');
  const toastText = document.querySelector('#toast-text');
  if (!toast || !toastText) return;
  toastText.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
};

await bootstrapOfferOS({
  openDatabase: openOfferOSDB,
  migrate: migrateV1,
  root: document,
  target: window,
  startLegacy: async () => {
    window.__OFFER_OS_FEATURES__.jobs = Boolean(window.__OFFER_OS_DB__);
    await import('./legacy/legacy-app.js');
    if (!window.__OFFER_OS_DB__) return;

    const service = createJobService({ db: window.__OFFER_OS_DB__, store });
    initJobsController({ root: document, store, service, showToast });
    try {
      await service.reload();
    } catch (error) {
      showToast(`保存失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  },
});
