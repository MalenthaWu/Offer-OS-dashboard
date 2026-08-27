// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/app/store.js';
import { computeDashboard } from '../../src/modules/dashboard/dashboard-stats.js';
import { initDashboardView, renderDashboard } from '../../src/modules/dashboard/dashboard-view.js';

const localTime = (year, monthIndex, day, hour = 12) => new Date(year, monthIndex, day, hour);

describe('computeDashboard', () => {
  it('builds an exact 91-day local-calendar application heatmap', () => {
    const today = localTime(2026, 7, 26);
    const summary = computeDashboard({
      today,
      jobs: [
        { id: 'job-1', stage: '已投递' },
        { id: 'job-2', stage: '关注' },
      ],
      activities: [
        { type: '投递', occurredAt: localTime(2026, 4, 28, 9).toISOString() },
        { type: '投递', occurredAt: localTime(2026, 7, 26, 17).toISOString() },
        { type: '投递', occurredAt: localTime(2026, 4, 27, 23).toISOString() },
        { type: '测评', occurredAt: localTime(2026, 7, 26, 18).toISOString() },
      ],
    });

    expect(summary.heatmap.days).toHaveLength(91);
    expect(summary.heatmap.totalApplications).toBe(2);
    expect(summary.heatmap.days[0].date).toBe('2026-05-28');
    expect(summary.heatmap.days.at(-1).date).toBe('2026-08-26');
    expect(summary.stageCounts['已投递']).toBe(1);
  });

  it('counts all stages and calculates active-day streaks from applications only', () => {
    const summary = computeDashboard({
      today: localTime(2026, 7, 26),
      jobs: [
        { stage: '关注' }, { stage: '已投递' }, { stage: '已测评' },
        { stage: '面试中' }, { stage: '已结束' }, { stage: '未知' },
      ],
      activities: [
        { type: '投递', occurredAt: localTime(2026, 7, 22, 9).toISOString() },
        { type: '投递', occurredAt: localTime(2026, 7, 23, 9).toISOString() },
        { type: '投递', occurredAt: localTime(2026, 7, 25, 9).toISOString() },
        { type: '投递', occurredAt: localTime(2026, 7, 26, 9).toISOString() },
        { type: '面试', occurredAt: localTime(2026, 7, 24, 9).toISOString() },
      ],
    });

    expect(summary.stageCounts).toEqual({
      '关注': 1, '已投递': 1, '已测评': 1, '面试中': 1, '已结束': 1,
    });
    expect(summary.heatmap.activeDays).toBe(4);
    expect(summary.heatmap.currentStreak).toBe(2);
    expect(summary.heatmap.bestStreak).toBe(2);
  });
});

describe('renderDashboard', () => {
  it('rebuilds an accessible 13 by 7 heatmap without interpreting tooltip text as HTML', () => {
    document.body.innerHTML = `
      <div class="dash-stat-grid">
        <article class="dash-stat"><strong>0</strong><p>岗位总数</p></article>
        <article class="dash-stat"><strong>0</strong><p>待投递</p></article>
        <article class="dash-stat"><strong>0</strong><p>已投递</p></article>
        <article class="dash-stat"><strong>0</strong><p>已结束</p></article>
      </div>
      <div id="heat-grid"></div><div id="heat-tip"></div>`;
    const summary = computeDashboard({
      today: localTime(2026, 7, 26),
      jobs: [{ stage: '关注' }, { stage: '已投递' }, { stage: '已结束' }],
      activities: [{ type: '投递', occurredAt: localTime(2026, 7, 26, 9).toISOString() }],
    });

    renderDashboard(document, summary);

    const cells = document.querySelectorAll('#heat-grid .heat-cell');
    const today = document.querySelector('#heat-grid [data-date="2026-08-26"]');
    expect(cells).toHaveLength(91);
    expect(today.dataset.count).toBe('1');
    expect(today.getAttribute('aria-label')).toBe('2026-08-26，1 次投递');
    expect(today.className).toMatch(/heat-level-[0-4]/);
    expect([...document.querySelectorAll('.dash-stat strong')].map((node) => node.textContent))
      .toEqual(['3', '1', '1', '1']);

    today.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(document.querySelector('#heat-tip').textContent).toBe('2026-08-26，1 次投递');
    expect(document.querySelector('#heat-tip').querySelector('*')).toBeNull();
  });

  it('coalesces same-tick job and activity notifications into one dashboard render', async () => {
    document.body.innerHTML = `
      <div class="dash-stat-grid"><article class="dash-stat"><strong></strong></article></div>
      <div id="heat-grid"></div><div id="heat-tip"></div>`;
    const store = createAppStore();
    const grid = document.querySelector('#heat-grid');
    const replaceChildren = vi.spyOn(grid, 'replaceChildren');

    const cleanup = initDashboardView({ root: document, store });
    replaceChildren.mockClear();
    store.setJobs([{ stage: '已投递' }]);
    store.setActivities([{ type: '投递', occurredAt: new Date().toISOString() }]);
    await Promise.resolve();

    expect(replaceChildren).toHaveBeenCalledOnce();
    cleanup();
  });

  it('updates statistic nodes even when a host has no heatmap markup', () => {
    document.body.innerHTML = '<article class="dash-stat"><strong>0</strong></article>';

    renderDashboard(document, computeDashboard({ jobs: [{ stage: '关注' }] }));

    expect(document.querySelector('.dash-stat strong').textContent).toBe('1');
  });
});
