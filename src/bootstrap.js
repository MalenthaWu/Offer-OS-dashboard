export async function bootstrapOfferOS({ openDatabase, migrate, root, target, startLegacy, logger = console }) {
  target.__OFFER_OS_DB__ = null;

  try {
    const db = await openDatabase();
    await migrate({ db, root });
    target.__OFFER_OS_DB__ = db;
  } catch (error) {
    logger.error('Offer OS database initialization failed; starting legacy behavior without persistence.', error);
  }

  await startLegacy();
}
