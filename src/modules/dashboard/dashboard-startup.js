export async function startLegacyWithDashboard({ target, root, store, loadLegacy, initDashboard, deferDashboard = false }) {
  const enabled = Boolean(target.__OFFER_OS_DB__);
  const initializeDashboard = enabled && !deferDashboard;
  target.__OFFER_OS_FEATURES__.dashboard = initializeDashboard;

  await loadLegacy();
  if (initializeDashboard) initDashboard({ root, store });

  return enabled;
}
