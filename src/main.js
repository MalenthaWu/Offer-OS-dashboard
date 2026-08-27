import './legacy/legacy.css';
import { bootstrapOfferOS } from './bootstrap.js';
import { createAppStore } from './app/store.js';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';
import { createJobService } from './domain/job-service.js';
import { disablePersistenceDependentControls } from './app/persistence-status.js';
import { startLegacyWithDashboard } from './modules/dashboard/dashboard-startup.js';
import { initDashboardView } from './modules/dashboard/dashboard-view.js';
import { initJobsController } from './modules/jobs/jobs-controller.js';
import { initLocalDataControls } from './modules/settings/local-data-controls.js';

window.__OFFER_OS_FEATURES__ = {
  jobs: false,
  dashboard: false,
  backup: false,
  legacyJobMutations: false,
  persistence: { available: false, state: 'initializing', error: null },
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
  startLegacy: async ({ persistence }) => {
    const setPersistenceUnavailable = (error) => {
      window.__OFFER_OS_FEATURES__.jobs = false;
      window.__OFFER_OS_FEATURES__.backup = false;
      window.__OFFER_OS_FEATURES__.dashboard = false;
      window.__OFFER_OS_FEATURES__.persistence = {
        available: false,
        state: 'unavailable',
        error: error instanceof Error ? error.message : '本地存储初始化失败',
      };
      disablePersistenceDependentControls({ root: document });
    };
    const hasDatabase = persistence.available;
    window.__OFFER_OS_FEATURES__.persistence = hasDatabase
      ? { available: true, state: 'loading', error: null }
      : { available: false, state: 'unavailable', error: persistence.error instanceof Error ? persistence.error.message : '本地存储初始化失败' };
    await startLegacyWithDashboard({
      target: window,
      root: document,
      store,
      loadLegacy: () => import('./legacy/legacy-app.js'),
      initDashboard: initDashboardView,
    });
    if (!hasDatabase) {
      setPersistenceUnavailable(persistence.error);
      return;
    }

    const service = createJobService({ db: window.__OFFER_OS_DB__, store });
    try {
      await service.reload();
    } catch (error) {
      setPersistenceUnavailable(error);
      return;
    }
    initJobsController({ root: document, store, service, showToast });
    window.__OFFER_OS_FEATURES__.jobs = true;
    window.__OFFER_OS_FEATURES__.backup = initLocalDataControls({
      root: document,
      db: window.__OFFER_OS_DB__,
      jobService: service,
      showToast,
    });
    window.__OFFER_OS_FEATURES__.persistence = { available: true, state: 'ready', error: null };
  },
});
