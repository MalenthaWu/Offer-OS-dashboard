import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOfferOSDB } from '../../src/data/db.js';
import { DB_NAME } from '../../src/data/schema.js';
import { createAppStore } from '../../src/app/store.js';
import { createJobService } from '../../src/domain/job-service.js';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = resolve;
  });
});

describe('jobService', () => {
  it('creates a job and a follow activity in one operation', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const service = createJobService({
      db,
      store,
      clock: () => new Date('2026-08-26T08:00:00.000Z'),
      idFactory: vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1'),
    });

    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });

    expect(store.getState().jobs).toMatchObject([{ id: 'j1', company: 'OpenAI', stage: '关注' }]);
    expect(store.getState().activities).toMatchObject([{ id: 'a1', jobId: 'j1', type: '关注' }]);
    db.close();
  });

  it('persists a stage change and corresponding activity', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const ids = vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1').mockReturnValueOnce('a2');
    const service = createJobService({
      db,
      store,
      clock: () => new Date('2026-08-26T08:00:00.000Z'),
      idFactory: ids,
    });

    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });
    await service.changeStage('j1', '已投递');

    expect(store.getState().jobs[0].stage).toBe('已投递');
    expect(store.getState().activities.at(-1).type).toBe('投递');
    db.close();
  });

  it('unlinks activities instead of deleting history when a job is removed', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const ids = vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1');
    const service = createJobService({
      db,
      store,
      clock: () => new Date('2026-08-26T08:00:00.000Z'),
      idFactory: ids,
    });

    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });
    await service.remove('j1');

    expect(store.getState().jobs).toEqual([]);
    expect(store.getState().activities[0]).toMatchObject({ jobId: null, formerJobId: 'j1' });
    db.close();
  });
});
