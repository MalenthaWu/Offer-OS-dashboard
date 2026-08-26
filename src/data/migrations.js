import { requestToPromise, runTransaction } from './db.js';
import { SCHEMA_VERSION } from './schema.js';

const slug = (text) => text.toLowerCase().normalize('NFKC')
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');

export async function migrateV1({ db, root = document, now = () => new Date() }) {
  const readTx = db.transaction('meta');
  if ((await requestToPromise(readTx.objectStore('meta').get('seedVersion')))?.value >= 1) return { importedJobs: 0 };
  const timestamp = now().toISOString();
  const occurrences = new Map();
  const stageOrders = new Map();
  const jobs = [...root.querySelectorAll('#kanban-board .job-card')].map((card) => {
    const seedId = `seed-${slug(`${card.dataset.company}-${card.dataset.position}`)}`;
    const occurrence = (occurrences.get(seedId) ?? 0) + 1;
    occurrences.set(seedId, occurrence);
    const titleSpan = card.querySelector('.job-title span');
    const baseFallback = titleSpan ? titleSpan.textContent.split(' · ').slice(1).join(' · ').trim() : '';

    const stage = card.closest('.kanban-col')?.dataset.stage ?? '关注';
    const order = stageOrders.get(stage) ?? 0;
    stageOrders.set(stage, order + 1);
    return {
      id: occurrence === 1 ? seedId : `${seedId}--${occurrence}`,
      company: card.dataset.company ?? '', position: card.dataset.position ?? '',
      base: card.dataset.base || baseFallback || '', batch: card.dataset.batch ?? '', priority: card.dataset.priority ?? '',
      stage, order, favorite: card.dataset.favorite === 'true',
      jdRaw: card.dataset.jdRaw ?? '', jdFormatted: card.dataset.jdFormatted ?? '',
      createdAt: timestamp, updatedAt: timestamp, schemaVersion: SCHEMA_VERSION,
    };
  });
  await runTransaction(db, ['jobs', 'meta'], 'readwrite', async (tx) => {
    jobs.forEach((job) => tx.objectStore('jobs').put(job));
    tx.objectStore('meta').put({ key: 'seedVersion', value: 1 });
  });
  return { importedJobs: jobs.length };
}
