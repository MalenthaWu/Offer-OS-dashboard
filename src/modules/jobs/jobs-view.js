const STAGE_CLASS = Object.freeze({
  '关注': 'badge-gray',
  '已投递': 'badge-blue',
  '已测评': 'badge-butter',
  '面试中': 'badge-lilac',
  '已结束': 'badge-mint',
});

const PRIORITY_CLASS = Object.freeze({
  P0: 'badge-pri-0',
  P1: 'badge-pri-1',
  P2: 'badge-pri-2',
});

const asText = (value) => value == null ? '' : String(value);

function createElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value != null) element.textContent = asText(value);
  return element;
}

function createIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon icon-sm');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.appendChild(use);
  return svg;
}

function jobSource(job) {
  if (job.referral ?? job.referral_code) return '内推码';
  if (job.applyLink ?? job.apply_link) return '链接投递';
  if (job.email) return '邮箱投递';
  if (job.other) return '其他';
  return '手动';
}

export function createJobCard(job) {
  const card = document.createElement('article');
  const stage = asText(job.stage || '关注');
  const priority = asText(job.priority).toUpperCase();

  card.className = 'job-card';
  card.draggable = true;
  card.dataset.jobSearch = '';
  card.dataset.id = asText(job.id);
  card.dataset.company = asText(job.company);
  card.dataset.position = asText(job.position);
  card.dataset.batch = asText(job.batch);
  card.dataset.priority = priority;
  card.dataset.favorite = job.favorite ? 'true' : 'false';
  card.dataset.base = asText(job.base);
  card.dataset.stage = stage;
  card.dataset.jdRaw = asText(job.jdRaw ?? job.jd);
  card.dataset.jdFormatted = asText(job.jdFormatted);
  card.dataset.email = asText(job.email);
  card.dataset.applyLink = asText(job.applyLink ?? job.apply_link);
  card.dataset.referral = asText(job.referral ?? job.referral_code);
  card.dataset.other = asText(job.other);

  const top = createElement('div', 'job-top');
  const logo = createElement('span', 'company-logo', asText(job.company).slice(0, 2).toUpperCase() || '?');
  const title = createElement('div', 'job-title');
  title.append(
    createElement('strong', '', job.position),
    createElement('span', '', `${asText(job.company)} · ${asText(job.base) || '未填 Base'}`),
  );
  top.append(
    logo,
    title,
    createElement('span', `badge ${STAGE_CLASS[stage] || 'badge-gray'} job-status`, stage),
  );

  const tags = createElement('div', 'job-tags');
  if (job.base) tags.appendChild(createElement('span', 'badge badge-gray', job.base));
  if (priority) tags.appendChild(createElement('span', `badge ${PRIORITY_CLASS[priority] || 'badge-pri-2'}`, priority));

  const meta = createElement('div', 'job-meta');
  const saved = createElement('span', '', job.createdAt ? '已保存' : '刚刚添加');
  saved.prepend(createIcon('clock'));
  const source = createElement('span', 'job-source', jobSource(job));
  const remove = createElement('button', 'job-delete');
  remove.type = 'button';
  remove.title = '删除岗位';
  remove.setAttribute('aria-label', `删除${asText(job.company)} ${asText(job.position)}`.trim());
  remove.dataset.jobAction = 'delete';
  remove.appendChild(createIcon('trash'));
  meta.append(saved, source, remove);

  const actions = createElement('div', 'job-actions');
  const detail = createElement('button', 'mini-action', '查看详情');
  detail.type = 'button';
  detail.dataset.jobAction = 'detail';
  actions.appendChild(detail);

  card.append(top, tags, meta, actions);
  return card;
}

export function renderJobs(root, jobs) {
  const board = root.matches?.('#kanban-board') ? root : root.querySelector('#kanban-board');
  if (!board) return;

  const columns = [...board.querySelectorAll('.kanban-col')];
  columns.forEach((column) => {
    column.querySelectorAll(':scope > .job-card').forEach((card) => card.remove());
  });

  jobs.forEach((job) => {
    const column = columns.find((candidate) => candidate.dataset.stage === (job.stage || '关注'));
    if (!column) return;
    column.insertBefore(createJobCard(job), column.querySelector(':scope > .add-card'));
  });

  columns.forEach((column) => {
    const count = column.querySelector('.col-count');
    if (count) count.textContent = String(column.querySelectorAll(':scope > .job-card').length);
  });
}
