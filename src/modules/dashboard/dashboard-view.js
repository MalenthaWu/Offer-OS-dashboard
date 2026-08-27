import { computeDashboard } from './dashboard-stats.js';

const HEAT_COLORS = Object.freeze(['#EAF1F9', '#C7DCF2', '#8FBCE8', '#4C8FD4', '#1F5FA8']);
const WEEKDAY_LABELS = Object.freeze(['日', '一', '二', '三', '四', '五', '六']);

function heatLevel(count) {
  return Math.min(4, Math.max(0, Number(count) || 0));
}

function documentFor(root) {
  return root.ownerDocument ?? root;
}

function statisticValues(summary) {
  return [
    summary.totalJobs,
    summary.stageCounts['关注'],
    summary.heatmap.totalApplications,
    summary.stageCounts['已结束'],
  ];
}

function updateStatistics(root, summary) {
  root.querySelectorAll('.dash-stat strong').forEach((node, index) => {
    const value = statisticValues(summary)[index];
    if (value != null) node.textContent = String(value);
  });
}

function updateHeatLabels(root, days, doc) {
  const weekdays = root.querySelector('#heat-weekdays');
  if (weekdays && days.length) {
    const firstDay = new Date(`${days[0].date}T12:00:00`);
    weekdays.replaceChildren(...Array.from({ length: 7 }, (_, index) => {
      const label = doc.createElement('span');
      label.textContent = index % 2 === 0 ? WEEKDAY_LABELS[(firstDay.getDay() + index) % 7] : '';
      return label;
    }));
  }

  const months = root.querySelector('#heat-months');
  if (!months) return;
  months.replaceChildren();
  let priorMonth = '';
  days.forEach((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const month = `${date.getFullYear()}-${date.getMonth()}`;
    if (month === priorMonth) return;
    priorMonth = month;
    const label = doc.createElement('span');
    label.textContent = `${date.getMonth() + 1}月`;
    label.style.left = `${Math.floor(index / 7) * 16}px`;
    months.append(label);
  });
}

function bindTooltip(root, grid) {
  const tip = root.querySelector('#heat-tip');
  if (!tip) return;

  grid.onmouseover = (event) => {
    const cell = event.target.closest('.heat-cell');
    if (!cell || !grid.contains(cell)) return;
    tip.textContent = cell.getAttribute('aria-label') || '';
    tip.style.display = 'block';
    tip.style.left = `${cell.offsetLeft + cell.offsetWidth / 2}px`;
    tip.style.top = `${cell.offsetTop}px`;
  };
  grid.onmouseleave = () => { tip.style.display = 'none'; };
}

export function renderDashboard(root, summary) {
  const doc = documentFor(root);
  const grid = root.querySelector('#heat-grid');
  updateStatistics(root, summary);
  if (!grid) return;

  const fragment = doc.createDocumentFragment();
  summary.heatmap.days.forEach((day) => {
    const count = Number(day.count) || 0;
    const cell = doc.createElement('div');
    cell.className = `heat-cell heat-level-${heatLevel(count)}`;
    cell.dataset.date = day.date;
    cell.dataset.count = String(count);
    cell.setAttribute('aria-label', `${day.date}，${count} 次投递`);
    cell.setAttribute('role', 'gridcell');
    cell.style.backgroundColor = HEAT_COLORS[heatLevel(count)];
    fragment.append(cell);
  });
  grid.replaceChildren(fragment);
  updateHeatLabels(root, summary.heatmap.days, doc);
  bindTooltip(root, grid);
}

export function initDashboardView({ root, store, today = () => new Date() }) {
  root.__OFFER_OS_DASHBOARD_CLEANUP__?.();

  const render = () => {
    const currentToday = typeof today === 'function' ? today() : today;
    renderDashboard(root, computeDashboard({ ...store.getState(), today: currentToday }));
  };
  let scheduled = false;
  const scheduleRender = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      render();
    });
  };
  const unsubscribeJobs = store.subscribe('jobs:changed', scheduleRender);
  const unsubscribeActivities = store.subscribe('activities:changed', scheduleRender);
  render();

  const cleanup = () => {
    unsubscribeJobs();
    unsubscribeActivities();
    if (root.__OFFER_OS_DASHBOARD_CLEANUP__ === cleanup) delete root.__OFFER_OS_DASHBOARD_CLEANUP__;
  };
  root.__OFFER_OS_DASHBOARD_CLEANUP__ = cleanup;
  return cleanup;
}
