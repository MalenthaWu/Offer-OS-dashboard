import { createActivityRepository } from '../data/activity-repository.js';
import { requestToPromise, runTransaction } from '../data/db.js';
import { createJobRepository } from '../data/job-repository.js';
import { SCHEMA_VERSION } from '../data/schema.js';
import { reloadAfterCommittedMutation } from '../app/committed-mutation.js';

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

function sortStageJobs(jobs, stage) {
  return jobs.filter((job) => job.stage === stage).sort((left, right) => {
    const leftOrder = Number.isFinite(left.order) ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.order) ? right.order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  });
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
    let job = jobFromInput(input, { id: jobId, createdAt: occurredAt, updatedAt: occurredAt });
    const activity = activityForStage({ id: idFactory(), jobId, stage: job.stage, occurredAt });

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const jobsStore = tx.objectStore('jobs');
      const existing = await requestToPromise(jobsStore.getAll());
      job = { ...job, order: sortStageJobs(existing, job.stage).length };
      jobsStore.put(job);
      tx.objectStore('activities').put(activity);
    });
    await reloadAfterCommittedMutation(reload, '岗位创建');
    return job;
  }

  async function update(id, patch) {
    if (Object.hasOwn(patch, 'stage')) {
      throw new Error('Use changeStage to update a job stage');
    }

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
    await reloadAfterCommittedMutation(reload, '岗位修改');
    return job;
  }

  async function changeStage(id, stage) {
    return move(id, stage);
  }

  async function move(id, stage, beforeId = null) {
    const occurredAt = toISO(clock);
    if (!activityByStage[stage]) throw new Error(`Unknown job stage: ${stage}`);
    let moved;

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const jobsStore = tx.objectStore('jobs');
      const allJobs = await requestToPromise(jobsStore.getAll());
      const current = allJobs.find((job) => job.id === id);
      if (!current) throw new Error(`Job not found: ${id}`);

      const sourceJobs = sortStageJobs(allJobs, current.stage).filter((job) => job.id !== id);
      const destinationJobs = current.stage === stage ? sourceJobs : sortStageJobs(allJobs, stage);
      const beforeIndex = beforeId ? destinationJobs.findIndex((job) => job.id === beforeId) : -1;
      const insertionIndex = beforeIndex < 0 ? destinationJobs.length : beforeIndex;
      moved = { ...current, stage, updatedAt: occurredAt, schemaVersion: SCHEMA_VERSION };
      destinationJobs.splice(insertionIndex, 0, moved);

      const orderedStages = current.stage === stage
        ? [[stage, destinationJobs]]
        : [[current.stage, sourceJobs], [stage, destinationJobs]];
      orderedStages.forEach(([, stageJobs]) => stageJobs.forEach((job, order) => {
        const next = { ...job, order, updatedAt: job.id === id ? occurredAt : job.updatedAt, schemaVersion: SCHEMA_VERSION };
        if (job.id === id) moved = next;
        jobsStore.put(next);
      }));
      if (current.stage !== stage) {
        tx.objectStore('activities').put(activityForStage({ id: idFactory(), jobId: id, stage, occurredAt }));
      }
    });
    await reloadAfterCommittedMutation(reload, '岗位状态变更');
    return moved;
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
    await reloadAfterCommittedMutation(reload, '岗位删除');
  }

  async function recordFollowUp(id) {
    const occurredAt = toISO(clock);
    const activity = {
      id: idFactory(),
      jobId: id,
      type: '跟进',
      occurredAt,
      schemaVersion: SCHEMA_VERSION,
    };

    await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
      const job = await requestToPromise(tx.objectStore('jobs').get(id));
      if (!job) throw new Error(`Job not found: ${id}`);
      tx.objectStore('activities').put(activity);
    });
    await reloadAfterCommittedMutation(reload, '跟进记录');
    return activity;
  }

  return { create, update, changeStage, move, remove, recordFollowUp, reload };
}
