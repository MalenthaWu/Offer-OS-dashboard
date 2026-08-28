import { describe, expect, it } from 'vitest';
import { matchesDirection, normalizeCollectionCandidate } from '../../src/domain/collection-candidate.js';

describe('collection candidate', () => {
  it('normalizes a safe candidate and matches its direction', () => {
    const candidate = normalizeCollectionCandidate({
      source: '牛客',
      sourceUrl: 'https://www.nowcoder.com/jobs/123?from=feed',
      company: '示例公司',
      title: 'AI 产品实习生',
      summary: '参与大模型产品设计',
    });

    expect(candidate.sourceUrl).toBe('https://www.nowcoder.com/jobs/123');
    expect(matchesDirection(candidate, { name: 'AI 产品经理', keywords: '大模型,产品' })).toBe(true);
  });

  it('rejects unsafe or incomplete candidates', () => {
    expect(normalizeCollectionCandidate({ source: 'x', sourceUrl: 'javascript:alert(1)', company: 'c', title: 't' })).toBeNull();
    expect(normalizeCollectionCandidate({ source: 'x', sourceUrl: 'https://example.com', company: '', title: 't' })).toBeNull();
  });

  it('matches direction keywords against title and summary case-insensitively', () => {
    const candidate = { title: 'Growth PM', summary: '负责用户增长' };
    expect(matchesDirection(candidate, { name: '产品经理', keywords: '用户增长,AI' })).toBe(true);
    expect(matchesDirection(candidate, { name: '设计师', keywords: '视觉' })).toBe(false);
  });
});
