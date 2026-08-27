import { requestToPromise, runTransaction } from './db.js';

const APP = 'offer-os';
const SCHEMA_VERSION = 1;
const BACKUP_STORES = Object.freeze(['jobs', 'activities']);

function validateRecords(records) {
  return records.every((record) => record && typeof record === 'object'
    && typeof record.id === 'string' && record.id.length > 0);
}

function validateBackup(payload) {
  if (payload?.app !== APP) throw new Error('不是 Offer OS 备份文件');
  if (payload?.schemaVersion !== SCHEMA_VERSION) throw new Error('备份版本不受支持');
  if (!Array.isArray(payload?.stores?.jobs) || !Array.isArray(payload?.stores?.activities)) {
    throw new Error('备份内容不完整');
  }
  if (!validateRecords(payload.stores.jobs) || !validateRecords(payload.stores.activities)) {
    throw new Error('备份内容不完整');
  }
}

export async function exportBackup(db, now = new Date()) {
  const tx = db.transaction(BACKUP_STORES, 'readonly');
  const jobs = requestToPromise(tx.objectStore('jobs').getAll());
  const activities = requestToPromise(tx.objectStore('activities').getAll());

  return {
    app: APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    stores: {
      jobs: await jobs,
      activities: await activities,
    },
  };
}

export async function importBackup(db, payload, { mode, jobService } = {}) {
  if (mode !== 'merge' && mode !== 'replace') throw new Error('导入方式不受支持');
  validateBackup(payload);

  await runTransaction(db, BACKUP_STORES, 'readwrite', async (tx) => {
    const jobs = tx.objectStore('jobs');
    const activities = tx.objectStore('activities');
    if (mode === 'replace') {
      jobs.clear();
      activities.clear();
    }
    payload.stores.jobs.forEach((job) => jobs.put(job));
    payload.stores.activities.forEach((activity) => activities.put(activity));
  });

  await jobService?.reload?.();
}
