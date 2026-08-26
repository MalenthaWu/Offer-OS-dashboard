import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { openOfferOSDB, requestToPromise } from '../../src/data/db.js';
import { migrateV1 } from '../../src/data/migrations.js';
import { DB_NAME } from '../../src/data/schema.js';

let openedDatabases = [];

async function openTestDatabase() {
  const db = await openOfferOSDB();
  openedDatabases.push(db);
  return db;
}

afterEach(async () => {
  openedDatabases.forEach((db) => db.close());
  openedDatabases = [];
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed'));
  });
});

describe('migrateV1', () => {
  it('imports legacy kanban cards once and records the seed version', async () => {
    const db = await openTestDatabase();
    const root = new JSDOM(`
      <div id="kanban-board">
        <section class="kanban-col" data-stage="关注">
          <article class="job-card" data-company="Notion" data-position="Product Intern" data-base="上海 / 远程" data-batch="日常实习" data-priority="P1" data-favorite="true"></article>
        </section>
        <section class="kanban-col" data-stage="面试中">
          <article class="job-card" data-company="Byte" data-position="AI PM" data-base="北京" data-batch="日常实习" data-priority="P0" data-favorite="false"></article>
        </section>
      </div>
    `).window.document;
    const now = () => new Date('2026-08-26T08:00:00.000Z');

    await migrateV1({ db, root, now });
    await migrateV1({ db, root, now });

    const jobs = await requestToPromise(db.transaction('jobs').objectStore('jobs').getAll());
    const seedVersion = await requestToPromise(db.transaction('meta').objectStore('meta').get('seedVersion'));

    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.id).sort()).toEqual([
      'seed-byte-ai-pm',
      'seed-notion-product-intern',
    ]);
    expect(seedVersion).toEqual({ key: 'seedVersion', value: 1 });
  });
});
