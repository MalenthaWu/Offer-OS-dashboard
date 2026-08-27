import { requestToPromise, runTransaction } from './db.js';

const APP = 'offer-os';
const SCHEMA_VERSION = 1;
const BACKUP_STORES = Object.freeze(['jobs', 'activities']);
const JOB_STAGES = new Set(['关注', '已投递', '已测评', '面试中', '已结束']);
const ACTIVITY_TYPES = new Set(['关注', '投递', '测评', '面试', '流程结束']);
const JOB_STRING_FIELDS = ['base', 'batch', 'priority', 'email', 'applyLink', 'apply_link', 'referral', 'referral_code', 'other', 'jdRaw', 'jdFormatted', 'jd'];
const DISALLOWED_RECORD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidISO(value) {
  return typeof value === 'string' && ISO_DATE.test(value) && Number.isFinite(Date.parse(value));
}

function isPlainDataRecord(record) {
  if (!record || typeof record !== 'object') return false;
  try {
    if (Object.getPrototypeOf(record) !== Object.prototype || Object.getOwnPropertySymbols(record).length > 0) return false;
    return Object.getOwnPropertyNames(record).every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return !DISALLOWED_RECORD_KEYS.has(key) && descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
    });
  } catch {
    return false;
  }
}

function hasString(record, field) {
  return Object.hasOwn(record, field) && typeof record[field] === 'string';
}

function hasValidId(record) {
  return hasString(record, 'id') && record.id.length > 0;
}

function validJob(record) {
  if (!isPlainDataRecord(record) || !hasValidId(record)) return false;
  if (!hasString(record, 'company') || !hasString(record, 'position') || !JOB_STAGES.has(record.stage)) return false;
  if (record.schemaVersion !== SCHEMA_VERSION || !isValidISO(record.createdAt) || !isValidISO(record.updatedAt)) return false;
  if (Object.hasOwn(record, 'order') && !Number.isFinite(record.order)) return false;
  if (Object.hasOwn(record, 'favorite') && typeof record.favorite !== 'boolean') return false;
  return JOB_STRING_FIELDS.every((field) => !Object.hasOwn(record, field) || typeof record[field] === 'string');
}

function validActivity(record) {
  if (!isPlainDataRecord(record) || !hasValidId(record)) return false;
  if (record.schemaVersion !== SCHEMA_VERSION || !ACTIVITY_TYPES.has(record.type) || !isValidISO(record.occurredAt)) return false;
  if (!(typeof record.jobId === 'string' || record.jobId === null)) return false;
  return !Object.hasOwn(record, 'formerJobId') || typeof record.formerJobId === 'string';
}

function validateStore(records, validator) {
  const ids = new Set();
  return records.every((record) => {
    if (!validator(record) || ids.has(record.id)) return false;
    ids.add(record.id);
    return true;
  });
}

function validateBackup(payload) {
  if (payload?.app !== APP) throw new Error('不是 Offer OS 备份文件');
  if (payload?.schemaVersion !== SCHEMA_VERSION) throw new Error('备份版本不受支持');
  if (!Array.isArray(payload?.stores?.jobs) || !Array.isArray(payload?.stores?.activities)) {
    throw new Error('备份内容不完整');
  }
  if (!validateStore(payload.stores.jobs, validJob) || !validateStore(payload.stores.activities, validActivity)) {
    throw new Error('备份内容不完整');
  }
  try {
    return structuredClone({ jobs: payload.stores.jobs, activities: payload.stores.activities });
  } catch {
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
  const stores = validateBackup(payload);

  await runTransaction(db, BACKUP_STORES, 'readwrite', async (tx) => {
    const jobs = tx.objectStore('jobs');
    const activities = tx.objectStore('activities');
    if (mode === 'replace') {
      jobs.clear();
      activities.clear();
    }
    stores.jobs.forEach((job) => jobs.put(job));
    stores.activities.forEach((activity) => activities.put(activity));
  });

  await jobService?.reload?.();
}
