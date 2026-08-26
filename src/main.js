import './legacy/legacy.css';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';

window.__OFFER_OS_FEATURES__ = {
  jobs: false,
  dashboard: false,
  backup: false,
};

const db = await openOfferOSDB();
await migrateV1({ db, root: document });
window.__OFFER_OS_DB__ = db;
await import('./legacy/legacy-app.js');
