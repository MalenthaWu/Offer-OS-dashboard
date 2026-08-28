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

const JOB_STAGES = Object.freeze(['关注', '已投递', '已测评', '面试中', '已结束']);

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

function sortedJobs(jobs) {
  return jobs.slice().sort((left, right) => {
    const leftOrder = Number.isFinite(left.order) ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.order) ? right.order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || String(left.createdAt || '').localeCompare(String(right.createdAt || '')) || String(left.id).localeCompare(String(right.id));
  });
}

function createStageControl(job) {
  const stage = asText(job.stage || '关注');
  const stageControl = createElement('select', 'select-input mini-action');
  stageControl.dataset.jobAction = 'stage';
  stageControl.setAttribute('aria-label', `更改${asText(job.company)} ${asText(job.position)}的阶段`.trim());
  JOB_STAGES.forEach((value) => {
    const option = createElement('option', '', value);
    option.value = value;
    option.selected = value === stage;
    stageControl.appendChild(option);
  });
  return stageControl;
}

function createTableCell(content, className) {
  const cell = createElement('td', className);
  if (content) cell.append(content);
  return cell;
}

function createJobTableRow(job) {
  const stage = asText(job.stage || '关注');
  const priority = asText(job.priority).toUpperCase();
  const row = document.createElement('tr');
  row.dataset.jobSearch = '';
  row.dataset.id = asText(job.id);
  row.dataset.company = asText(job.company);
  row.dataset.position = asText(job.position);
  row.dataset.batch = asText(job.batch);
  row.dataset.base = asText(job.base);
  row.dataset.stage = stage;
  row.dataset.priority = priority;
  row.dataset.email = asText(job.email);
  row.dataset.applyLink = asText(job.applyLink ?? job.apply_link);
  row.dataset.referral = asText(job.referral ?? job.referral_code);
  row.dataset.other = asText(job.other);
  row.dataset.jdRaw = asText(job.jdRaw ?? job.jd);
  row.dataset.jdFormatted = asText(job.jdFormatted);

  const company = createElement('div', 'company-cell');
  company.append(
    createElement('span', 'company-logo', asText(job.company).slice(0, 2).toUpperCase() || '?'),
    (() => {
      const titles = createElement('div');
      titles.append(createElement('strong', '', job.company), createElement('span', '', job.position));
      return titles;
    })(),
  );
  const details = createElement('button', 'link-button', '查看详情');
  details.type = 'button';
  details.dataset.jobAction = 'detail';
  const remove = createElement('button', 'table-job-delete', '删除');
  remove.type = 'button';
  remove.dataset.jobAction = 'delete';
  remove.setAttribute('aria-label', `删除${asText(job.company)} ${asText(job.position)}`.trim());
  const actions = createElement('div', 'table-job-actions');
  actions.append(details, remove);
  const tags = createElement('div', 'job-tags');
  if (priority) tags.append(createElement('span', `badge ${PRIORITY_CLASS[priority] || 'badge-pri-2'}`, priority));

  row.append(
    createTableCell(company),
    createTableCell(createStageControl(job)),
    createTableCell(tags),
    createTableCell(createElement('span', '', job.batch || '—')),
    createTableCell(createElement('span', '', job.base || '—')),
    createTableCell(createElement('span', '', job.applyLink ?? job.apply_link ? '已保存链接' : '—')),
    createTableCell(createElement('span', '', job.jdFormatted || job.jdRaw || job.jd ? '已保存' : '—')),
    createTableCell(createElement('span', '', job.createdAt?.slice(0, 10) || '—'), 'mono'),
    createTableCell(createElement('span', '', jobSource(job)), 'mono'),
    createTableCell(actions, 'mono'),
    createTableCell(createElement('span', '', job.updatedAt?.slice(0, 10) || '—'), 'mono'),
  );
  return row;
}

function renderJobTable(root, jobs) {
  const body = root.querySelector?.('#job-table-body');
  if (!body) return;
  const table = body.closest('table');
  const favoriteHeader = [...(table?.querySelectorAll('thead th') ?? [])].find((header) => header.textContent.trim() === '收藏');
  if (favoriteHeader) favoriteHeader.textContent = '操作';
  body.replaceChildren(...sortedJobs(jobs).map(createJobTableRow));
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
  const stageControl = createStageControl(job);
  const detail = createElement('button', 'mini-action', '查看详情');
  detail.type = 'button';
  detail.dataset.jobAction = 'detail';
  actions.append(stageControl, detail);

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

  sortedJobs(jobs).forEach((job) => {
    const column = columns.find((candidate) => candidate.dataset.stage === (job.stage || '关注'));
    if (!column) return;
    column.insertBefore(createJobCard(job), column.querySelector(':scope > .add-card'));
  });

  columns.forEach((column) => {
    const count = column.querySelector('.col-count');
    if (count) count.textContent = String(column.querySelectorAll(':scope > .job-card').length);
  });
  renderJobTable(root, jobs);
}
