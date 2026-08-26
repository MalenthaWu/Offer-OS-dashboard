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
