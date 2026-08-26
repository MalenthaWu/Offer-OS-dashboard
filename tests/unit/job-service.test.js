import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOfferOSDB } from '../../src/data/db.js';
import { DB_NAME } from '../../src/data/schema.js';
import { createAppStore } from '../../src/app/store.js';
import { createActivityRepository } from '../../src/data/activity-repository.js';
import { createJobRepository } from '../../src/data/job-repository.js';
import { createJobService } from '../../src/domain/job-service.js';

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
    request.onblocked = () => reject(new Error('IndexedDB delete blocked by an open connection'));
  });
});

describe('jobService', () => {
  it('creates a job and a follow activity in one operation', async () => {
    const db = await openTestDatabase();
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
    await expect(createJobRepository(db).get('j1')).resolves.toMatchObject({
      id: 'j1', company: 'OpenAI', stage: '关注',
    });
    await expect(createActivityRepository(db).list()).resolves.toMatchObject([
      { id: 'a1', jobId: 'j1', type: '关注' },
    ]);
  });

  it('persists a stage change and corresponding activity', async () => {
    const db = await openTestDatabase();
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
    await expect(createJobRepository(db).get('j1')).resolves.toMatchObject({ id: 'j1', stage: '已投递' });
    await expect(createActivityRepository(db).list()).resolves.toMatchObject([
      { id: 'a1', jobId: 'j1', type: '关注' },
      { id: 'a2', jobId: 'j1', type: '投递' },
    ]);
  });

  it('unlinks activities instead of deleting history when a job is removed', async () => {
    const db = await openTestDatabase();
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
    await expect(createJobRepository(db).list()).resolves.toEqual([]);
    await expect(createActivityRepository(db).list()).resolves.toMatchObject([
      { id: 'a1', jobId: null, formerJobId: 'j1' },
    ]);
  });

  it('requires changeStage to change a job stage', async () => {
    const db = await openTestDatabase();
    const store = createAppStore();
    const service = createJobService({
      db,
      store,
      clock: () => new Date('2026-08-26T08:00:00.000Z'),
      idFactory: vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1'),
    });

    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });

    await expect(service.update('j1', { stage: '已投递' })).rejects.toThrow('Use changeStage to update a job stage');
    await expect(createJobRepository(db).get('j1')).resolves.toMatchObject({ id: 'j1', stage: '关注' });
    await expect(createActivityRepository(db).list()).resolves.toHaveLength(1);
  });

  it('moves jobs atomically and retains same-stage order without a new activity', async () => {
    const db = await openTestDatabase();
    const store = createAppStore();
    const ids = vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1').mockReturnValueOnce('j2').mockReturnValueOnce('a2');
    const service = createJobService({ db, store, clock: () => new Date('2026-08-26T08:00:00.000Z'), idFactory: ids });

    await service.create({ company: 'First', position: 'PM' });
    await service.create({ company: 'Second', position: 'PM' });
    await service.move('j2', '关注', 'j1');

    expect(store.getState().jobs.filter((job) => job.stage === '关注').map((job) => job.id)).toEqual(['j2', 'j1']);
    expect(store.getState().activities).toHaveLength(2);
  });
});
