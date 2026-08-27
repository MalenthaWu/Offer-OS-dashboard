export async function bootstrapOfferOS({ openDatabase, migrate, root, target, startLegacy, logger = console }) {
  target.__OFFER_OS_DB__ = null;
  const persistence = { available: false, error: null };

  try {
    const db = await openDatabase();
    await migrate({ db, root });
    target.__OFFER_OS_DB__ = db;
    persistence.available = true;
  } catch (error) {
    persistence.error = error;
    logger.error('Offer OS database initialization failed; starting read-only legacy display.', error);
  }

  target.__OFFER_OS_PERSISTENCE__ = persistence;
  await startLegacy({ persistence });
}
