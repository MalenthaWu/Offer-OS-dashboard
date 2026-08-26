import './legacy/legacy.css';

window.__OFFER_OS_FEATURES__ = Object.freeze({
  jobs: false,
  dashboard: false,
  backup: false,
});

await import('./legacy/legacy-app.js');
