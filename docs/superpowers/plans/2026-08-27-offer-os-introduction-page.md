# Offer OS Introduction Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone responsive Chinese introduction page that explains Offer OS for WorkBuddy contest submission, GitHub visitors, and social-media sharing.

**Architecture:** Add one self-contained root HTML file. Inline CSS and inline SVG create the visual system and product preview without external assets; a small Node structural test locks the content and responsive contract.

**Tech Stack:** Semantic HTML5, vanilla CSS, inline SVG, Node.js `assert`, Vite.

## Global Constraints

- Create `offer-os-intro.html`; do not modify `offer-os.html` or any existing uncommitted file.
- State that Offer OS is for students seeking daily internships, summer internships, and campus recruitment.
- Include the full workflow, five core modules, supporting tools, three-step onboarding, and a valid `offer-os.html` workbench link.
- Use no external images, fonts, URLs, trackers, fabricated achievements, personal data, or unverified third-party integration claims.
- Render without horizontal overflow at 390px, 1024px, and 1440px.

---

### Task 1: Specify the introduction page structure

**Files:**
- Create: `work/offer-os-intro.test.js`
- Test: `work/offer-os-intro.test.js`

**Interfaces:**
- Consumes: root-level `offer-os-intro.html` as UTF-8.
- Produces: the command `node work/offer-os-intro.test.js`, which exits zero only if required sections, copy, local link, and mobile query exist.

- [ ] **Step 1: Write the failing test**

~~~js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('offer-os-intro.html', 'utf8');
for (const id of ['top', 'workflow', 'modules', 'tools', 'start', 'template']) {
  assert.ok(html.includes('id="' + id + '"'), 'missing #' + id);
}
for (const copy of [
  '面向在校学生的全流程求职工作台', '日常实习', '暑期实习', '校招',
  '发现机会', '收集与管理岗位', '匹配与生成简历', '面试准备与模拟', '记录与复盘',
  '时间与任务看板', '岗位管理与搜集', '简历工作区', '模拟面试',
  '飞书同步', '岗位搜索', '三步开始使用'
]) assert.ok(html.includes(copy), 'missing: ' + copy);
assert.match(html, /href="offer-os\.html"/);
assert.match(html, /@media \(max-width: 720px\)/);
assert.doesNotMatch(html, /https?:\/\//);
console.log('offer-os introduction structure is present');
~~~

- [ ] **Step 2: Verify it fails before the page exists**

Run: `node work/offer-os-intro.test.js`  
Expected: exits non-zero with an ENOENT error for `offer-os-intro.html`.

- [ ] **Step 3: Commit the failing test**

~~~bash
git add work/offer-os-intro.test.js
git commit -m "test: specify Offer OS introduction page"
~~~

### Task 2: Create the product story and visual system

**Files:**
- Create: `offer-os-intro.html`
- Test: `work/offer-os-intro.test.js`

**Interfaces:**
- Consumes: the section IDs and copy contract from Task 1.
- Produces: one directly openable page, with the only product action linking to `offer-os.html`.

- [ ] **Step 1: Create the document and semantic shell**

~~~html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Offer OS 是面向在校学生的全流程求职工作台。">
  <title>Offer OS · 学生求职工作台</title>
</head>
<body>
<header class="site-header">
  <a class="brand" href="#top" aria-label="Offer OS 首页">Offer <span>OS</span></a>
  <nav aria-label="页面导航"><a href="#workflow">求职闭环</a><a href="#modules">核心模块</a><a href="#start">开始使用</a></nav>
  <a class="button button-dark" href="offer-os.html">打开工作台 <span aria-hidden="true">↗</span></a>
</header>
<main>
  <section id="top" class="hero" aria-labelledby="hero-title"></section>
  <section id="workflow" class="section workflow" aria-labelledby="workflow-title"></section>
  <section id="modules" class="section modules" aria-labelledby="modules-title"></section>
  <section id="tools" class="section tools" aria-labelledby="tools-title"></section>
  <section id="start" class="section start" aria-labelledby="start-title"></section>
  <section id="template" class="section template" aria-labelledby="template-title"></section>
</main>
</body>
</html>
~~~

- [ ] **Step 2: Add the hero and product preview**

Use this exact visible copy:

~~~html
<p class="eyebrow">FOR STUDENT JOB SEEKERS</p>
<h1 id="hero-title">让每一次求职，<br><em>都有清晰的下一步。</em></h1>
<p class="hero-copy">Offer OS 是面向在校学生的全流程求职工作台，覆盖日常实习、暑期实习与校招，将岗位、日程、简历、面试与复盘收拢在同一套行动系统中。</p>
<div class="scenario-tags"><span>日常实习</span><span>暑期实习</span><span>校招</span></div>
<a class="button button-dark" href="offer-os.html">进入 Offer OS 工作台 <span aria-hidden="true">↗</span></a>
~~~

Create the adjacent preview only with CSS and inline SVG: dark Offer OS side rail, a dashboard greeting, timeline card, three stage cards, and a compact “下一步” card. Add `aria-hidden="true"` to the preview because nearby copy already explains it.

- [ ] **Step 3: Add friction-to-workflow narrative and modules**

Add three short problem cards titled “信息分散”、“节点易漏”、“准备割裂”. Add a six-item ordered workflow with the exact labels “发现机会”、“收集与管理岗位”、“匹配与生成简历”、“面试准备与模拟”、“记录与复盘”、“推进下一次机会”. Give each item one sentence describing its user action.

Render a five-card grid using these exact headings and plain-language descriptions:

- 时间与任务看板：集中追踪面试、笔试和截止时间。
- 岗位管理与搜集：看板管理流程，多渠道收集有效岗位信息。
- 简历工作区：基于目标岗位 JD 生成、调整和管理简历版本。
- 模拟面试：结合岗位和简历进行针对性练习。
- 记录与复盘：沉淀反馈与经验，支持持续改进。

- [ ] **Step 4: Add tools, onboarding, and template reuse copy**

Create three tool cards:

~~~html
<article><h3>飞书同步</h3><p>在熟悉的协作环境中同步岗位、日程与简历相关信息。</p></article>
<article><h3>岗位搜索</h3><p>围绕目标方向，多场景搜集值得跟进的有效机会。</p></article>
<article><h3>校招官网与快速填写工具</h3><p>减少查找入口和重复填写带来的操作成本。</p></article>
~~~

Add a “三步开始使用” ordered list: “建立目标 / 填写个人方向与目标批次”、“导入机会 / 手动添加、同步或通过搜索器收集岗位”、“围绕下一步推进 / 记录节点、准备面试、完成复盘”。

In `#template`, say the template suits students pursuing internships or campus recruitment, explain that example records should be replaced by the user’s target jobs, display “模板链接、GitHub 链接与社交分享链接可在投稿前补充”, and finish with an `href="offer-os.html"` call to action.

- [ ] **Step 5: Implement responsive and accessible CSS**

~~~css
:root { --ink: #172022; --paper: #f4f3ee; --card: #fff; --line: #d8ded8; --mint: #b7ddca; --blue: #b9cde1; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
.section, .hero { width: min(1180px, calc(100% - 48px)); margin-inline: auto; }
.hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, .88fr); gap: 48px; }
.module-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
:focus-visible { outline: 3px solid #2b6b55; outline-offset: 4px; }
@media (max-width: 720px) {
  .site-header nav { display: none; }
  .section, .hero { width: min(100% - 32px, 1180px); }
  .hero, .module-grid { grid-template-columns: 1fr; }
  .workflow-list { grid-template-columns: 1fr 1fr; }
}
~~~

Use `clamp()` for hero type, avoid page-level `min-width`, and disable decorative animation in `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 6: Run the required structural and build checks**

Run: `node work/offer-os-intro.test.js && npm run build`  
Expected: outputs `offer-os introduction structure is present`; Vite finishes with `✓ built` and emits `offer-os-intro.html` in `dist/`.

- [ ] **Step 7: Verify all target widths in Chromium**

Run Vite in one terminal: `npx vite --host 127.0.0.1 --port 4173`.

Run in a second terminal:

~~~bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true }); for (const width of [390,1024,1440]) { const page = await browser.newPage({ viewport: { width, height: 900 } }); await page.goto('http://127.0.0.1:4173/offer-os-intro.html'); const r = await page.evaluate(() => ({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,title:document.title,link:!!document.querySelector('a[href=\"offer-os.html\"]')})); if (r.sw !== r.cw || r.title !== 'Offer OS · 学生求职工作台' || !r.link) throw new Error(JSON.stringify({width,...r})); await page.screenshot({path:'output/playwright/offer-os-intro-'+width+'.png',fullPage:true}); } await browser.close(); })().catch(e=>{console.error(e);process.exit(1)})"
~~~

Expected: exit 0; three screenshots exist and each has no horizontal overflow.

- [ ] **Step 8: Commit implementation and verification artifacts**

~~~bash
git add offer-os-intro.html work/offer-os-intro.test.js output/playwright/offer-os-intro-390.png output/playwright/offer-os-intro-1024.png output/playwright/offer-os-intro-1440.png
git commit -m "feat: add Offer OS introduction page"
~~~

## Plan self-review

- **Spec coverage:** Task 2 implements every agreed section: audience, full workflow, five modules, supporting tools, onboarding, reusable-template guidance, visual direction, safe local link, and responsive layouts.
- **No placeholders:** Content, section IDs, copy, test assertions, commands, and link targets are explicit.
- **Interface consistency:** Task 1 asserts exactly the IDs, terms, link, and mobile media query Task 2 creates; Task 2 gives the page the exact title checked in Task 2’s browser command.
