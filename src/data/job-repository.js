import { requestToPromise } from './db.js';

export const createJobRepository = (db) => ({
  list: () => requestToPromise(db.transaction('jobs').objectStore('jobs').getAll()),
  get: (id) => requestToPromise(db.transaction('jobs').objectStore('jobs').get(id)),
});
