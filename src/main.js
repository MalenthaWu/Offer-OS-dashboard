import './legacy/legacy.css';
import { bootstrapOfferOS } from './bootstrap.js';
import { createAppStore } from './app/store.js';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';
import { createJobService } from './domain/job-service.js';
import { startLegacyWithDashboard } from './modules/dashboard/dashboard-startup.js';
import { initDashboardView } from './modules/dashboard/dashboard-view.js';
import { initJobsController } from './modules/jobs/jobs-controller.js';
import { initLocalDataControls } from './modules/settings/local-data-controls.js';

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
    const hasDatabase = Boolean(window.__OFFER_OS_DB__);
    window.__OFFER_OS_FEATURES__.jobs = hasDatabase;
    await startLegacyWithDashboard({
      target: window,
      root: document,
      store,
      loadLegacy: () => import('./legacy/legacy-app.js'),
      initDashboard: initDashboardView,
    });
    if (!hasDatabase) return;

    const service = createJobService({ db: window.__OFFER_OS_DB__, store });
    initJobsController({ root: document, store, service, showToast });
    window.__OFFER_OS_FEATURES__.backup = initLocalDataControls({
      root: document,
      db: window.__OFFER_OS_DB__,
      jobService: service,
      showToast,
    });
    try {
      await service.reload();
    } catch (error) {
      showToast(`保存失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  },
});
