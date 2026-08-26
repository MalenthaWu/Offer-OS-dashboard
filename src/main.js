import './legacy/legacy.css';
import { bootstrapOfferOS } from './bootstrap.js';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';

window.__OFFER_OS_FEATURES__ = {
  jobs: false,
  dashboard: false,
  backup: false,
};

await bootstrapOfferOS({
  openDatabase: openOfferOSDB,
  migrate: migrateV1,
  root: document,
  target: window,
  startLegacy: () => import('./legacy/legacy-app.js'),
});
