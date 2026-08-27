import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOfferOSDB, requestToPromise } from '../../src/data/db.js';
import { DB_NAME } from '../../src/data/schema.js';
import { exportBackup, importBackup } from '../../src/data/backup.js';
import { initLocalDataControls } from '../../src/modules/settings/local-data-controls.js';

let openedDatabases = [];

async function openTestDatabase() {
  const db = await openOfferOSDB();
  openedDatabases.push(db);
  return db;
}

async function records(db, store) {
  return requestToPromise(db.transaction(store).objectStore(store).getAll());
}

async function seed(db, { jobs = [], activities = [], calendarEvents = [] }) {
  const tx = db.transaction(['jobs', 'activities', 'calendarEvents'], 'readwrite');
  jobs.forEach((record) => tx.objectStore('jobs').put(record));
  activities.forEach((record) => tx.objectStore('activities').put(record));
  calendarEvents.forEach((record) => tx.objectStore('calendarEvents').put(record));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const ISO = '2026-08-27T00:00:00.000Z';

function validJob(overrides = {}) {
  return {
    id: 'imported-job',
    company: 'Imported',
    position: 'Product Manager',
    base: '',
    batch: '',
    priority: '',
    stage: '关注',
    order: 0,
    favorite: false,
    jdRaw: '',
    jdFormatted: '',
    createdAt: ISO,
    updatedAt: ISO,
    schemaVersion: 1,
    ...overrides,
  };
}

function validActivity(overrides = {}) {
  return {
    id: 'imported-activity',
    jobId: 'imported-job',
    type: '关注',
    occurredAt: ISO,
    schemaVersion: 1,
    ...overrides,
  };
}

function validPayload(overrides = {}) {
  return {
    app: 'offer-os',
    schemaVersion: 1,
    exportedAt: ISO,
    stores: {
      jobs: [validJob()],
      activities: [validActivity()],
    },
    ...overrides,
  };
}

afterEach(async () => {
  openedDatabases.forEach((db) => db.close());
  openedDatabases = [];
  localStorage.clear();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed'));
    request.onblocked = () => reject(new Error('IndexedDB delete blocked by an open connection'));
  });
});

describe('local JSON backup', () => {
  it('exports only jobs and activities using the v1 backup schema', async () => {
    const db = await openTestDatabase();
    localStorage.setItem('offer-os-llm', JSON.stringify({ key: 'must-not-export' }));
    await seed(db, {
      jobs: [{ id: 'j1', company: 'OpenAI' }],
      activities: [{ id: 'a1', jobId: 'j1', type: '关注' }],
      calendarEvents: [{ id: 'c1', title: 'Must stay local' }],
    });

    const backup = await exportBackup(db, new Date('2026-08-27T08:30:00.000Z'));
    expect(backup).toEqual({
      app: 'offer-os',
      schemaVersion: 1,
      exportedAt: '2026-08-27T08:30:00.000Z',
      stores: {
        jobs: [{ id: 'j1', company: 'OpenAI' }],
        activities: [{ id: 'a1', jobId: 'j1', type: '关注' }],
      },
    });
    expect(JSON.stringify(backup)).not.toContain('must-not-export');
  });

  it('merge upserts records by id and reloads only after commit', async () => {
    const db = await openTestDatabase();
    await seed(db, {
      jobs: [{ id: 'shared', company: 'Old' }, { id: 'untouched', company: 'Keep' }],
      activities: [{ id: 'old-activity', type: '旧记录' }],
    });
    const reload = vi.fn(async () => {
      expect(await records(db, 'jobs')).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'shared', company: 'New' }),
        expect.objectContaining({ id: 'untouched' }),
      ]));
    });

    await importBackup(db, validPayload({ stores: {
      jobs: [validJob({ id: 'shared', company: 'New' })],
      activities: [validActivity({ id: 'new-activity', type: '关注' })],
    } }), { mode: 'merge', jobService: { reload } });

    expect(await records(db, 'jobs')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'shared', company: 'New' }),
      expect.objectContaining({ id: 'untouched' }),
    ]));
    expect(await records(db, 'activities')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'old-activity' }),
      expect.objectContaining({ id: 'new-activity' }),
    ]));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('replace clears only jobs and activities before putting the backup', async () => {
    const db = await openTestDatabase();
    await seed(db, {
      jobs: [{ id: 'old-job' }],
      activities: [{ id: 'old-activity' }],
      calendarEvents: [{ id: 'calendar-event', title: 'Keep this' }],
    });

    await importBackup(db, validPayload(), { mode: 'replace', jobService: { reload: vi.fn() } });

    expect(await records(db, 'jobs')).toEqual([expect.objectContaining({ id: 'imported-job' })]);
    expect(await records(db, 'activities')).toEqual([expect.objectContaining({ id: 'imported-activity' })]);
    expect(await records(db, 'calendarEvents')).toEqual([expect.objectContaining({ id: 'calendar-event' })]);
  });

  it('rolls a failed replace transaction back without reloading the service', async () => {
    const db = await openTestDatabase();
    await seed(db, { jobs: [{ id: 'old-job' }], activities: [{ id: 'old-activity' }] });
    const reload = vi.fn();
    const failingDb = {
      transaction(storeNames, mode) {
        const transaction = db.transaction(storeNames, mode);
        return {
          objectStore(name) {
            const store = transaction.objectStore(name);
            if (name !== 'activities' || mode !== 'readwrite') return store;
            return new Proxy(store, {
              get(target, key) {
                if (key === 'put') return (...args) => {
                  const request = target.put(...args);
                  transaction.abort();
                  return request;
                };
                const value = Reflect.get(target, key, target);
                return typeof value === 'function' ? value.bind(target) : value;
              },
            });
          },
          get oncomplete() { return transaction.oncomplete; },
          set oncomplete(handler) { transaction.oncomplete = handler; },
          get onabort() { return transaction.onabort; },
          set onabort(handler) { transaction.onabort = handler; },
          get onerror() { return transaction.onerror; },
          set onerror(handler) { transaction.onerror = handler; },
        };
      },
    };

    await expect(importBackup(failingDb, validPayload(), { mode: 'replace', jobService: { reload } })).rejects.toThrow();
    expect(await records(db, 'jobs')).toEqual([expect.objectContaining({ id: 'old-job' })]);
    expect(await records(db, 'activities')).toEqual([expect.objectContaining({ id: 'old-activity' })]);
    expect(reload).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validPayload(), app: 'other' }, '不是 Offer OS 备份文件'],
    [{ ...validPayload(), schemaVersion: 2 }, '备份版本不受支持'],
    [{ ...validPayload(), stores: { jobs: [] } }, '备份内容不完整'],
  ])('rejects invalid backup without changing data: %s', async (payload, message) => {
    const db = await openTestDatabase();
    await seed(db, { jobs: [{ id: 'existing-job' }], activities: [{ id: 'existing-activity' }] });

    await expect(importBackup(db, payload, { mode: 'replace', jobService: { reload: vi.fn() } })).rejects.toThrow(message);

    expect(await records(db, 'jobs')).toEqual([expect.objectContaining({ id: 'existing-job' })]);
    expect(await records(db, 'activities')).toEqual([expect.objectContaining({ id: 'existing-activity' })]);
  });

  it.each([
    ['malformed JSON-compatible fields', () => validPayload({ stores: {
      jobs: [validJob({ company: 42 })], activities: [validActivity()],
    } })],
    ['duplicate ids', () => validPayload({ stores: {
      jobs: [validJob({ id: 'same' }), validJob({ id: 'same', company: 'Other' })], activities: [validActivity()],
    } })],
    ['prototype-shaped and accessor records', () => {
      const record = Object.assign(Object.create({ inherited: true }), validJob());
      Object.defineProperty(record, 'company', { enumerable: true, get: () => 'Getter' });
      return validPayload({ stores: { jobs: [record], activities: [validActivity()] } });
    }],
    ['reserved prototype keys', () => {
      const record = validJob();
      Object.defineProperty(record, '__proto__', { value: 'unsafe', enumerable: true });
      return validPayload({ stores: { jobs: [record], activities: [validActivity()] } });
    }],
    ['uncloneable extra values', () => validPayload({ stores: {
      jobs: [validJob({ unsupported: () => {} })], activities: [validActivity()],
    } })],
    ['an envelope without a valid export timestamp', () => JSON.parse(JSON.stringify(validPayload({ exportedAt: null })))],
    ['nested JSON prototype keys in unknown job fields', () => {
      const payload = JSON.parse(JSON.stringify(validPayload()));
      payload.stores.jobs[0].metadata = JSON.parse('{"__proto__":"unsafe"}');
      return payload;
    }],
  ])('rejects %s before writing or reloading', async (_name, makePayload) => {
    const db = await openTestDatabase();
    await seed(db, { jobs: [validJob({ id: 'existing-job' })], activities: [validActivity({ id: 'existing-activity', jobId: null })] });
    const before = await Promise.all([records(db, 'jobs'), records(db, 'activities')]);
    const transaction = vi.spyOn(db, 'transaction');
    const reload = vi.fn();

    await expect(importBackup(db, makePayload(), { mode: 'replace', jobService: { reload } })).rejects.toThrow('备份内容不完整');

    expect(transaction.mock.calls.some(([, mode]) => mode === 'readwrite')).toBe(false);
    expect(await Promise.all([records(db, 'jobs'), records(db, 'activities')])).toEqual(before);
    expect(reload).not.toHaveBeenCalled();
  });

  it('rejects unknown import modes before writing', async () => {
    const db = await openTestDatabase();
    await seed(db, { jobs: [{ id: 'existing-job' }] });

    await expect(importBackup(db, validPayload(), { mode: 'unknown' })).rejects.toThrow('导入方式不受支持');
    expect(await records(db, 'jobs')).toEqual([expect.objectContaining({ id: 'existing-job' })]);
  });
});

/** @vitest-environment jsdom */
describe('local data settings controls', () => {
  function createControls(options = {}) {
    document.body.innerHTML = '<section id="settings-account-pane"></section>';
    const exportFn = vi.fn(async () => validPayload());
    const importFn = vi.fn(async () => {});
    const url = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };
    const controls = initLocalDataControls({
      root: document,
      db: {},
      jobService: { reload: vi.fn() },
      exportBackup: exportFn,
      importBackup: importFn,
      url,
      now: () => new Date('2026-08-27T00:00:00.000Z'),
      chooseImportMode: vi.fn(() => 'merge'),
      confirmReplace: vi.fn(() => true),
      showToast: vi.fn(),
      ...options,
    });
    return { controls, exportFn, importFn, url };
  }

  it('safely creates controls inside the account pane and returns false when absent', () => {
    expect(initLocalDataControls({ root: document, db: {} })).toBe(false);
    const { controls } = createControls();
    expect(controls).toBe(true);
    expect(document.querySelector('#local-data-export').textContent).toBe('导出本地数据');
    expect(document.querySelector('#local-data-import').textContent).toBe('导入本地数据');
    expect(document.querySelector('#local-data-file').getAttribute('accept')).toBe('.json,application/json');
  });

  it('exports with a dated filename and cleans up the object URL', async () => {
    const { exportFn, url } = createControls();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    document.querySelector('#local-data-export').click();
    await vi.waitFor(() => expect(exportFn).toHaveBeenCalledOnce());

    expect(url.createObjectURL).toHaveBeenCalledOnce();
    expect(document.querySelector('#local-data-download').download).toBe('offer-os-backup-2026-08-27.json');
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  });

  it('requires two decisions before replacing local jobs and activities', async () => {
    const chooseImportMode = vi.fn(() => 'replace');
    const confirmReplace = vi.fn(() => true);
    const { importFn } = createControls({ chooseImportMode, confirmReplace });
    const input = document.querySelector('#local-data-file');
    Object.defineProperty(input, 'files', { value: [{ text: async () => JSON.stringify(validPayload()) }] });

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(importFn).toHaveBeenCalledOnce());

    expect(confirmReplace).toHaveBeenCalledWith('覆盖导入会覆盖本地岗位和活动，确认继续吗？');
    expect(importFn).toHaveBeenCalledWith({}, expect.any(Object), expect.objectContaining({ mode: 'replace' }));
  });

  it('shows a helpful error and does not import unreadable files', async () => {
    const showToast = vi.fn();
    const { importFn } = createControls({ showToast });
    const input = document.querySelector('#local-data-file');
    Object.defineProperty(input, 'files', { value: [{ text: async () => '{not json' }] });

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith('导入失败：备份文件不是有效的 JSON'));
    expect(importFn).not.toHaveBeenCalled();
  });

  it('serializes imports and recovers controls after the first import completes', async () => {
    let completeImport;
    const pendingImport = new Promise((resolve) => { completeImport = resolve; });
    const importFn = vi.fn(() => pendingImport);
    createControls({ importBackup: importFn });
    const input = document.querySelector('#local-data-file');
    const file = { text: async () => JSON.stringify(validPayload()) };
    Object.defineProperty(input, 'files', { value: [file] });

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(importFn).toHaveBeenCalledOnce());
    expect(document.querySelector('#local-data-import').disabled).toBe(true);
    expect(input.disabled).toBe(true);

    const openFilePicker = vi.spyOn(input, 'click').mockImplementation(() => {});
    document.querySelector('#local-data-import').dispatchEvent(new Event('click'));
    expect(openFilePicker).not.toHaveBeenCalled();
    input.dispatchEvent(new Event('change'));
    expect(importFn).toHaveBeenCalledOnce();

    completeImport();
    await vi.waitFor(() => expect(document.querySelector('#local-data-import').disabled).toBe(false));
    expect(input.disabled).toBe(false);

    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(importFn).toHaveBeenCalledTimes(2));
    openFilePicker.mockRestore();
  });
});
