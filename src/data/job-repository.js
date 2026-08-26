import { requestToPromise } from './db.js';

export const createJobRepository = (db) => ({
  async list() {
    const jobs = await requestToPromise(db.transaction('jobs').objectStore('jobs').getAll());
    return jobs.sort((left, right) => left.stage.localeCompare(right.stage)
      || (Number.isFinite(left.order) ? left.order : Number.MAX_SAFE_INTEGER) - (Number.isFinite(right.order) ? right.order : Number.MAX_SAFE_INTEGER)
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id));
  },
  get: (id) => requestToPromise(db.transaction('jobs').objectStore('jobs').get(id)),
});
