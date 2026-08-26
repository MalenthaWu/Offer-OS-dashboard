// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createResumeJobOption } from '../../src/modules/jobs/resume-job-option.js';

describe('createResumeJobOption', () => {
  it('renders persistent job text without parsing it as markup', () => {
    const company = '<img src=x onerror=alert(1)>';
    const position = '<svg onload=alert(1)>';
    const card = document.createElement('article');
    card.dataset.company = company;
    card.dataset.position = position;
    const title = document.createElement('div');
    title.className = 'job-title';
    title.appendChild(document.createElement('span')).textContent = '上海';
    card.appendChild(title);

    const row = createResumeJobOption(card);

    expect(row.textContent).toContain(company);
    expect(row.textContent).toContain(position);
    expect(row.querySelector('img, svg, [onerror], [onload]')).toBeNull();
  });
});
