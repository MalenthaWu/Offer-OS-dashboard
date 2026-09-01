# Dashboard Calendar-Centered Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved calendar-centered dashboard layout without changing dashboard content, DOM structure, or JavaScript behavior.

**Architecture:** Keep the existing single-file application and adjust only dashboard-scoped CSS. Add a small source-level regression test that verifies the desktop grid, responsive order, and unchanged dashboard module markup.

**Tech Stack:** HTML5, CSS Grid, vanilla JavaScript, Node.js assertions, Playwright CLI.

## Global Constraints

- Preserve every existing dashboard module and its internal content.
- Desktop right rail stays between 320px and 360px.
- Desktop column gap is 16px and right-rail vertical gap is 14px.
- Below 1100px, switch the dashboard to one column and render the right-rail cards in the order: next moment, agenda, heatmap.
- Do not modify dashboard JavaScript or other application pages.

---

### Task 1: Calendar-Centered Dashboard Layout

**Files:**
- Create: `work/dashboard-layout.test.js`
- Modify: `offer-os.html:347-400`
- Modify: `offer-os.html:821-865`
- Test: `work/dashboard-layout.test.js`

**Interfaces:**
- Consumes: Existing `.month-layout`, `.month-side`, `#heatmap-card`, `.next-moment-compact`, and `.month-agenda` selectors.
- Produces: Desktop two-column layout and mobile card ordering implemented entirely with CSS.

- [ ] **Step 1: Write the failing source regression test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('offer-os.html', 'utf8');

assert.match(html, /\.month-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*clamp\(320px,\s*24vw,\s*360px\)/s);
assert.match(html, /\.month-layout\s*\{[^}]*gap:\s*16px/s);
assert.match(html, /\.month-side\s*\{[^}]*gap:\s*14px/s);
assert.match(html, /@media \(max-width:\s*1100px\)[\s\S]*?#heatmap-card\s*\{\s*order:\s*3/s);
assert.match(html, /@media \(max-width:\s*1100px\)[\s\S]*?\.next-moment-compact\s*\{\s*order:\s*1/s);
assert.match(html, /@media \(max-width:\s*1100px\)[\s\S]*?\.month-agenda\s*\{\s*order:\s*2/s);

for (const marker of ['id="heatmap-card"', 'class="next-moment-compact"', 'class="panel month-agenda"', 'id="month-days"']) {
  assert.equal(html.split(marker).length - 1, 1, `${marker} must remain exactly once`);
}
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `node work/dashboard-layout.test.js`

Expected: FAIL because the approved `clamp(320px, 24vw, 360px)` grid and mobile `order` declarations do not exist yet.

- [ ] **Step 3: Implement the minimal dashboard-scoped CSS**

```css
#page-dashboard > .page-heading { margin-bottom: 16px; }
.dash-stat-grid { margin-bottom: 16px; gap: 12px; }
.month-layout { grid-template-columns: minmax(0, 1fr) clamp(320px, 24vw, 360px); gap: 16px; }
.month-side { gap: 14px; }

@media (max-width: 1180px) {
  .month-layout { grid-template-columns: minmax(0, 1fr) 320px; gap: 14px; }
}

@media (max-width: 1100px) {
  .month-layout { grid-template-columns: 1fr; }
  .month-canvas { min-width: 640px; }
  .month-side { grid-template-columns: 1fr; }
  #heatmap-card { order: 3; }
  .next-moment-compact { order: 1; }
  .month-agenda { order: 2; }
}
```

- [ ] **Step 4: Run the source regression test and verify it passes**

Run: `node work/dashboard-layout.test.js`

Expected: exits with status 0 and no output.

- [ ] **Step 5: Verify the rendered layout at desktop, tablet, and mobile widths**

Run Playwright screenshots at `1440x1000`, `1024x900`, and `390x844` after logging into the demo account.

Expected: desktop and tablet show a calendar-led two-column layout; mobile shows calendar, next moment, agenda, then heatmap; no horizontal page overflow appears.

- [ ] **Step 6: Record repository status**

Run: `git status --short`

Expected: if the workspace is not a Git repository, record that no commit can be created; otherwise commit only the plan, test, and HTML changes.
