import { requestToPromise } from './db.js';

export const createActivityRepository = (db) => ({
  list: () => requestToPromise(db.transaction('activities').objectStore('activities').getAll()),
  listByRange: (startISO, endISO) => requestToPromise(
    db.transaction('activities').objectStore('activities').index('occurredAt').getAll(IDBKeyRange.bound(startISO, endISO)),
  ),
});
