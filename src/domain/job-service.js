import { createActivityRepository } from '../data/activity-repository.js';
import { requestToPromise, runTransaction } from '../data/db.js';
import { createJobRepository } from '../data/job-repository.js';
import { SCHEMA_VERSION } from '../data/schema.js';

const activityByStage = Object.freeze({
  '关注': '关注',
  '已投递': '投递',
  '已测评': '测评',
  '面试中': '面试',
  '已结束': '流程结束',
});

const toISO = (clock) => new Date(clock()).toISOString();

function activityForStage({ id, jobId, stage, occurredAt }) {
  const type = activityByStage[stage];
  if (!type) throw new Error(`Unknown job stage: ${stage}`);

  return {
    id,
    jobId,
    type,
    occurredAt,
    schemaVersion: SCHEMA_VERSION,
  };
}

function jobFromInput(input, { id, createdAt, updatedAt }) {
  const { id: ignoredId, createdAt: ignoredCreatedAt, updatedAt: ignoredUpdatedAt, schemaVersion: ignoredSchemaVersion, ...fields } = input;
  const stage = fields.stage ?? '关注';

  if (!activityByStage[stage]) throw new Error(`Unknown job stage: ${stage}`);

  return {
    ...fields,
    id,
    stage,
    createdAt,
    updatedAt,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function createJobService({ db, store, clock = () => new Date(), idFactory = () => crypto.randomUUID() }) {
  const jobs = createJobRepository(db);
  const activities = createActivityRepository(db);

  async function reload() {
    const [nextJobs, nextActivities] = await Promise.all([jobs.list(), activities.list()]);
    store.setJobs(nextJobs);
    store.setActivities(nextActivities);
  }

  async function create(input) {
    const occurredAt = toISO(clock);
    const jobId = idFactory();
    const job = jobFromInput(input, { id: jobId, createdAt: occurredAt, updatedAt: occurredAt });
    const activity = activityForStage({ id: idFactory(), jobId, stage: job.stage, occurredAt });

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      tx.objectStore('jobs').put(job);
      tx.objectStore('activities').put(activity);
    });
    await reload();
    return job;
  }

  async function update(id, patch) {
    const updatedAt = toISO(clock);
    let job;

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const jobsStore = tx.objectStore('jobs');
      const current = await requestToPromise(jobsStore.get(id));
      if (!current) throw new Error(`Job not found: ${id}`);
      job = jobFromInput({ ...current, ...patch }, {
        id: current.id,
        createdAt: current.createdAt,
        updatedAt,
      });
      jobsStore.put(job);
    });
    await reload();
    return job;
  }

  async function changeStage(id, stage) {
    const occurredAt = toISO(clock);
    const type = activityByStage[stage];
    if (!type) throw new Error(`Unknown job stage: ${stage}`);
    let job;

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const jobsStore = tx.objectStore('jobs');
      const current = await requestToPromise(jobsStore.get(id));
      if (!current) throw new Error(`Job not found: ${id}`);

      job = { ...current, stage, updatedAt: occurredAt, schemaVersion: SCHEMA_VERSION };
      jobsStore.put(job);
      tx.objectStore('activities').put(activityForStage({
        id: idFactory(), jobId: id, stage, occurredAt,
      }));
    });
    await reload();
    return job;
  }

  async function remove(id) {
    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const activitiesStore = tx.objectStore('activities');
      const relatedActivities = await requestToPromise(activitiesStore.index('jobId').getAll(id));
      relatedActivities.forEach((activity) => {
        activitiesStore.put({ ...activity, jobId: null, formerJobId: id });
      });
      tx.objectStore('jobs').delete(id);
    });
    await reload();
  }

  return { create, update, changeStage, remove, reload };
}
