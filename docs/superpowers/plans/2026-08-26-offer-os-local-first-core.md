# Offer OS Local-First Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Offer OS 单文件原型迁移为可构建的原生模块应用，并交付以 IndexedDB 为唯一数据源的岗位、投递活动、仪表盘和近三个月热力图。

**Architecture:** 保留 `offer-os.html` 作为不可修改的视觉基准，通过一次性脚本生成 Vite 入口、遗留样式和遗留行为模块。新增的数据层、Store 和岗位模块逐步接管对应 DOM；其他页面继续由遗留模块运行。所有岗位写入经 `jobService` 完成，活动记录驱动仪表盘统计和热力图。

**Tech Stack:** Vite 7、原生 ES Modules、原生 IndexedDB、Vitest、fake-indexeddb、Playwright、HTML/CSS/JavaScript。

## Global Constraints

- 不引入 React 或其他 UI 框架。
- `offer-os.html` 保留为只读视觉与行为基准，不在迁移过程中覆盖。
- IndexedDB 数据库名固定为 `offer-os`，初始版本固定为 `1`。
- 业务实体使用稳定字符串 ID、ISO 8601 时间和 `schemaVersion: 1`。
- 用户输入默认通过 `textContent` 渲染；不把未清理的用户内容写入 `innerHTML`。
- 第一切片只接管岗位、活动、仪表盘和热力图；日历、简历、面试、复盘、官网入口和设置后续分别迁移。
- 每项写操作必须先成功提交 IndexedDB，再更新 Store 和界面。
- 当前目录没有 Git 元数据；Task 1 在本地初始化 Git，但不创建远端、不推送。

---

## File Map

- `offer-os.html`：现有只读基准。
- `scripts/extract-single-file.mjs`：从基准提取 `index.html`、遗留 CSS 和遗留 JavaScript。
- `index.html`：Vite 页面入口，保留现有 DOM。
- `src/main.js`：应用启动顺序与功能接管开关。
- `src/legacy/legacy.css`：迁移初期保留的全部原样式。
- `src/legacy/legacy-app.js`：尚未模块化的交互。
- `src/data/schema.js`：数据库、对象仓库和索引常量。
- `src/data/db.js`：原生 IndexedDB Promise 封装和事务工具。
- `src/data/job-repository.js`：岗位读写。
- `src/data/activity-repository.js`：活动读写和日期范围查询。
- `src/data/migrations.js`：首次种子导入与旧数据迁移状态。
- `src/data/backup.js`：本切片数据导出和导入。
- `src/app/store.js`：岗位、活动和订阅状态。
- `src/domain/job-service.js`：岗位与活动的原子业务操作。
- `src/modules/jobs/jobs-view.js`：岗位 DOM 渲染。
- `src/modules/jobs/jobs-controller.js`：新增、筛选、删除、拖拽和详情事件。
- `src/modules/dashboard/dashboard-stats.js`：纯统计函数。
- `src/modules/dashboard/dashboard-view.js`：统计卡片和热力图渲染。
- `src/modules/settings/local-data-controls.js`：导入导出入口。
- `tests/unit/`：数据层、领域层和统计单元测试。
- `tests/e2e/`：浏览器持久化和联动验收。

---

### Task 1: 初始化 Git、Vite 与视觉基线

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `vite.config.js`
- Create: `scripts/extract-single-file.mjs`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/legacy/legacy.css`
- Create: `src/legacy/legacy-app.js`
- Create: `tests/structure/baseline.test.js`

**Interfaces:**
- Consumes: root `offer-os.html`.
- Produces: `npm run dev`, `npm test`, `npm run build`; `window.__OFFER_OS_FEATURES__` feature flags.

- [ ] **Step 1: 初始化本地 Git 并写忽略规则**

Run:

```bash
git init -b main
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.DS_Store
*.log
```

- [ ] **Step 2: 写失败的基线测试**

Create `tests/structure/baseline.test.js`:

```js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('Vite shell', () => {
  it('preserves each main workspace exactly once', () => {
    for (const id of ['page-dashboard', 'page-jobs', 'page-resume', 'page-interview', 'page-review']) {
      expect(html.split(`id="${id}"`)).toHaveLength(2);
    }
  });

  it('loads only the module entry', () => {
    expect(html).toContain('<script type="module" src="/src/main.js"></script>');
    expect(html).not.toMatch(/<style>[\s\S]+<\/style>/);
  });
});
```

- [ ] **Step 3: 写项目配置**

Create `package.json`:

```json
{
  "name": "offer-os",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "extract": "node scripts/extract-single-file.mjs",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "fake-indexeddb": "^6.2.2",
    "jsdom": "^26.1.0",
    "vite": "^7.1.3",
    "vitest": "^3.2.4"
  }
}
```

Create `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: { environment: 'node', restoreMocks: true },
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```bash
npm install
npx playwright install chromium
npm test -- tests/structure/baseline.test.js
```

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 5: 写并运行机械提取脚本**

Create `scripts/extract-single-file.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = await readFile('offer-os.html', 'utf8');
const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!styleMatch || !scriptMatch) throw new Error('Unable to locate inline style or application script');

await mkdir('src/legacy', { recursive: true });
await writeFile('src/legacy/legacy.css', styleMatch[1].trimStart());
await writeFile('src/legacy/legacy-app.js', scriptMatch[1].trimStart());

const html = source
  .replace(styleMatch[0], '')
  .replace(scriptMatch[0], '<script type="module" src="/src/main.js"></script>\n</body>');
await writeFile('index.html', html);
```

Create `src/main.js`:

```js
import './legacy/legacy.css';

window.__OFFER_OS_FEATURES__ = Object.freeze({
  jobs: false,
  dashboard: false,
  backup: false,
});

await import('./legacy/legacy-app.js');
```

Run:

```bash
npm run extract
npm test -- tests/structure/baseline.test.js
npm run build
```

Expected: structure tests PASS and Vite creates `dist/index.html` without broken entry paths.

- [ ] **Step 6: 提交基线**

```bash
git add .gitignore package.json package-lock.json vite.config.js scripts index.html src tests/structure offer-os.html
git commit -m "chore: establish Vite migration baseline"
```

---

### Task 2: 建立 IndexedDB Schema 与事务封装

**Files:**
- Create: `src/data/schema.js`
- Create: `src/data/db.js`
- Create: `tests/unit/db.test.js`

**Interfaces:**
- Produces: `openOfferOSDB(factory?)`, `requestToPromise(request)`, `transactionDone(tx)`, `runTransaction(db, storeNames, mode, worker)`.
- Object stores: `jobs`, `activities`, `calendarEvents`, `resumes`, `interviewSessions`, `reviews`, `portals`, `meta`.

- [ ] **Step 1: 写失败的数据结构测试**

Create `tests/unit/db.test.js`:

```js
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openOfferOSDB } from '../../src/data/db.js';
import { DB_NAME, STORE_NAMES } from '../../src/data/schema.js';

afterEach(async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
});

describe('openOfferOSDB', () => {
  it('creates every v1 store and required indexes', async () => {
    const db = await openOfferOSDB();
    expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(Object.values(STORE_NAMES)));
    const tx = db.transaction(['jobs', 'activities']);
    expect([...tx.objectStore('jobs').indexNames]).toEqual(expect.arrayContaining(['stage', 'updatedAt']));
    expect([...tx.objectStore('activities').indexNames]).toEqual(expect.arrayContaining(['jobId', 'occurredAt', 'type']));
    db.close();
  });
});
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `npm test -- tests/unit/db.test.js`

Expected: FAIL with module-not-found for `src/data/db.js`.

- [ ] **Step 3: 实现 Schema 和数据库打开逻辑**

Create `src/data/schema.js`:

```js
export const DB_NAME = 'offer-os';
export const DB_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const STORE_NAMES = Object.freeze({
  jobs: 'jobs', activities: 'activities', calendarEvents: 'calendarEvents',
  resumes: 'resumes', interviewSessions: 'interviewSessions', reviews: 'reviews',
  portals: 'portals', meta: 'meta',
});
```

Create `src/data/db.js`:

```js
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
```

- [ ] **Step 4: 验证并提交**

Run: `npm test -- tests/unit/db.test.js`

Expected: PASS.

```bash
git add src/data/schema.js src/data/db.js tests/unit/db.test.js
git commit -m "feat: add IndexedDB schema and transaction helpers"
```

---

### Task 3: 岗位、活动 Repository 与领域服务

**Files:**
- Create: `src/app/store.js`
- Create: `src/data/job-repository.js`
- Create: `src/data/activity-repository.js`
- Create: `src/domain/job-service.js`
- Create: `tests/unit/job-service.test.js`

**Interfaces:**
- Consumes: `requestToPromise`, `runTransaction`, `SCHEMA_VERSION`.
- Produces: `createJobRepository(db)`, `createActivityRepository(db)`, `createJobService({ db, store, clock, idFactory })`.
- Job service methods: `create(input)`, `update(id, patch)`, `changeStage(id, stage)`, `remove(id)`, `reload()`.

- [ ] **Step 1: 写岗位和活动原子行为测试**

Create `tests/unit/job-service.test.js` with three tests:

```js
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOfferOSDB } from '../../src/data/db.js';
import { DB_NAME } from '../../src/data/schema.js';
import { createAppStore } from '../../src/app/store.js';
import { createJobService } from '../../src/domain/job-service.js';

afterEach(async () => {
  await new Promise((resolve) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = resolve; });
});

describe('jobService', () => {
  it('creates a job and a follow activity in one operation', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const service = createJobService({ db, store, clock: () => new Date('2026-08-26T08:00:00.000Z'), idFactory: vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1') });
    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });
    expect(store.getState().jobs).toMatchObject([{ id: 'j1', company: 'OpenAI', stage: '关注' }]);
    expect(store.getState().activities).toMatchObject([{ id: 'a1', jobId: 'j1', type: '关注' }]);
  });

  it('persists a stage change and corresponding activity', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const ids = vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1').mockReturnValueOnce('a2');
    const service = createJobService({ db, store, clock: () => new Date('2026-08-26T08:00:00.000Z'), idFactory: ids });
    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });
    await service.changeStage('j1', '已投递');
    expect(store.getState().jobs[0].stage).toBe('已投递');
    expect(store.getState().activities.at(-1).type).toBe('投递');
  });

  it('unlinks activities instead of deleting history when a job is removed', async () => {
    const db = await openOfferOSDB();
    const store = createAppStore();
    const ids = vi.fn().mockReturnValueOnce('j1').mockReturnValueOnce('a1');
    const service = createJobService({ db, store, clock: () => new Date('2026-08-26T08:00:00.000Z'), idFactory: ids });
    await service.create({ company: 'OpenAI', position: 'Product Intern', stage: '关注' });
    await service.remove('j1');
    expect(store.getState().jobs).toEqual([]);
    expect(store.getState().activities[0]).toMatchObject({ jobId: null, formerJobId: 'j1' });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/unit/job-service.test.js`

Expected: FAIL because repositories, store and service are missing.

- [ ] **Step 3: 实现 Store**

Create `src/app/store.js`:

```js
export function createAppStore(initial = {}) {
  let state = { jobs: [], activities: [], ...initial };
  const listeners = new Map();
  const emit = (topic) => (listeners.get(topic) ?? new Set()).forEach((fn) => fn(state));
  return {
    getState: () => state,
    setJobs(jobs) { state = { ...state, jobs: [...jobs] }; emit('jobs:changed'); },
    setActivities(activities) { state = { ...state, activities: [...activities] }; emit('activities:changed'); },
    subscribe(topic, fn) {
      if (!listeners.has(topic)) listeners.set(topic, new Set());
      listeners.get(topic).add(fn);
      return () => listeners.get(topic)?.delete(fn);
    },
  };
}
```

- [ ] **Step 4: 实现 Repository**

Create both repositories with this exact contract:

```js
// src/data/job-repository.js
import { requestToPromise } from './db.js';
export const createJobRepository = (db) => ({
  list: () => requestToPromise(db.transaction('jobs').objectStore('jobs').getAll()),
  get: (id) => requestToPromise(db.transaction('jobs').objectStore('jobs').get(id)),
});

// src/data/activity-repository.js
import { requestToPromise } from './db.js';
export const createActivityRepository = (db) => ({
  list: () => requestToPromise(db.transaction('activities').objectStore('activities').getAll()),
  listByRange: (startISO, endISO) => requestToPromise(
    db.transaction('activities').objectStore('activities').index('occurredAt').getAll(IDBKeyRange.bound(startISO, endISO))
  ),
});
```

- [ ] **Step 5: 实现领域服务**

Create `src/domain/job-service.js`. Normalize input to a Job object, use one `readwrite` transaction over `jobs` and `activities`, and map stages to activity types with:

```js
const activityByStage = Object.freeze({
  '关注': '关注', '已投递': '投递', '已测评': '测评', '面试中': '面试', '已结束': '流程结束',
});
```

The service must:

```js
await runTransaction(db, ['jobs', 'activities'], 'readwrite', async (tx) => {
  tx.objectStore('jobs').put(job);
  tx.objectStore('activities').put(activity);
});
await reload();
```

`remove(id)` must update matching activities to `{ ...activity, jobId: null, formerJobId: id }` before deleting the job. `reload()` must call both repositories and update both Store slices.

- [ ] **Step 6: 验证并提交**

Run: `npm test -- tests/unit/job-service.test.js`

Expected: all three tests PASS.

```bash
git add src/app/store.js src/data/job-repository.js src/data/activity-repository.js src/domain/job-service.js tests/unit/job-service.test.js
git commit -m "feat: persist jobs and activity history"
```

---

### Task 4: 首次导入现有岗位且保持幂等

**Files:**
- Create: `src/data/migrations.js`
- Create: `tests/unit/migrations.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: existing `.job-card` elements and their closest `.kanban-col[data-stage]`.
- Produces: `migrateV1({ db, root, now }) -> Promise<{ importedJobs: number }>`.

- [ ] **Step 1: 写失败的迁移测试**

Use JSDOM with two cards, call `migrateV1` twice, and assert that `jobs.getAll()` returns exactly two records, stable IDs `seed-notion-product-intern` and `seed-byte-ai-pm`, and `meta.get('seedVersion')` equals `{ key: 'seedVersion', value: 1 }`.

Run: `npm test -- tests/unit/migrations.test.js`

Expected: FAIL because `migrateV1` is missing.

- [ ] **Step 2: 实现 DOM 解析和幂等迁移**

Create `src/data/migrations.js` with:

```js
import { requestToPromise, runTransaction } from './db.js';
import { SCHEMA_VERSION } from './schema.js';

const slug = (text) => text.toLowerCase().normalize('NFKC')
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');

export async function migrateV1({ db, root = document, now = () => new Date() }) {
  const readTx = db.transaction('meta');
  if ((await requestToPromise(readTx.objectStore('meta').get('seedVersion')))?.value >= 1) return { importedJobs: 0 };
  const timestamp = now().toISOString();
  const jobs = [...root.querySelectorAll('#kanban-board .job-card')].map((card) => ({
    id: `seed-${slug(`${card.dataset.company}-${card.dataset.position}`)}`,
    company: card.dataset.company ?? '', position: card.dataset.position ?? '',
    base: card.dataset.base ?? '', batch: card.dataset.batch ?? '', priority: card.dataset.priority ?? '',
    stage: card.closest('.kanban-col')?.dataset.stage ?? '关注', favorite: card.dataset.favorite === 'true',
    jdRaw: card.dataset.jdRaw ?? '', jdFormatted: card.dataset.jdFormatted ?? '',
    createdAt: timestamp, updatedAt: timestamp, schemaVersion: SCHEMA_VERSION,
  }));
  await runTransaction(db, ['jobs', 'meta'], 'readwrite', async (tx) => {
    jobs.forEach((job) => tx.objectStore('jobs').put(job));
    tx.objectStore('meta').put({ key: 'seedVersion', value: 1 });
  });
  return { importedJobs: jobs.length };
}
```

- [ ] **Step 3: 接入启动流程**

Change `src/main.js` so it opens the database and runs migration before importing legacy behavior:

```js
import './legacy/legacy.css';
import { openOfferOSDB } from './data/db.js';
import { migrateV1 } from './data/migrations.js';

window.__OFFER_OS_FEATURES__ = { jobs: false, dashboard: false, backup: false };
const db = await openOfferOSDB();
await migrateV1({ db, root: document });
window.__OFFER_OS_DB__ = db;
await import('./legacy/legacy-app.js');
```

- [ ] **Step 4: 验证并提交**

Run: `npm test -- tests/unit/migrations.test.js && npm run build`

Expected: migration test PASS and production build succeeds.

```bash
git add src/data/migrations.js src/main.js tests/unit/migrations.test.js
git commit -m "feat: import legacy job cards into IndexedDB"
```

---

### Task 5: 用模块化岗位控制器接管岗位看板

**Files:**
- Create: `src/modules/jobs/jobs-view.js`
- Create: `src/modules/jobs/jobs-controller.js`
- Create: `tests/unit/jobs-view.test.js`
- Create: `tests/e2e/jobs-persistence.spec.js`
- Modify: `src/legacy/legacy-app.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `jobService`, `store`, `#kanban-board`, `#add-job-form`, `#job-search`, `#batch-filter`.
- Produces: `renderJobs(root, jobs)`, `initJobsController({ root, store, service, showToast })`.

- [ ] **Step 1: 写视图安全性和分组测试**

Create a JSDOM board with five `.kanban-col[data-stage]` containers. Render a job whose company is `<img onerror=alert(1)>`; assert the string appears as text, no `img` exists, the card is in the matching stage, and each `.col-count` equals its number of cards.

Run: `npm test -- tests/unit/jobs-view.test.js`

Expected: FAIL because `renderJobs` is missing.

- [ ] **Step 2: 实现岗位视图**

`renderJobs` must clear only existing `.job-card` children, create elements with `document.createElement`, assign all user strings through `textContent`, preserve each column `.add-card`, and set these datasets: `id`, `company`, `position`, `batch`, `priority`, `favorite`, `base`.

Expose one helper with this contract:

```js
export function createJobCard(job) {
  const card = document.createElement('article');
  card.className = 'job-card';
  card.draggable = true;
  card.dataset.id = job.id;
  // Build .job-top, .job-tags, .job-meta and .job-actions using textContent.
  return card;
}
```

- [ ] **Step 3: 实现控制器**

Use event delegation on `#kanban-board` for delete/detail actions and drag/drop. On form submit call `await service.create(input)`; on drop call `await service.changeStage(jobId, stage)`; on delete confirm then call `await service.remove(jobId)`. Subscribe to `jobs:changed` and call `renderJobs(root, store.getState().jobs)` followed by the active search/batch filter.

Any rejected Promise must call:

```js
showToast(`保存失败：${error instanceof Error ? error.message : '未知错误'}`);
```

- [ ] **Step 4: 关闭遗留岗位写事件并启动新模块**

In `src/legacy/legacy-app.js`, guard the old add, delete, drag/drop and favorite event binding with:

```js
if (!window.__OFFER_OS_FEATURES__?.jobs) {
  // Existing legacy bindings remain byte-for-byte inside this branch.
}
```

Keep legacy helpers needed by resume matching and job detail display outside the branch. In `src/main.js`, create Store and service, set `jobs: true`, import legacy app, initialize the new controller, and call `service.reload()`.

- [ ] **Step 5: 写浏览器持久化测试**

Create `tests/e2e/jobs-persistence.spec.js` that opens the app, completes demo login, adds “OpenAI / Product Intern”, reloads, navigates to岗位, and asserts the card still exists. Drag it to `已投递`, reload, and assert it remains there.

Run: `npm run test:e2e -- tests/e2e/jobs-persistence.spec.js`

Expected: PASS in Chromium.

- [ ] **Step 6: 全量验证并提交**

Run:

```bash
npm test
npm run test:e2e -- tests/e2e/jobs-persistence.spec.js
npm run build
```

Expected: all tests PASS and build succeeds.

```bash
git add src/modules/jobs src/legacy/legacy-app.js src/main.js tests
git commit -m "feat: move job board to modular persistent state"
```

---

### Task 6: 用活动数据驱动仪表盘与三个月热力图

**Files:**
- Create: `src/modules/dashboard/dashboard-stats.js`
- Create: `src/modules/dashboard/dashboard-view.js`
- Create: `tests/unit/dashboard-stats.test.js`
- Create: `tests/e2e/dashboard-sync.spec.js`
- Modify: `src/legacy/legacy-app.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: Store `jobs`, `activities`.
- Produces: `computeDashboard({ jobs, activities, today })` and `renderDashboard(root, summary)`.

- [ ] **Step 1: 写固定时间的统计测试**

Use `today = new Date('2026-08-26T12:00:00+08:00')` and activities on the first day, last day, one day before the range and a non-投递 type. Assert:

```js
expect(summary.heatmap.days).toHaveLength(91);
expect(summary.heatmap.totalApplications).toBe(2);
expect(summary.heatmap.days[0].date).toBe('2026-05-28');
expect(summary.heatmap.days.at(-1).date).toBe('2026-08-26');
expect(summary.stageCounts['已投递']).toBe(1);
```

Run: `npm test -- tests/unit/dashboard-stats.test.js`

Expected: FAIL because `computeDashboard` is missing.

- [ ] **Step 2: 实现纯统计函数**

`computeDashboard` must create exactly 91 local-calendar days ending on `today`, group only `activity.type === '投递'`, compute `totalApplications`, `activeDays`, `currentStreak`, `bestStreak`, and produce stage counts for all five stages. Date keys use local year/month/day rather than slicing UTC ISO strings.

- [ ] **Step 3: 实现仪表盘渲染**

`renderDashboard` must update existing statistic nodes and rebuild `#heat-grid` with 13 columns × 7 rows. Each cell receives `data-date`, `data-count`, accessible label `YYYY-MM-DD，N 次投递`, and one of five heat levels. Tooltip text uses `textContent`.

Subscribe one render callback to both `jobs:changed` and `activities:changed` and coalesce same-tick updates with `queueMicrotask` to avoid duplicate renders.

- [ ] **Step 4: 关闭遗留固定统计和热力图**

Guard the existing `renderHeatmap()` call and fixed dashboard-stat mutations with `if (!window.__OFFER_OS_FEATURES__?.dashboard)`. Set `dashboard: true` before importing the legacy module, then initialize `dashboard-view` after Store creation.

- [ ] **Step 5: 写跨模块浏览器测试**

Create `tests/e2e/dashboard-sync.spec.js`: record the dashboard application total, add a new job, move it to `已投递`, navigate to dashboard, assert total increased by one and today’s heat cell count increased by one; reload and assert both values remain.

- [ ] **Step 6: 验证并提交**

Run: `npm test && npm run test:e2e -- tests/e2e/dashboard-sync.spec.js && npm run build`

Expected: all tests PASS.

```bash
git add src/modules/dashboard src/legacy/legacy-app.js src/main.js tests
git commit -m "feat: drive dashboard and heatmap from activity data"
```

---

### Task 7: 本地 JSON 备份、合并导入和覆盖导入

**Files:**
- Create: `src/data/backup.js`
- Create: `src/modules/settings/local-data-controls.js`
- Create: `tests/unit/backup.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces: `exportBackup(db, now) -> Promise<BackupV1>`, `importBackup(db, payload, { mode })`, `initLocalDataControls(...)`.
- `mode` is exactly `'merge'` or `'replace'`.

- [ ] **Step 1: 写备份事务测试**

Test that export contains `{ app: 'offer-os', schemaVersion: 1, exportedAt, stores: { jobs, activities } }`; merge upserts matching IDs; replace clears only `jobs` and `activities` before inserting; invalid app/schema rejects without changing existing records.

Run: `npm test -- tests/unit/backup.test.js`

Expected: FAIL because backup functions are missing.

- [ ] **Step 2: 实现数据备份**

Validate the payload before opening a write transaction. Use one readwrite transaction over `jobs` and `activities`; in replace mode call `clear()` on both stores before `put()`. After import, call `jobService.reload()`.

The exact validation error messages are:

```js
if (payload?.app !== 'offer-os') throw new Error('不是 Offer OS 备份文件');
if (payload?.schemaVersion !== 1) throw new Error('备份版本不受支持');
if (!Array.isArray(payload?.stores?.jobs) || !Array.isArray(payload?.stores?.activities)) throw new Error('备份内容不完整');
```

- [ ] **Step 3: 接入设置页控件**

Add buttons “导出本地数据”和“导入本地数据” plus a hidden `.json` file input to the existing settings data area. Export uses `Blob` and an object URL named `offer-os-backup-YYYY-MM-DD.json`. Import first asks merge/replace; replace requires a second confirmation that states local岗位和活动 will be overwritten.

- [ ] **Step 4: 验证并提交**

Run: `npm test -- tests/unit/backup.test.js && npm run build`

Expected: PASS and build succeeds.

```bash
git add src/data/backup.js src/modules/settings/local-data-controls.js src/main.js tests/unit/backup.test.js index.html
git commit -m "feat: add local backup and restore"
```

---

### Task 8: 第一切片回归验收与迁移文档

**Files:**
- Create: `playwright.config.js`
- Create: `README.md`
- Modify: `tests/structure/baseline.test.js`
- Modify: existing `work/*.test.js` only where paths must change from `offer-os.html` to `index.html`.

**Interfaces:**
- Produces: documented local development, test, build, data location and backup workflow.

- [ ] **Step 1: 配置 Playwright**

Create `playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

- [ ] **Step 2: 补充结构回归断言**

Assert `index.html` contains exactly one of `#heatmap-card`, `.next-moment-compact`, `.month-agenda`, `#month-days`, and all five page sections. Verify the migration never edited the source baseline with `git diff --exit-code -- offer-os.html`.

- [ ] **Step 3: 编写 README**

Document exact commands `npm install`, `npm run dev`, `npm test`, `npm run test:e2e`, `npm run build`; state that IndexedDB is browser-local, clearing site data deletes it, export should be used for backup, demo login is not a cloud account, and LLM keys must never be committed.

- [ ] **Step 4: 执行最终验证**

Run:

```bash
npm test
npm run test:e2e
npm run build
git diff --exit-code -- offer-os.html
```

Expected: all unit, structure and Chromium desktop/mobile tests PASS; Vite build succeeds with no missing assets; the final command returns exit code 0.

- [ ] **Step 5: 检查敏感信息并提交**

Run:

```bash
git grep -nE "(sk-[A-Za-z0-9_-]{16,}|api[_-]?key[[:space:]]*[:=][[:space:]]*['\"][^'\"]+)" -- ':!package-lock.json'
```

Expected: no output.

```bash
git add README.md playwright.config.js tests work
git commit -m "test: verify local-first core workflow"
```

---

## Completion Criteria

- `offer-os.html` remains unchanged as the migration baseline.
- `npm test`, `npm run test:e2e`, and `npm run build` all pass.
- A newly added job survives reload.
- A stage change survives reload and creates one activity record.
- Dashboard counts and the 91-day heatmap update from stored activities and survive reload.
- Backup export, merge import and replace import work transactionally.
- No React dependency, cloud dependency, real authentication claim or committed API key exists.
- Remaining legacy modules continue to open and perform at least their pre-migration behavior.

## Follow-on Plans

After this slice passes review, create separate implementation plans in this order:

1. Calendar persistence and job-event linkage.
2. Resume version persistence, safe rich-text handling and file import.
3. Interview session history and review linkage.
4. Review and portal migration from localStorage.
5. Settings cleanup, full-store backup, GitHub Pages workflow and public release packaging.
