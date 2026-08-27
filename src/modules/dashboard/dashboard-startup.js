export async function startLegacyWithDashboard({ target, root, store, loadLegacy, initDashboard }) {
  const enabled = Boolean(target.__OFFER_OS_DB__);
  target.__OFFER_OS_FEATURES__.dashboard = enabled;

  await loadLegacy();
  if (enabled) initDashboard({ root, store });

  return enabled;
}
