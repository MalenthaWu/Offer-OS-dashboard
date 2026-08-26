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
          <article class="job-card" data-company="Byte" data-position="AI PM" data-batch="日常实习" data-priority="P0" data-favorite="false"><div class="job-title"><span>Byte · 北京 · 海淀</span></div></article>
        </section>
        <section class="kanban-col" data-stage="已投递">
          <article class="job-card" data-company="OpenAI" data-position="Product Intern"></article>
          <article class="job-card" data-company="OpenAI" data-position="Product Intern"></article>
          <article class="job-card" data-company="小红书" data-position="增长产品实习生"></article>
          <article class="job-card" data-company="小红书" data-position="增长产品实习生"></article>
        </section>
      </div>
    `).window.document;
    const now = () => new Date('2026-08-26T08:00:00.000Z');

    await migrateV1({ db, root, now });
    await migrateV1({ db, root, now });

    const jobs = await requestToPromise(db.transaction('jobs').objectStore('jobs').getAll());
    const seedVersion = await requestToPromise(db.transaction('meta').objectStore('meta').get('seedVersion'));

    expect(jobs).toHaveLength(6);
    expect(jobs.map((job) => job.id).sort()).toEqual([
      'seed-byte-ai-pm',
      'seed-notion-product-intern',
      'seed-openai-product-intern',
      'seed-openai-product-intern--2',
      'seed-小红书-增长产品实习生',
      'seed-小红书-增长产品实习生--2',
    ]);
    expect(jobs.find((job) => job.id === 'seed-byte-ai-pm')).toMatchObject({ base: '北京 · 海淀' });
    expect(jobs.filter((job) => job.stage === '已投递').sort((left, right) => left.order - right.order).map((job) => job.id)).toEqual([
      'seed-openai-product-intern',
      'seed-openai-product-intern--2',
      'seed-小红书-增长产品实习生',
      'seed-小红书-增长产品实习生--2',
    ]);
    expect(seedVersion).toEqual({ key: 'seedVersion', value: 1 });
  });
});
