import { DB_NAME, DB_VERSION, STORE_NAMES } from './schema.js';

export const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
});

export const transactionDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
});

export function openOfferOSDB(factory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(new Error('当前浏览器不支持 IndexedDB'));
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
    request.onblocked = () => reject(new Error('数据库升级被其他标签页阻止，请关闭其他 Offer OS 页面后重试'));
    request.onupgradeneeded = () => {
      const db = request.result;
      const jobs = db.createObjectStore(STORE_NAMES.jobs, { keyPath: 'id' });
      jobs.createIndex('stage', 'stage'); jobs.createIndex('updatedAt', 'updatedAt');
      const activities = db.createObjectStore(STORE_NAMES.activities, { keyPath: 'id' });
      activities.createIndex('jobId', 'jobId'); activities.createIndex('occurredAt', 'occurredAt'); activities.createIndex('type', 'type');
      const calendar = db.createObjectStore(STORE_NAMES.calendarEvents, { keyPath: 'id' });
      calendar.createIndex('jobId', 'jobId'); calendar.createIndex('startAt', 'startAt');
      const resumes = db.createObjectStore(STORE_NAMES.resumes, { keyPath: 'id' });
      resumes.createIndex('jobId', 'jobId'); resumes.createIndex('updatedAt', 'updatedAt');
      const interviews = db.createObjectStore(STORE_NAMES.interviewSessions, { keyPath: 'id' });
      interviews.createIndex('jobId', 'jobId'); interviews.createIndex('completedAt', 'completedAt');
      const reviews = db.createObjectStore(STORE_NAMES.reviews, { keyPath: 'id' });
      reviews.createIndex('jobId', 'jobId'); reviews.createIndex('updatedAt', 'updatedAt');
      const portals = db.createObjectStore(STORE_NAMES.portals, { keyPath: 'id' });
      portals.createIndex('category', 'category'); portals.createIndex('rating', 'rating');
      db.createObjectStore(STORE_NAMES.meta, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function runTransaction(db, storeNames, mode, worker) {
  const tx = db.transaction(storeNames, mode);
  const result = await worker(tx);
  await transactionDone(tx);
  return result;
}
