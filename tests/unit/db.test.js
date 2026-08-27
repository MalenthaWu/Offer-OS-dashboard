import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openOfferOSDB, requestToPromise, runTransaction } from '../../src/data/db.js';
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

  it('aborts queued writes when a worker throws synchronously', async () => {
    const db = await openOfferOSDB();

    await expect(runTransaction(db, 'jobs', 'readwrite', (tx) => {
      tx.objectStore('jobs').put({ id: 'rolled-back', company: 'OpenAI' });
      throw new Error('worker failed');
    })).rejects.toThrow('worker failed');

    await expect(requestToPromise(db.transaction('jobs').objectStore('jobs').getAll())).resolves.toEqual([]);
    db.close();
  });

  it('aborts earlier queued writes when a later put throws synchronously', async () => {
    const db = await openOfferOSDB();

    await expect(runTransaction(db, 'jobs', 'readwrite', (tx) => {
      const store = tx.objectStore('jobs');
      store.put({ id: 'rolled-back', company: 'OpenAI' });
      store.put({ company: 'missing-id' });
    })).rejects.toThrow();

    await expect(requestToPromise(db.transaction('jobs').objectStore('jobs').getAll())).resolves.toEqual([]);
    db.close();
  });
});
