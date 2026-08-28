// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderJobs } from '../../src/modules/jobs/jobs-view.js';

const stages = ['关注', '已投递', '已测评', '面试中', '已结束'];

function createBoard() {
  const board = document.createElement('div');
  board.id = 'kanban-board';

  stages.forEach((stage) => {
    const column = document.createElement('section');
    column.className = 'kanban-col';
    column.dataset.stage = stage;

    const count = document.createElement('span');
    count.className = 'col-count';
    count.textContent = '99';

    const staleCard = document.createElement('article');
    staleCard.className = 'job-card';

    const addCard = document.createElement('button');
    addCard.className = 'add-card';
    addCard.textContent = `添加到${stage}`;

    column.append(count, staleCard, addCard);
    board.appendChild(column);
  });

  document.body.replaceChildren(board);
  return board;
}

function createBoardAndTable() {
  const board = createBoard();
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>公司 / 岗位</th><th>阶段</th><th>子阶段</th><th>批次</th><th>Base 地</th><th>投递链接</th><th>JD</th><th>投递日期</th><th>来源</th><th>收藏</th><th>更新</th></tr></thead><tbody id="job-table-body"></tbody>';
  document.body.appendChild(table);
  return { board, table };
}

describe('renderJobs', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('safely groups jobs by stage and preserves each add card', () => {
    const board = createBoard();
    const company = '<img onerror=alert(1)>';

    renderJobs(board, [{
      id: 'job-1',
      company,
      position: 'Product Intern',
      base: '上海 / 远程',
      batch: '日常实习',
      priority: 'P1',
      favorite: false,
      stage: '已投递',
    }]);

    const matchingColumn = board.querySelector('.kanban-col[data-stage="已投递"]');
    const card = matchingColumn.querySelector('.job-card');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain(company);
    expect(card.querySelector('img')).toBeNull();
    expect(card.dataset).toMatchObject({
      id: 'job-1', company, position: 'Product Intern', batch: '日常实习',
      priority: 'P1', favorite: 'false', base: '上海 / 远程',
    });
    expect([...board.querySelectorAll('.col-count')].map((count) => count.textContent))
      .toEqual(['0', '1', '0', '0', '0']);
    expect([...board.querySelectorAll('.add-card')].map((button) => button.textContent))
      .toEqual(stages.map((stage) => `添加到${stage}`));

    const stageControl = card.querySelector('[data-job-action="stage"]');
    expect(stageControl).toBeInstanceOf(HTMLSelectElement);
    expect(stageControl.getAttribute('aria-label')).toBe(`更改${company} Product Intern的阶段`);
    expect(stageControl.value).toBe('已投递');
    expect([...stageControl.options].map(({ value }) => value)).toEqual(stages);
  });

  it('renders the persistent job set into the table with the same ids and safe text', () => {
    const { table } = createBoardAndTable();
    const company = '<img onerror=alert(1)>';

    renderJobs(document, [{
      id: 'job-table-1', company, position: 'Product Intern', base: '上海', batch: '日常实习',
      priority: 'P1', stage: '已投递', email: 'recruiting@example.com', applyLink: 'https://example.com/apply',
      referral: 'REF-123', other: '请提前准备附件', jdRaw: '原始 JD', jdFormatted: '整理后 JD',
      createdAt: '2026-08-26T08:00:00.000Z', updatedAt: '2026-08-27T08:00:00.000Z', order: 0,
    }]);

    const row = table.querySelector('#job-table-body tr[data-id="job-table-1"]');
    expect(row).not.toBeNull();
    expect(row.dataset).toMatchObject({
      id: 'job-table-1', company, position: 'Product Intern', stage: '已投递', priority: 'P1',
      email: 'recruiting@example.com', applyLink: 'https://example.com/apply', referral: 'REF-123',
      other: '请提前准备附件', jdRaw: '原始 JD', jdFormatted: '整理后 JD',
    });
    expect(row.textContent).toContain(company);
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('[data-job-action="stage"]').value).toBe('已投递');
    expect(row.querySelector('[data-job-action="detail"]')).not.toBeNull();
    expect(row.querySelector('[data-job-action="delete"]')).not.toBeNull();
    expect(row.children[2].textContent).toBe('P1');
    expect([...table.querySelectorAll('thead th')].at(-2).textContent).toBe('操作');
    expect(row.lastElementChild.textContent).toBe('2026-08-27');
  });
});
