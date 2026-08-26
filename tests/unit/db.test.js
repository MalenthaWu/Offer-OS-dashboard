import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openOfferOSDB } from '../../src/data/db.js';
import { DB_NAME, STORE_NAMES } from '../../src/data/schema.js';

afterEach(async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
});

describe('openOfferOSDB', () => {
  it('creates every v1 store and required indexes', async () => {
    const db = await openOfferOSDB();
    expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(Object.values(STORE_NAMES)));
    const tx = db.transaction(['jobs', 'activities']);
    expect([...tx.objectStore('jobs').indexNames]).toEqual(expect.arrayContaining(['stage', 'updatedAt']));
    expect([...tx.objectStore('activities').indexNames]).toEqual(expect.arrayContaining(['jobId', 'occurredAt', 'type']));
    db.close();
  });
});
