# Heatmap Three-Month Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the dashboard delivery heatmap from 9 weeks to a rolling 13-week, three-month view.

**Architecture:** Keep the existing renderer and change only its week-count constant and visible range label. Verify the source contract with Node.js and the rendered 91-cell result with Playwright.

**Tech Stack:** HTML5, vanilla JavaScript, Node.js assertions, Playwright CLI.

## Global Constraints

- Render exactly 13 weeks and 91 heatmap cells.
- Show the label “近 3 个月”.
- Preserve the current heatmap dimensions, colors, tooltip, and month-label behavior.

---

### Task 1: Expand Heatmap Range

**Files:**
- Create: `work/heatmap-range.test.js`
- Modify: `offer-os.html:1089`
- Modify: `offer-os.html:1962`
- Test: `work/heatmap-range.test.js`

**Interfaces:**
- Consumes: Existing `renderHeatmap()` function and `#heat-grid` container.
- Produces: A 13-week heatmap with the visible label “近 3 个月”.

- [ ] **Step 1: Write the failing source regression test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('offer-os.html', 'utf8');

assert.match(html, /<span class="heat-sub">近 3 个月<\/span>/);
assert.match(html, /const WEEKS = 13;/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node work/heatmap-range.test.js`

Expected: FAIL because the current label says “近 1 个月前后” and `WEEKS` is 9.

- [ ] **Step 3: Implement the minimal HTML and JavaScript changes**

```html
<span class="heat-sub">近 3 个月</span>
```

```js
const WEEKS = 13;
```

- [ ] **Step 4: Run the source regression test**

Run: `node work/heatmap-range.test.js`

Expected: exits with status 0 and no output.

- [ ] **Step 5: Verify the rendered result**

Run the page in Playwright and count `#heat-grid .heat-cell`.

Expected: 91 cells, visible text “近 3 个月”, no console errors, and no horizontal page overflow at 1440px and 390px.
