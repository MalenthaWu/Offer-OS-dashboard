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
  });
});
