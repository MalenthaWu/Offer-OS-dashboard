import { createResumeJobOption } from '../modules/jobs/resume-job-option.js';

(() => {
      const $ = (selector, root = document) => root.querySelector(selector);
      const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

      const pages = $$('.page');
      const sectionMeta = {
        dashboard: ['Overview', '仪表盘'],
        jobs: ['Workspace', '岗位看板'],
        resume: ['Workspace', '个人简历'],
        interview: ['Practice', '模拟面试'],
        review: ['Workspace', '复盘']
      };
      let toastTimer;
      let interviewTimer;
      let interviewSeconds = 0;
      let questionIndex = 0;
      const questions = [
        '请用两分钟介绍一下你自己，并重点说明为什么你想做 AI 产品经理。',
        '你提到搭建了“曝光—点击—采纳”漏斗。为什么选择这三个环节？如果采纳率下降，你会先看什么？',
        '假设一款 AI 助手的新用户次日留存只有 18%，请现场拆解你的分析路径和第一轮实验。',
        '讲一个你推动跨团队项目时遇到阻力的例子。你当时做了什么判断，最后结果如何？',
        '如果加入后发现模型效果短期无法明显提升，但业务仍要求增长，你会如何制定接下来一个月的产品计划？'
      ];

      const showToast = (message) => {
        $('#toast-text').textContent = message;
        $('#toast').classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2200);
      };

      const closeMobileNav = () => {
        $('#sidebar').classList.remove('open');
        $('#scrim').classList.remove('open');
      };

      const activateSection = (section) => {
        if (!sectionMeta[section]) return;
        pages.forEach(page => page.classList.toggle('active', page.id === `page-${section}`));
        $$('.nav-item[data-section]').forEach(item => item.classList.toggle('active', item.dataset.section === section));
        closeMobileNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      $$('.nav-item[data-section]').forEach(item => item.addEventListener('click', () => activateSection(item.dataset.section)));
      $$('[data-section-jump]').forEach(item => item.addEventListener('click', () => activateSection(item.dataset.sectionJump)));
      $('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('open'); });
      $('#scrim').addEventListener('click', closeMobileNav);

      const addJobDialog = $('#add-job-dialog');
      const openAddJob = () => { if (typeof addJobDialog.showModal === 'function') addJobDialog.showModal(); else addJobDialog.setAttribute('open', ''); };
      $('#top-add-job').addEventListener('click', openAddJob);
      $$('.add-job-trigger').forEach(button => button.addEventListener('click', openAddJob));
      $$('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));

      // 整理 JD：只规整排版（统一换行 / 小节加 ◆ / 列表加 •），不增删任何文字内容。
      const formatJD = (text) => {
        if (!text || !text.trim()) return '';
        const sectionRe = /^(岗位职责|工作职责|任职要求|任职资格|岗位要求|岗位描述|职位描述|职位要求|工作内容|工作地点|工作城市|薪资|薪资范围|薪酬|福利待遇|福利|我们提供|加分项|优先条件|招聘人数|岗位亮点|关于我们|公司介绍|公司简介|岗位标签|任职条件)[\s：:]*$/;
        const out = [];
        let blank = false;
        for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
          const line = raw.replace(/[ \t]+/g, ' ').trim();
          if (!line) { if (!blank && out.length) { out.push(''); blank = true; } continue; }
          blank = false;
          if (sectionRe.test(line)) {
            out.push(line.startsWith('◆ ') ? line : '◆ ' + line.replace(/[:：]\s*$/, ''));
          } else if (/^[-•·*]/.test(line)) {
            out.push(line.startsWith('• ') ? line : '• ' + line.replace(/^[-•·*]\s*/, ''));
          } else if (/^[\d]+[.、)）]/.test(line)) {
            out.push(line.startsWith('• ') ? line : '• ' + line.replace(/^[\d]+[.、)）]\s*/, ''));
          } else {
            out.push(line);
          }
        }
        return out.join('\n').trim();
      };

      $('#format-jd-btn').addEventListener('click', () => {
        const ta = $('#new-jd');
        const formatted = formatJD(ta.value);
        if (!ta.value.trim()) { showToast('请先粘贴 JD 内容'); return; }
        ta.value = formatted;
        showToast('已整理格式，内容未删改');
      });

      if (!window.__OFFER_OS_FEATURES__?.jobs) {
      $('#add-job-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const company = (data.get('company') || '').toString().trim();
        const position = (data.get('position') || '').toString().trim();
        const batch = data.get('batch') || '日常实习';
        const base = (data.get('base') || '').toString().trim();
        const priority = (data.get('priority') || '').toString().trim();
        const email = (data.get('email') || '').toString().trim();
        const applyLink = (data.get('apply_link') || '').toString().trim();
        const referral = (data.get('referral_code') || '').toString().trim();
        const other = (data.get('other') || '').toString().trim();
        const jdRaw = (data.get('jd') || '').toString();
        if (!company || !position) return;
        const stage = '关注';
        const column = $(`.kanban-col[data-stage="${stage}"]`);
        const initial = company.slice(0, 2).toUpperCase();
        const jdFormatted = formatJD(jdRaw);
        let method = '手动';
        if (referral) method = '内推码';
        else if (applyLink) method = '链接投递';
        else if (email) method = '邮箱投递';
        else if (other) method = '其他';
        const card = document.createElement('article');
        card.className = 'job-card';
        card.dataset.jobSearch = '';
        card.dataset.company = company;
        card.dataset.position = position;
        card.dataset.batch = batch;
        card.dataset.base = base;
        card.dataset.priority = priority;
        card.dataset.stage = stage;
        card.dataset.favorite = 'false';
        card.dataset.jdRaw = jdRaw;
        card.dataset.jdFormatted = jdFormatted;
        card.dataset.email = email;
        card.dataset.applyLink = applyLink;
        card.dataset.referral = referral;
        card.dataset.other = other;
        card.innerHTML = `<div class="job-top"><span class="company-logo">${initial}</span><div class="job-title"><strong>${position}</strong><span>${company} · ${base || '未填 Base'}</span></div></div><div class="job-tags"><span class="badge badge-gray">${batch}</span></div><div class="job-meta"><span><svg class="icon icon-sm"><use href="#i-clock"/></svg>刚刚添加</span><span class="job-source">${method}</span></div>`;
        column.insertBefore(card, $('.add-card', column));
        bindDynamicActions();
        makeDraggable(card);
        restyleKanbanCard(card);
        const count = $('.col-count', column);
        count.textContent = Number(count.textContent) + 1;
        addJobDialog.close();
        event.currentTarget.reset();
        activateSection('jobs');
        showToast(`${company} · ${position} 已加入岗位池`);
      });
      }

      $$('[data-job-view]').forEach(button => button.addEventListener('click', () => {
        $$('[data-job-view]').forEach(item => item.classList.toggle('active', item === button));
        $$('.job-view').forEach(view => view.classList.toggle('active', view.id === `job-view-${button.dataset.jobView}`));
        filterJobs();
      }));

      const filterJobs = () => {
        const query = $('#job-search').value.trim().toLowerCase();
        const batch = $('#batch-filter').value;
        const current = $('.job-view.active');
        let visible = 0;
        $$('[data-job-search]', current).forEach(item => {
          const text = `${item.dataset.company || ''} ${item.dataset.position || ''}`.toLowerCase();
          const matchesText = !query || text.includes(query);
          const matchesBatch = batch === 'all' || item.dataset.batch === batch;
          const show = matchesText && matchesBatch;
          item.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        ['kanban', 'table', 'internships'].forEach(name => {
          const empty = $(`#${name === 'internships' ? 'internship' : name}-empty`);
          if (empty) empty.style.display = current.id === `job-view-${name}` && visible === 0 ? 'block' : 'none';
        });
      };
      $('#job-search').addEventListener('input', filterJobs);
      $('#batch-filter').addEventListener('change', filterJobs);
      $('#more-filter').addEventListener('click', () => showToast('当前演示支持关键词与批次筛选'));

      if (!window.__OFFER_OS_FEATURES__?.jobs) {
      // ---- 看板卡片精简：移除收藏/底部按钮、状态徽标移至右上角、加删除 ----
      const STATUS_RE = /(笔试|测评|一面|二面|三面|HR\s*面|终面|AI\s*面|Offer|流程结束|已归档|拒信|放弃)/;
      const STAGE_CLASS = { '关注': 'badge-gray', '已投递': 'badge-blue', '已测评': 'badge-butter', '面试中': 'badge-lilac', '已结束': 'badge-mint' };
      const deleteKanbanCard = (card) => {
        const name = `${card.dataset.company || ''} ${card.dataset.position || ''}`.trim();
        if (!confirm(`确定删除「${name}」？\n（原型演示，刷新页面后数据恢复）`)) return;
        const col = card.closest('.kanban-col');
        card.remove();
        if (col) { const c = col.querySelector('.col-count'); if (c) c.textContent = col.querySelectorAll('.job-card').length; }
        filterJobs();
        showToast(`已删除：${name}`);
      };
      const restyleKanbanCard = (card) => {
        if (card.dataset.restyled === '1') return;
        const star = card.querySelector('.star-button'); if (star) star.remove();
        const actions = card.querySelector('.job-actions'); if (actions) actions.remove();
        const tags = card.querySelector('.job-tags');
        const col = (card.closest('.kanban-col') || {}).dataset?.stage || '关注';
        let statusBadge = null;
        if (tags) {
          const badges = [...tags.querySelectorAll('.badge')];
          statusBadge = badges.find(b => STATUS_RE.test(b.textContent)) || null;
        }
        if (!statusBadge) {
          statusBadge = document.createElement('span');
          statusBadge.className = 'badge ' + (STAGE_CLASS[col] || 'badge-gray');
          statusBadge.textContent = col;
        }
        const top = card.querySelector('.job-top');
        if (top) { statusBadge.classList.add('job-status'); top.appendChild(statusBadge); }
        // 标签行只保留：Base 地（灰）+ 优先级（红，越高越深）
        const titleSpan = card.querySelector('.job-title span');
        const baseFallback = titleSpan ? titleSpan.textContent.split(' · ').slice(1).join(' · ').trim() : '';
        const base = card.dataset.base || baseFallback || '';
        const priority = (card.dataset.priority || '').toUpperCase();
        const PRI_CLASS = { 'P0': 'badge-pri-0', 'P1': 'badge-pri-1', 'P2': 'badge-pri-2' };
        if (tags) {
          tags.innerHTML = '';
          if (base) {
            const b = document.createElement('span');
            b.className = 'badge badge-gray';
            b.textContent = base;
            tags.appendChild(b);
          }
          if (priority) {
            const p = document.createElement('span');
            p.className = 'badge ' + (PRI_CLASS[priority] || 'badge-pri-2');
            p.textContent = priority;
            tags.appendChild(p);
          }
        }
        const meta = card.querySelector('.job-meta');
        if (meta) {
          const menu = meta.querySelector('.job-menu'); if (menu) menu.remove();
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'job-delete'; del.title = '删除岗位'; del.setAttribute('aria-label', '删除岗位');
          del.innerHTML = '<svg class="icon icon-sm"><use href="#i-trash"/></svg>';
          del.addEventListener('click', (e) => { e.stopPropagation(); deleteKanbanCard(card); });
          meta.appendChild(del);
        }
        card.dataset.restyled = '1';
      };
      const openJobDetail = (card) => {
        const dlg = $('#job-detail-dialog');
        const company = card.dataset.company || '';
        const position = card.dataset.position || '';
        const base = card.dataset.base || '';
        const batch = card.dataset.batch || '';
        const logo = card.querySelector('.company-logo');
        const logoBox = $('#detail-logo');
        if (logo) { logoBox.innerHTML = logo.innerHTML; logoBox.style.cssText = logo.getAttribute('style') || ''; }
        logoBox.className = 'detail-logo';
        $('#detail-company').textContent = company;
        $('#detail-position').textContent = position;
        const status = card.querySelector('.job-status');
        const statusBox = $('#detail-status');
        if (status) {
          const cls = (status.getAttribute('class') || '').split(/\s+/).filter(c => (c === 'badge' || c.startsWith('badge-')) && c !== 'job-status');
          statusBox.className = 'detail-status ' + cls.join(' ');
          statusBox.textContent = status.textContent.trim();
        } else {
          statusBox.className = 'detail-status badge badge-gray';
          statusBox.textContent = card.dataset.stage || '关注';
        }
        const tagsBox = $('#detail-tags');
        tagsBox.innerHTML = '';
        card.querySelectorAll('.job-tags .badge').forEach(b => {
          const el = b.cloneNode(true);
          el.classList.remove('job-status');
          tagsBox.appendChild(el);
        });
        const info = $('#detail-info');
        info.innerHTML = '';
        const addRow = (label, value) => {
          if (!value) return;
          const d = document.createElement('div'); d.className = 'detail-info-item';
          const l = document.createElement('span'); l.className = 'detail-label'; l.textContent = label;
          const v = document.createElement('span'); v.className = 'detail-value'; v.textContent = value;
          d.append(l, v); info.appendChild(d);
        };
        const method = (card.querySelector('.job-source') || {}).textContent || '';
        const added = (card.querySelector('.job-meta span') || {}).textContent || '';
        const titleSpan = card.querySelector('.job-title span');
        const baseFallback = titleSpan ? titleSpan.textContent.split(' · ').slice(1).join(' · ').trim() : '';
        addRow('Base 地', base || baseFallback || '未填');
        addRow('招聘批次', batch || '—');
        addRow('投递渠道', method || '手动');
        addRow('添加时间', added);
        const delivery = $('#detail-delivery');
        delivery.innerHTML = '';
        const dv = (label, value, kind) => {
          if (!value) return;
          const row = document.createElement('div'); row.className = 'detail-dv-row';
          const labelEl = document.createElement('span'); labelEl.className = 'dv-label'; labelEl.textContent = label;
          const valueEl = document.createElement('span'); valueEl.className = 'dv-value'; valueEl.textContent = value; valueEl.title = value;
          const act = document.createElement('button'); act.className = 'dv-action'; act.type = 'button';
          if (kind === 'link') { act.textContent = '打开'; act.addEventListener('click', () => { try { window.open(value, '_blank'); } catch (_) {} }); }
          else { act.textContent = '复制'; act.addEventListener('click', () => { try { navigator.clipboard.writeText(value); } catch (_) {} showToast('已复制：' + label); }); }
          row.append(labelEl, valueEl, act);
          delivery.appendChild(row);
        };
        dv('邮箱', card.dataset.email, 'email');
        dv('投递链接', card.dataset.applyLink, 'link');
        dv('内推码', card.dataset.referral, 'code');
        dv('其他', card.dataset.other, 'note');
        if (!delivery.children.length) delivery.innerHTML = '<span class="detail-empty">暂无投递方式</span>';
        $('#detail-jd').textContent = (card.dataset.jdFormatted || card.dataset.jdRaw || '').trim() || '（该岗位暂无 JD）';
        $('#detail-mock').onclick = () => {
          const opt = [...$('#interview-job').options].find(o => (company + ' ' + position).includes(o.textContent.split(' · ')[0]));
          if (opt) $('#interview-job').value = opt.value;
          dlg.close(); activateSection('interview'); showToast('已带入当前岗位，准备模拟');
        };
        $('#detail-follow').onclick = () => { dlg.close(); showToast('已记录一次跟进'); };
        $('#detail-delete').onclick = () => { dlg.close(); deleteKanbanCard(card); };
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      };
      const deleteTableRow = (row) => {
        const name = `${row.dataset.company || ''} ${row.dataset.position || ''}`.trim();
        if (!confirm(`确定删除「${name}」？`)) return;
        row.classList.add('removing');
        setTimeout(() => { row.remove(); filterJobs(); showToast(`已删除：${name}`); }, 160);
      };
      const cleanupTable = () => {
        const table = document.querySelector('#job-table-body').closest('table');
        const favTh = [...table.querySelectorAll('thead th')].find(th => th.textContent.trim() === '收藏');
        if (favTh) favTh.textContent = '操作';
        $$('#job-table-body tr[data-job-search]').forEach(row => {
          if (row.dataset.tableClean === '1') return;
          const favTd = [...row.children].find(td => { const t = td.textContent.trim(); return t === '★' || t === '☆'; });
          if (favTd) {
            favTd.textContent = ''; favTd.className = 'mono';
            const del = document.createElement('button');
            del.type = 'button'; del.className = 'library-delete'; del.title = '删除'; del.setAttribute('aria-label', '删除 ' + (row.dataset.company || '') + ' ' + (row.dataset.position || ''));
            del.innerHTML = '<svg class="icon icon-sm"><use href="#i-trash"/></svg>';
            del.addEventListener('click', (e) => { e.stopPropagation(); deleteTableRow(row); });
            favTd.appendChild(del);
          }
          row.dataset.tableClean = '1';
        });
      };
      const cleanupInternship = () => { $$('.library-row .library-favorite').forEach(b => b.remove()); };
      $$('.job-card').forEach(restyleKanbanCard);
      cleanupTable();
      cleanupInternship();

      // ---- Kanban drag-and-drop ----
      const STAGE_NAMES = ['关注', '已投递', '已测评', '面试中', '已结束'];
      let draggedCard = null;

      const makeDraggable = (card) => {
        if (card.dataset.dragBound) return;
        card.dataset.dragBound = 'true';
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
          draggedCard = card;
          card._suppressClick = true;
          requestAnimationFrame(() => card.classList.add('dragging'));
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', card.dataset.company || ''); } catch (_) {}
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          setTimeout(() => { card._suppressClick = false; }, 90);
          draggedCard = null;
          $$('.kanban-col').forEach(c => c.classList.remove('drag-over'));
          $$('.job-card.drop-before').forEach(c => c.classList.remove('drop-before'));
        });
      };

      const getDragAfterElement = (container, y) => {
        const cards = [...container.querySelectorAll('.job-card:not(.dragging)')];
        let closest = { offset: -Infinity, element: null };
        for (const child of cards) {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
        }
        return closest.element;
      };

      const updateColumnCounts = () => {
        $$('.kanban-col').forEach(col => {
          const n = col.querySelectorAll('.job-card').length;
          const c = $('.col-count', col);
          if (c) c.textContent = n;
        });
      };

      const syncCardStage = (card, stage) => {
        card.dataset.stage = stage;
        const badge = card.querySelector('.job-status');
        if (badge) {
          badge.textContent = stage;
          badge.className = 'badge ' + (STAGE_CLASS[stage] || 'badge-gray') + ' job-status';
        }
      };

      const bindKanbanDnD = () => {
        const board = $('#kanban-board');
        if (!board) return;
        $$('.kanban-col', board).forEach(col => {
          col.addEventListener('dragover', (e) => {
            if (!draggedCard) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            col.classList.add('drag-over');
            const after = getDragAfterElement(col, e.clientY);
            $$('.job-card.drop-before', col).forEach(c => { if (c !== after) c.classList.remove('drop-before'); });
            if (after) after.classList.add('drop-before');
          });
          col.addEventListener('dragleave', (e) => {
            if (!col.contains(e.relatedTarget)) {
              col.classList.remove('drag-over');
              $$('.job-card.drop-before', col).forEach(c => c.classList.remove('drop-before'));
            }
          });
          col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            $$('.job-card.drop-before', col).forEach(c => c.classList.remove('drop-before'));
            if (!draggedCard) return;
            const after = getDragAfterElement(col, e.clientY);
            const addCard = $('.add-card', col);
            if (after == null) col.insertBefore(draggedCard, addCard);
            else col.insertBefore(draggedCard, after);
            const stage = col.dataset.stage;
            syncCardStage(draggedCard, stage);
            updateColumnCounts();
            filterJobs();
            showToast(`已移动到「${stage}」`);
          });
        });
        $$('.job-card', board).forEach(makeDraggable);
      };
      bindKanbanDnD();

      const bindDynamicActions = (root = document) => {
        $$('.star-button:not([data-bound])', root).forEach(button => {
          button.dataset.bound = 'true';
          button.addEventListener('click', () => {
            button.classList.toggle('favorite');
            const card = button.closest('[data-job-search]');
            card.dataset.favorite = button.classList.contains('favorite') ? 'true' : 'false';
            button.setAttribute('aria-label', button.classList.contains('favorite') ? '取消收藏' : '收藏');
            showToast(button.classList.contains('favorite') ? '已收藏岗位' : '已取消收藏');
            filterJobs();
          });
        });
        $$('[data-toast]:not([data-bound])', root).forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => showToast(button.dataset.toast)); });
        $$('[data-job-search].job-card:not([data-detail-bound])', root).forEach(card => {
          card.dataset.detailBound = 'true';
          card.addEventListener('click', (e) => {
            if (card._suppressClick) return;
            if (e.target.closest('.job-delete')) return;
            openJobDetail(card);
          });
        });
        $$('[data-view-jd]:not([data-bound])', root).forEach(button => {
          button.dataset.bound = 'true';
          button.addEventListener('click', () => {
            const card = button.closest('[data-job-search]');
            const raw = card.dataset.jdRaw || '';
            const formatted = card.dataset.jdFormatted || '';
            $('#jd-dialog-title').textContent = (card.dataset.company || '') + ' · ' + (card.dataset.position || '');
            const view = $('#jd-view');
            if (formatted || raw) {
              view.textContent = formatted || raw;
              view.dataset.formatted = formatted ? '1' : '0';
            } else {
              view.textContent = '（该岗位暂无 JD）';
              view.dataset.formatted = '1';
            }
            const dlg = $('#jd-dialog');
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
          });
        });
        $$('[data-view-jd-row]:not([data-bound])', root).forEach(button => {
          button.dataset.bound = 'true';
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = button.closest('[data-job-search]');
            const company = row.dataset.company || '';
            const position = row.dataset.position || '';
            const jd = (typeof getJDForJob === 'function') ? getJDForJob(company, position) : (row.dataset.jdRaw || '（该岗位暂无 JD）');
            $('#jd-dialog-title').textContent = company + ' · ' + position;
            const view = $('#jd-view');
            view.textContent = jd;
            view.dataset.formatted = '1';
            const dlg = $('#jd-dialog');
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
          });
        });
        $$('[data-mock-job]:not([data-bound])', root).forEach(button => {
          button.dataset.bound = 'true';
          button.addEventListener('click', () => {
            const option = [...$('#interview-job').options].find(item => button.dataset.mockJob.includes(item.textContent.split(' · ')[0]));
            if (option) $('#interview-job').value = option.value;
            activateSection('interview');
            showToast('已带入当前岗位，准备开始模拟');
          });
        });
      };
      bindDynamicActions();
      }

      const openPersistentJobDetail = (card) => {
        const dlg = $('#job-detail-dialog');
        const company = card.dataset.company || '';
        const position = card.dataset.position || '';
        const base = card.dataset.base || '';
        const batch = card.dataset.batch || '';
        const logo = card.querySelector('.company-logo');
        const logoBox = $('#detail-logo');
        if (logo) { logoBox.textContent = logo.textContent; logoBox.style.cssText = logo.getAttribute('style') || ''; }
        logoBox.className = 'detail-logo';
        $('#detail-company').textContent = company;
        $('#detail-position').textContent = position;
        const status = card.querySelector('.job-status');
        const statusBox = $('#detail-status');
        if (status) {
          const cls = (status.getAttribute('class') || '').split(/\s+/).filter(c => (c === 'badge' || c.startsWith('badge-')) && c !== 'job-status');
          statusBox.className = 'detail-status ' + cls.join(' ');
          statusBox.textContent = status.textContent.trim();
        } else {
          statusBox.className = 'detail-status badge badge-gray';
          statusBox.textContent = card.dataset.stage || '关注';
        }
        const tagsBox = $('#detail-tags');
        tagsBox.replaceChildren(...[...card.querySelectorAll('.job-tags .badge')].map((badge) => {
          const tag = badge.cloneNode(true);
          tag.classList.remove('job-status');
          return tag;
        }));
        const info = $('#detail-info');
        info.replaceChildren();
        const addRow = (label, value) => {
          if (!value) return;
          const row = document.createElement('div'); row.className = 'detail-info-item';
          const labelEl = document.createElement('span'); labelEl.className = 'detail-label'; labelEl.textContent = label;
          const valueEl = document.createElement('span'); valueEl.className = 'detail-value'; valueEl.textContent = value;
          row.append(labelEl, valueEl); info.appendChild(row);
        };
        addRow('Base 地', base || '未填');
        addRow('招聘批次', batch || '—');
        addRow('投递渠道', (card.querySelector('.job-source') || {}).textContent || '手动');
        const delivery = $('#detail-delivery');
        delivery.replaceChildren();
        const addDelivery = (label, value, kind) => {
          if (!value) return;
          const row = document.createElement('div'); row.className = 'detail-dv-row';
          const labelEl = document.createElement('span'); labelEl.className = 'dv-label'; labelEl.textContent = label;
          const valueEl = document.createElement('span'); valueEl.className = 'dv-value'; valueEl.textContent = value; valueEl.title = value;
          const action = document.createElement('button'); action.className = 'dv-action'; action.type = 'button';
          if (kind === 'link') { action.textContent = '打开'; action.addEventListener('click', () => { try { window.open(value, '_blank'); } catch (_) {} }); }
          else { action.textContent = '复制'; action.addEventListener('click', () => { try { navigator.clipboard.writeText(value); } catch (_) {} showToast('已复制：' + label); }); }
          row.append(labelEl, valueEl, action); delivery.appendChild(row);
        };
        addDelivery('邮箱', card.dataset.email, 'email');
        addDelivery('投递链接', card.dataset.applyLink, 'link');
        addDelivery('内推码', card.dataset.referral, 'code');
        addDelivery('其他', card.dataset.other, 'note');
        if (!delivery.children.length) {
          const empty = document.createElement('span'); empty.className = 'detail-empty'; empty.textContent = '暂无投递方式'; delivery.appendChild(empty);
        }
        $('#detail-jd').textContent = (card.dataset.jdFormatted || card.dataset.jdRaw || '').trim() || '（该岗位暂无 JD）';
        $('#detail-mock').onclick = () => {
          const option = [...$('#interview-job').options].find(item => (company + ' ' + position).includes(item.textContent.split(' · ')[0]));
          if (option) $('#interview-job').value = option.value;
          dlg.close(); activateSection('interview'); showToast('已带入当前岗位，准备模拟');
        };
        $('#detail-follow').onclick = () => { dlg.close(); showToast('已记录一次跟进'); };
        $('#detail-delete').onclick = () => { dlg.close(); window.__OFFER_OS_REMOVE_JOB__?.(card.dataset.id, `${company} ${position}`.trim()); };
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      };
      window.__OFFER_OS_OPEN_JOB_DETAIL__ = openPersistentJobDetail;

      if (window.__OFFER_OS_FEATURES__?.jobs) {
        const deleteTableRow = (row) => {
          const name = `${row.dataset.company || ''} ${row.dataset.position || ''}`.trim();
          if (!confirm(`确定删除「${name}」？`)) return;
          row.classList.add('removing');
          setTimeout(() => { row.remove(); filterJobs(); showToast(`已删除：${name}`); }, 160);
        };
        const cleanupTable = () => {
          const table = document.querySelector('#job-table-body').closest('table');
          const favoriteHeader = [...table.querySelectorAll('thead th')].find((header) => header.textContent.trim() === '收藏');
          if (favoriteHeader) favoriteHeader.textContent = '操作';
          $$('#job-table-body tr[data-job-search]').forEach((row) => {
            const favoriteCell = [...row.children].find((cell) => cell.textContent.trim() === '★' || cell.textContent.trim() === '☆');
            if (!favoriteCell) return;
            favoriteCell.replaceChildren(); favoriteCell.className = 'mono';
            const remove = document.createElement('button');
            remove.type = 'button'; remove.className = 'table-job-delete'; remove.title = '删除'; remove.setAttribute('aria-label', `删除 ${row.dataset.company || ''} ${row.dataset.position || ''}`);
            remove.addEventListener('click', (event) => { event.stopPropagation(); deleteTableRow(row); });
            favoriteCell.appendChild(remove);
          });
        };
        const bindSupportingActions = () => {
          $$('[data-toast]:not([data-bound])').forEach((button) => { button.dataset.bound = 'true'; button.addEventListener('click', () => showToast(button.dataset.toast)); });
          $$('[data-view-jd]:not([data-bound])').forEach((button) => {
            button.dataset.bound = 'true';
            button.addEventListener('click', () => {
              const card = button.closest('[data-job-search]');
              $('#jd-dialog-title').textContent = `${card.dataset.company || ''} · ${card.dataset.position || ''}`;
              $('#jd-view').textContent = card.dataset.jdFormatted || card.dataset.jdRaw || '（该岗位暂无 JD）';
              const dialog = $('#jd-dialog'); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
            });
          });
          $$('[data-view-jd-row]:not([data-bound])').forEach((button) => {
            button.dataset.bound = 'true';
            button.addEventListener('click', (event) => {
              event.stopPropagation(); const row = button.closest('[data-job-search]');
              $('#jd-dialog-title').textContent = `${row.dataset.company || ''} · ${row.dataset.position || ''}`;
              $('#jd-view').textContent = getJDForJob(row.dataset.company || '', row.dataset.position || '');
              const dialog = $('#jd-dialog'); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
            });
          });
          $$('[data-mock-job]:not([data-bound])').forEach((button) => {
            button.dataset.bound = 'true';
            button.addEventListener('click', () => {
              const option = [...$('#interview-job').options].find((item) => button.dataset.mockJob.includes(item.textContent.split(' · ')[0]));
              if (option) $('#interview-job').value = option.value;
              activateSection('interview'); showToast('已带入当前岗位，准备开始模拟');
            });
          });
        };
        cleanupTable();
        $$('.library-row .library-favorite').forEach((button) => button.remove());
        bindSupportingActions();
      }

      const calendarEvents = [
        { date: '2026-07-29', title: '暑期岗位复盘', time: '20:00', type: 'task' },
        { date: '2026-08-03', title: '更新重点岗位池', time: '09:30', type: 'task' },
        { date: '2026-08-08', title: 'Notion JD 分析', time: '15:00', type: 'task' },
        { date: '2026-08-10', title: '得物产品一面', time: '10:00', type: 'interview' },
        { date: '2026-08-12', title: '百度流程复盘', time: '20:30', type: 'task' },
        { date: '2026-08-14', title: '阿里提前批截止', time: '23:59', type: 'deadline' },
        { date: '2026-08-16', title: '百度业务二面', time: '14:00', type: 'interview' },
        { date: '2026-08-18', title: '飞书 Offer 沟通', time: '11:00', type: 'interview' },
        { date: '2026-08-20', title: '字节岗位投递', time: '18:00', type: 'task' },
        { date: '2026-08-22', title: '腾讯测评确认', time: '12:00', type: 'deadline' },
        { date: '2026-08-24', title: '京东在线测评', time: '19:30', type: 'task' },
        { date: '2026-08-25', title: '美团岗位投递', time: '16:00', type: 'task' },
        { date: '2026-08-26', title: '腾讯产品笔试', time: '19:00', type: 'task' },
        { date: '2026-08-27', title: '字节面试准备', time: '15:00', type: 'task' },
        { date: '2026-08-28', title: '字节 AI 产品一面', time: '14:30', type: 'interview' },
        { date: '2026-08-28', title: '小红书网申截止', time: '23:59', type: 'deadline' },
        { date: '2026-08-30', title: '周度投递复盘', time: '20:30', type: 'task' },
        { date: '2026-09-01', title: '美团 HR 面', time: '10:30', type: 'interview' },
        { date: '2026-09-06', title: 'vivo 网申截止', time: '23:59', type: 'deadline' },
        { date: '2026-09-10', title: '小米 AI 产品面试', time: '16:00', type: 'interview' }
      ];
      let calendarCursor = new Date(2026, 7, 1);
      let calendarFilter = 'all';
      const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const renderCalendar = () => {
        const year = calendarCursor.getFullYear();
        const month = calendarCursor.getMonth();
        $('#month-title').textContent = `${year} 年 ${month + 1} 月`;
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthEvents = calendarEvents.filter(event => event.date.startsWith(monthPrefix));
        const interviews = monthEvents.filter(event => event.type === 'interview').length;
        const deadlines = monthEvents.filter(event => event.type === 'deadline').length;
        const tasks = monthEvents.filter(event => event.type === 'task').length;
        $('#month-summary').textContent = `${interviews} 场面试 · ${deadlines} 个截止 · ${tasks} 项任务`;
        const firstDay = new Date(year, month, 1);
        const mondayOffset = (firstDay.getDay() + 6) % 7;
        const gridStart = new Date(year, month, 1 - mondayOffset);
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < 42; index++) {
          const date = new Date(gridStart);
          date.setDate(gridStart.getDate() + index);
          const key = dateKey(date);
          const cell = document.createElement('div');
          cell.className = 'month-cell';
          if (date.getMonth() !== month) cell.classList.add('outside');
          if (key === '2026-08-26') cell.classList.add('today');
          const events = calendarEvents.filter(event => event.date === key && (calendarFilter === 'all' || event.type === calendarFilter));
          cell.innerHTML = `<span class="month-date">${date.getDate()}</span><div class="month-events"></div><div class="month-empty">当前筛选无日程</div>`;
          const eventWrap = $('.month-events', cell);
          events.forEach(event => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `month-event event-${event.type}`;
            button.innerHTML = `<span>${event.title}</span><time>${event.time}</time>`;
            button.setAttribute('aria-label', `${event.title}，${event.time}`);
            button.addEventListener('click', () => showToast(`${event.title} · ${event.time}`));
            eventWrap.append(button);
          });
          const hasUnfilteredEvents = calendarEvents.some(event => event.date === key);
          if (hasUnfilteredEvents && events.length === 0) $('.month-empty', cell).style.display = 'flex';
          fragment.append(cell);
        }
        $('#month-days').replaceChildren(fragment);
      };

      function renderHeatmap() {
        const CELL = 13, GAP = 3, PITCH = CELL + GAP;
        const WEEKS = 13;
        const LEVELS = ['#EAF1F9', '#C7DCF2', '#8FBCE8', '#4C8FD4', '#1F5FA8'];
        const WD = ['日', '一', '二', '三', '四', '五', '六'];
        const today = new Date(2026, 7, 26);
        const start = new Date(today);
        start.setDate(start.getDate() - (WEEKS - 1) * 7);
        const dow = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - dow);

        const rnd = (n) => { const x = Math.sin(n) * 10000; return x - Math.floor(x); };
        const grid = $('#heat-grid');
        const monthsEl = $('#heat-months');
        const tip = $('#heat-tip');
        grid.replaceChildren();
        monthsEl.replaceChildren();

        const wd = $('#heat-weekdays');
        wd.replaceChildren();
        ['一', '', '三', '', '五', '', ''].forEach((t) => {
          const s = document.createElement('span');
          s.textContent = t;
          wd.append(s);
        });

        let total = 0, activeDays = 0, visibleDays = 0, streak = 0, bestStreak = 0;
        const weekSums = new Array(WEEKS).fill(0);
        let prevMonth = -1;

        for (let w = 0; w < WEEKS; w++) {
          for (let d = 0; d < 7; d++) {
            const date = new Date(start);
            date.setDate(date.getDate() + w * 7 + d);
            const cell = document.createElement('div');
            cell.className = 'heat-cell';
            if (date > today) {
              cell.style.background = LEVELS[0];
              cell.dataset.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
              cell.dataset.count = '0';
              grid.append(cell);
              continue;
            }
            visibleDays++;
            const epoch = Math.floor(date.getTime() / 86400000);
            const recency = w / (WEEKS - 1);
            const prob = 0.16 + 0.52 * recency;
            let level = 0;
            if (rnd(epoch) <= prob) {
              level = 1 + Math.floor(rnd(epoch + 7) * (1 + 3 * recency));
              if (level > 4) level = 4;
            }
            total += level;
            if (level > 0) { activeDays++; streak++; if (streak > bestStreak) bestStreak = streak; }
            else { streak = 0; }
            weekSums[w] += level;
            cell.style.background = LEVELS[level];
            cell.dataset.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            cell.dataset.count = level;
            if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) cell.classList.add('today');
            grid.append(cell);
          }
          const monday = new Date(start);
          monday.setDate(monday.getDate() + w * 7);
          if (monday.getMonth() !== prevMonth) {
            prevMonth = monday.getMonth();
            const span = document.createElement('span');
            span.textContent = (monday.getMonth() + 1) + '月';
            span.style.left = (w * PITCH) + 'px';
            monthsEl.append(span);
          }
        }

        grid.addEventListener('mouseover', (e) => {
          const c = e.target.closest('.heat-cell');
          if (!c || c.style.visibility === 'hidden') return;
          const dd = new Date(c.dataset.date + 'T00:00:00');
          const count = parseInt(c.dataset.count, 10);
          tip.innerHTML = (dd.getMonth() + 1) + '月' + dd.getDate() + '日 周' + WD[dd.getDay()] + (count > 0 ? ' · <b>' + count + ' 次投递</b>' : ' · 无投递');
          tip.style.display = 'block';
          tip.style.left = (c.offsetLeft + CELL / 2) + 'px';
          tip.style.top = c.offsetTop + 'px';
        });
        grid.addEventListener('mouseout', () => { tip.style.display = 'none'; });

        let busyW = 0, busyMax = -1;
        weekSums.forEach((s, i) => { if (s > busyMax) { busyMax = s; busyW = i; } });
        const bs = new Date(start); bs.setDate(bs.getDate() + busyW * 7);
        const be = new Date(bs); be.setDate(be.getDate() + 6);
        const busyLabel = (bs.getMonth() + 1) + '/' + bs.getDate() + '~' + (be.getMonth() + 1) + '/' + be.getDate();

      }

      $('#month-prev').addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); renderCalendar(); });
      $('#month-next').addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1); renderCalendar(); });
      $('#month-today').addEventListener('click', () => { calendarCursor = new Date(2026, 7, 1); renderCalendar(); });
      $$('.calendar-filter').forEach(button => button.addEventListener('click', () => {
        calendarFilter = button.dataset.calendarFilter;
        $$('.calendar-filter').forEach(item => item.classList.toggle('active', item === button));
        renderCalendar();
      }));
      renderCalendar();
      if (!window.__OFFER_OS_FEATURES__?.dashboard) renderHeatmap();

      $$('.pool-button').forEach(button => button.addEventListener('click', () => {
        button.textContent = '已加入';
        button.disabled = true;
        button.closest('tr').dataset.inPool = 'true';
        showToast('机会已加入岗位看板的“关注”列');
      }));
      // 收藏功能已从「实习信息搜集」移除

      $$('.library-delete').forEach(button => button.addEventListener('click', () => {
        const row = button.closest('.library-row');
        const label = `${row.dataset.company} · ${row.dataset.position}`;
        row.classList.add('removing');
        setTimeout(() => {
          row.remove();
          filterJobs();
          showToast(`${label} 已从实习公司库删除`);
        }, 180);
      }));
      $('#sync-jobs').addEventListener('click', () => showToast('飞书多维表格已同步'));
      $('#refresh-library').addEventListener('click', (event) => { event.currentTarget.querySelector('svg').style.transform = 'rotate(180deg)'; setTimeout(() => event.currentTarget.querySelector('svg').style.transform = '', 400); showToast('已获取 6 条最新机会'); filterJobs(); });

      // ---- 实习信息搜集：按求职者自定义方向搜集 ----
      const $internDirection = $('#intern-direction');
      const $internCollect = $('#intern-collect');
      const $internCurrent = $('#intern-current');
      const runDirectionCollect = () => {
        const dir = (($internDirection && $internDirection.value) || '').trim();
        const $search = $('#job-search'); if ($search) $search.value = dir;
        filterJobs();
        if (!dir) {
          if ($internCurrent) { $internCurrent.textContent = '当前搜集方向：未限定（展示全部来源）'; $internCurrent.classList.add('badge-gray'); $internCurrent.classList.remove('badge-blue'); }
          showToast('已清除方向限定，展示全部来源');
          return;
        }
        if ($internCurrent) { $internCurrent.textContent = '当前搜集方向：' + dir; $internCurrent.classList.remove('badge-gray'); $internCurrent.classList.add('badge-blue'); }
        const visible = $$('.job-view.active [data-job-search]').filter((el) => el.style.display !== 'none').length;
        showToast('已按「' + dir + '」方向筛选 ' + visible + ' 条机会');
      };
      if ($internCollect) $internCollect.addEventListener('click', runDirectionCollect);
      if ($internDirection) $internDirection.addEventListener('keydown', (e) => { if (e.key === 'Enter') runDirectionCollect(); });
      $$('#intern-chips .direction-chip').forEach((chip) => chip.addEventListener('click', () => {
        if ($internDirection) $internDirection.value = chip.dataset.direction || '';
        runDirectionCollect();
      }));

      const resumes = {
        byte: { role: 'AI 产品经理实习生 · 2027 届', company: '某头部内容平台 · AI 产品实习生', score: '86', experience: '<li>围绕 AI 搜索场景完成 18 次用户访谈，提炼 4 类核心意图并推动召回策略迭代。</li><li>搭建“曝光—点击—采纳”效果漏斗，定位回答采纳率瓶颈，推动核心指标提升 12.6%。</li><li>协同算法、设计和研发完成 3 个版本迭代，独立输出 PRD、埋点方案与上线复盘。</li>', skills: '产品：需求分析 / 用户研究 / PRD / 原型设计　数据：SQL / Excel / A/B Test　AI：RAG / 模型评测基础　工具：Figma / 飞书多维表格 / Python' },
        red: { role: '增长产品实习生 · 2027 届', company: '某头部内容平台 · 增长产品实习生', score: '78', experience: '<li>梳理新用户首日行为链路，识别内容消费到互动转化的关键断点，设计 4 组 A/B 实验。</li><li>搭建渠道归因和用户分层看板，将高潜用户识别准确率提升 16%。</li><li>联合运营完成种子用户计划，活动周期内次周留存提升 8.4 个百分点。</li>', skills: '增长：转化漏斗 / 用户分层 / 生命周期运营　数据：SQL / Excel / A/B Test　产品：PRD / 原型设计　工具：Figma / 飞书 / Python' },
        general: { role: '产品经理 / 产品运营 · 2027 届', company: '某头部互联网平台 · 产品实习生', score: '72', experience: '<li>通过用户访谈、问卷与数据分析定位核心需求，独立完成需求文档和交互原型。</li><li>负责版本排期、埋点方案和上线验收，推动三方团队按期交付。</li><li>建立周度数据复盘机制，持续跟踪功能使用与关键业务指标。</li>', skills: '产品：需求分析 / 用户研究 / PRD / Axure / Figma　数据：SQL / Excel　协作：飞书 / Notion　英语：CET-6' }
      };
      const selectVersion = (card) => {
        if ($('#resume-paper').contentEditable === 'true') { showToast('请先保存当前编辑'); return; }
        $$('.version-card').forEach(item => item.classList.toggle('active', item === card));
        const data = resumes[card.dataset.resume];
        $('#resume-role').textContent = data.role;
        if (data.generated) { $('#experience-section').innerHTML = '<h3>Experience · 实习经历</h3>' + data.experience; }
        else { $('#resume-company').textContent = data.company; $('#resume-experience').innerHTML = data.experience; }
        $('#resume-skills').textContent = data.skills;
        $('#match-score').textContent = data.score;
        $('.score-ring').style.background = `conic-gradient(var(--ink) 0 ${data.score}%, var(--surface-3) ${data.score}% 100%)`;
        if (data.match) { renderMatchPanel(data.match); $('#ai-draft').hidden = !data.draft; if (data.draft) renderAiDraft(data.draft); }
        else { restoreStaticSuggestions(); $('#ai-draft').hidden = true; }
        showToast(`已切换到${card.querySelector('strong').textContent}`);
      };
      $$('.version-card').forEach(card => card.addEventListener('click', () => selectVersion(card)));
      $('#edit-resume').addEventListener('click', () => {
        const paper = $('#resume-paper');
        const editing = paper.contentEditable === 'true';
        paper.contentEditable = editing ? 'false' : 'true';
        $('#edit-resume span').textContent = editing ? '编辑简历' : '保存修改';
        $('#edit-resume use').setAttribute('href', editing ? '#i-edit' : '#i-check');
        if (!editing) { paper.focus(); showToast('编辑模式已开启，点击正文直接修改'); }
        else showToast('简历修改已保存到当前会话');
      });
      $('#duplicate-resume').addEventListener('click', () => showToast('已复制为“字节 · AI 产品_v4”'));
      $('#download-resume').addEventListener('click', () => showToast('演示版已准备 PDF 导出任务'));
      $('#new-resume').addEventListener('click', () => showToast('已创建一个空白简历版本'));

      /* ============ JD → 简历 生成引擎 ============ */
      const versionList = $('.version-list');
      const suggestionListEl = $('.suggestion-list');
      const keywordCloudEl = $('.keyword-cloud');
      const scoreLabelEl = $('.score-label');
      const STATIC_SUGGESTIONS = suggestionListEl.innerHTML;
      const STATIC_KEYWORDS = keywordCloudEl.innerHTML;
      const STATIC_SCORE_LABEL = scoreLabelEl.textContent;

      // 能力标签字典：标签 → 触发关键词（CJK 直接包含；拉丁词用单词边界）
      const CAP_TAGS = {
        '用户研究': ['用户研究', '用户访谈', '访谈', '用户洞察', '需求洞察', '调研', '用户画像', '需求分析'],
        '数据分析': ['数据', '指标', '漏斗', '转化', '留存', '归因', 'SQL', 'AB Test', 'A/B', 'DAU', '数据驱动', '数据分析', '指标体系', '效果评估'],
        'AI/大模型': ['AI', '大模型', 'LLM', 'RAG', 'Prompt', '提示词', '模型', '生成式', 'GPT', '智能体', '机器学习', '算法', '模型评测', '评测'],
        '增长': ['增长', '拉新', '冷启动', '裂变', '获客', '渠道', '生命周期', '用户增长', '增长实验'],
        '产品方法论': ['PRD', '需求文档', '原型', '交互', '产品设计', 'MVP', 'roadmap', '需求管理', '竞品', '产品规划'],
        '跨团队推进': ['跨团队', '协同', '推动', '项目管理', '交付', '排期', '三方', '研发', '对接'],
        '商业化': ['商业化', '变现', '营收', 'ROI', '收入', '广告', '电商'],
        '国际化': ['海外', '国际化', '跨境', 'global', '出海'],
        '内容/社区': ['内容', '社区', '创作者', 'UGC', '互动', '种草', '笔记'],
        '策略': ['策略', '推荐', '搜索', '调度', '定价', '补贴', '供需']
      };
      const GAP_ADVICE = {
        '用户研究': 'JD 看重用户研究，建议在经历中补强访谈/调研的频次、方法与结论影响。',
        '数据分析': 'JD 强调数据驱动，建议把指标口径、提升幅度、归因方式写得更具体。',
        'AI/大模型': 'JD 涉及大模型/RAG，建议补充你对模型评测、Prompt 迭代或效果优化的实操。',
        '增长': 'JD 偏增长，建议突出拉新/留存/转化的实验设计与量化结果。',
        '产品方法论': 'JD 关注产品落地，建议强化 PRD、原型、需求优先级等交付细节。',
        '跨团队推进': 'JD 强调协同推进，建议把"我"主导的动作和跨团队交付结果说清楚。',
        '商业化': 'JD 涉及商业化，建议补强变现/ROI/营收相关经验或理解。',
        '国际化': 'JD 含出海/国际化，建议补充跨文化或海外用户相关经验。',
        '内容/社区': 'JD 偏内容/社区，建议突出创作者运营、互动或内容生态相关经历。',
        '策略': 'JD 含策略方向，建议强化推荐/搜索/供需策略类思考与结果。'
      };
      // 候选人的真实经历库（原子化子弹，来源真实、不编造）
      const MASTER_ITEMS = [
        { company: '某头部内容平台 · 产品实习生', period: '2026.03 — 2026.08', bullets: [
          '围绕 AI 搜索场景完成 18 次用户访谈，提炼 4 类核心意图并推动召回策略迭代。',
          '搭建“曝光—点击—采纳”效果漏斗，定位回答采纳率瓶颈，推动核心指标提升 12.6%。',
          '协同算法、设计和研发完成 3 个版本迭代，独立输出 PRD、埋点方案与上线复盘。'
        ]},
        { company: '校园创业团队 · 增长负责人', period: '2025.06 — 2025.12', bullets: [
          '从 0 到 1 设计冷启动增长实验，8 周内获取 3,200 名有效用户，次周留存提升至 31%。',
          '建立渠道归因表与周度复盘机制，将单个有效用户获取成本降低 38%。'
        ]}
      ];
      const MASTER_SKILLS = '产品：需求分析 / 用户研究 / PRD / 原型设计　数据：SQL / Excel / A/B Test　AI：RAG / 模型评测基础　工具：Figma / 飞书多维表格 / Python　英语：CET-6';
      // 预设岗位 JD（看板卡片若带 data-jd-raw 则优先，否则用此映射，再否则合成）
      const JOB_JD = {
        '字节跳动|AI 产品经理实习生': '负责 AI 搜索/对话类产品方向。要求：熟悉大模型（LLM）、RAG、Prompt 工程与模型效果评测；具备用户研究能力与数据驱动思维；能独立输出 PRD 并推动算法、研发、设计跨团队落地；关注核心指标（采纳率、留存）的提升。',
        '小红书|增长产品实习生': '负责社区用户增长方向。要求：熟悉增长实验设计、转化漏斗、用户分层与生命周期运营；具备渠道归因与 A/B Test 能力；数据敏感，能用 SQL 做分析；有内容/社区产品理解者优先；跨团队推动项目落地。',
        '蚂蚁集团|AI 产品经理实习生': '金融 AI 产品方向。要求：理解大模型/RAG 在金融场景的应用；具备用户研究与需求分析能力；数据驱动，熟悉指标体系与效果评估；能撰写 PRD 并协同研发交付；关注合规与用户体验。',
        '美团|到店增长产品实习生': '到店业务用户增长。要求：熟悉增长策略、拉新与留存实验；掌握转化漏斗与渠道归因；数据驱动，SQL/A-B 能力；能独立推进跨团队项目；有本地生活/交易经验优先。',
        '美团|策略产品经理': '配送/交易策略方向。要求：具备供需策略、定价或补贴策略设计能力；数据建模与效果评估；强逻辑与跨团队推动；熟悉 A/B 实验；结果导向。',
        '京东|用户增长产品实习生': '用户增长方向。要求：熟悉增长漏斗、用户分层与生命周期运营；渠道归因与 A/B Test；数据驱动分析（SQL）；能推动跨团队增长项目落地。',
        '腾讯|产品策划实习生': '产品策划方向。要求：用户研究与需求洞察；产品规划与原型设计；数据驱动与效果评估；跨团队协同交付；对内容/社交有理解者优先。',
        '快手|商业化产品实习生': '商业化产品方向。要求：理解变现与营收模型；广告/电商产品经验；数据驱动与 ROI 分析；A/B 实验；跨团队推动商业化项目。',
        '得物|社区产品实习生': '社区产品方向。要求：内容/社区生态理解；用户研究与互动设计；数据驱动增长；活动与创作者运营；跨团队协作。',
        'Notion|Product Intern': 'AI Productivity product. Requires: understanding of LLM/RAG and AI features; strong user research and data-driven mindset; ability to write PRD and ship with eng/design; care about activation and retention metrics.'
      };

      const hasKw = (text, kw) => /[一-龥]/.test(kw) ? text.includes(kw) : new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text);
      const bulletTags = (text) => { const out = []; for (const [tag, kws] of Object.entries(CAP_TAGS)) if (kws.some(kw => hasKw(text, kw))) out.push(tag); return out; };
      const fallbackJD = (company, position) => {
        const p = position.toLowerCase(); let tags = [];
        if (p.includes('增长')) tags.push('用户增长', '转化漏斗', '用户分层', '生命周期运营', 'A/B Test', '渠道归因');
        if (p.includes('ai')) tags.push('大模型', 'RAG', 'Prompt', '模型评测', '用户研究');
        if (p.includes('策略')) tags.push('策略', 'A/B Test', '数据建模');
        if (p.includes('商业')) tags.push('商业化', 'ROI', '营收');
        if (p.includes('社区') || p.includes('内容')) tags.push('内容', '社区', '用户研究');
        if (!tags.length) tags = ['用户研究', 'PRD', '数据驱动', '跨团队推进'];
        return `目标岗位：${position}@${company}。建议突出能力：${tags.join('、')}。请补充与该方向相关的真实经历与量化结果。`;
      };
      const getJDForJob = (company, position) => {
        const key = company + '|' + position;
        if (JOB_JD[key]) return JOB_JD[key];
        const card = [...document.querySelectorAll('#kanban-board .job-card')].find(c => c.dataset.company === company && c.dataset.position === position);
        if (card && (card.dataset.jdRaw || card.dataset.jdFormatted)) return card.dataset.jdRaw || card.dataset.jdFormatted;
        return fallbackJD(company, position);
      };
      const matchResumeToJD = (jd) => {
        const jdTags = new Set();
        for (const [tag, kws] of Object.entries(CAP_TAGS)) if (kws.some(kw => hasKw(jd, kw))) jdTags.add(tag);
        const scoredItems = MASTER_ITEMS.map(item => {
          const scored = item.bullets.map(b => { const tags = bulletTags(b); return { text: b, tags, cov: tags.filter(t => jdTags.has(t)).length }; });
          scored.sort((a, b) => b.cov - a.cov || a.text.localeCompare(b.text));
          return { company: item.company, period: item.period, scored, itemCov: scored.reduce((a, s) => a + s.cov, 0) };
        });
        scoredItems.sort((a, b) => b.itemCov - a.itemCov);
        const hitSet = new Set();
        scoredItems.forEach(it => it.scored.forEach(s => s.tags.forEach(t => { if (jdTags.has(t)) hitSet.add(t); })));
        const hitTags = [...hitSet];
        const gapTags = [...jdTags].filter(t => !hitSet.has(t));
        const matchPct = jdTags.size ? Math.round(hitTags.length / jdTags.size * 100) : 0;
        const skillGroups = MASTER_SKILLS.split('　').map(g => {
          const idx = g.indexOf('：'); const k = g.slice(0, idx); const val = g.slice(idx + 1);
          const hit = [...jdTags].some(t => hasKw(k + ' ' + val, t) || CAP_TAGS[t].some(kw => hasKw(k + ' ' + val, kw)));
          return { k, val, hit };
        });
        return { jdTags: [...jdTags], hitTags, gapTags, matchPct, scoredItems, skillGroups };
      };
      const buildExperienceHTML = (m) => m.scoredItems.map(it =>
        `<div class="resume-item"><div class="resume-item-head"><strong>${it.company}</strong><span>${it.period}</span></div><ul>${it.scored.map(s => `<li class="${s.cov > 0 ? 'matched' : ''}">${s.text}</li>`).join('')}</ul></div>`
      ).join('');
      const buildSkillsHTML = (m) => m.skillGroups.slice().sort((a, b) => (b.hit ? 1 : 0) - (a.hit ? 1 : 0)).map(g => `${g.k}：${g.val}`).join('　');
      const renderMatchPanel = (m) => {
        scoreLabelEl.textContent = '与 JD 匹配度 · 规则匹配';
        let html = '';
        if (m.hitTags.length) html += `<div class="suggestion"><strong><span class="badge badge-mint">优势</span>命中 ${m.hitTags.length} 项核心能力</strong><p>${m.hitTags.join('、')} —— 已在经历中靠前突出。</p></div>`;
        m.gapTags.forEach(t => { html += `<div class="suggestion"><strong><span class="badge badge-butter">补充</span>${t}</strong><p>${GAP_ADVICE[t] || '建议在经历中补充与该能力相关的真实项目或量化结果。'}</p></div>`; });
        html += `<div class="suggestion"><strong><span class="badge badge-blue">改写</span></strong><p>把“协同完成”改为“主导拆解并推动三方交付”，少用“我们”，说清自己的判断与影响。</p></div>`;
        suggestionListEl.innerHTML = html;
        keywordCloudEl.innerHTML = '<p>JD 关键词覆盖</p>' + m.jdTags.map(t => `<span class="badge ${m.hitTags.includes(t) ? 'badge-mint' : 'badge-butter'}">${t}</span>`).join('');
      };
      const restoreStaticSuggestions = () => { suggestionListEl.innerHTML = STATIC_SUGGESTIONS; keywordCloudEl.innerHTML = STATIC_KEYWORDS; scoreLabelEl.textContent = STATIC_SCORE_LABEL; };
      const renderAiDraft = (draft) => {
        $('#ai-draft').innerHTML = `<h4><svg class="icon icon-sm"><use href="#i-spark"/></svg>AI 改写草稿 · 仅供参考</h4><ul>${draft.map(b => `<li>${b}</li>`).join('')}</ul><p class="ai-note">由 LLM 基于你的真实经历生成，请人工核对事实后采纳；未配置 API 时不会调用。</p>`;
      };
      const shortPos = (p) => p.length > 8 ? p.slice(0, 8) + '…' : p;
      const createGeneratedVersion = (company, position, jd) => {
        const m = matchResumeToJD(jd);
        const key = 'gen-' + Date.now();
        resumes[key] = { role: position + ' · 2027 届', company: company + ' · ' + position, score: String(m.matchPct), experience: buildExperienceHTML(m), skills: buildSkillsHTML(m), match: m, draft: null, generated: true, source: company + ' · ' + position, jd };
        const card = document.createElement('button');
        card.className = 'version-card'; card.type = 'button'; card.dataset.resume = key;
        const badge = m.matchPct >= 80 ? 'mint' : m.matchPct >= 60 ? 'butter' : 'gray';
        card.innerHTML = `<strong>${company} · ${shortPos(position)}_v1</strong><span>目标：${position}</span><div class="version-meta"><span class="badge badge-${badge}">匹配 ${m.matchPct}%</span><span>刚生成</span></div>`;
        versionList.appendChild(card);
        card.addEventListener('click', () => selectVersion(card));
        selectVersion(card);
        showToast(`已根据 ${company} JD 生成适配简历 · 匹配度 ${m.matchPct}%`);
      };

      /* ---- Resume upload / parse / import ---- */
      const $uploadBtn = $('#upload-resume');
      const $resumeFile = $('#resume-file');
      const $uploadDialog = $('#upload-dialog');
      const $uploadFileInfo = $('#upload-file-info');
      const $upName = $('#up-name');
      const $upDirection = $('#up-direction');
      const $upEmail = $('#up-email');
      const $upPhone = $('#up-phone');
      const $upExperience = $('#up-experience');
      const $upSkills = $('#up-skills');
      const $upAppendMaster = $('#up-append-master');

      const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const MAMMOTH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      const loadedScripts = {};
      function loadScript(src) {
        if (loadedScripts[src]) return Promise.resolve();
        return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src; s.async = true; s.onload = () => { loadedScripts[src] = true; resolve(); };
          s.onerror = () => reject(new Error('无法加载解析库：' + src));
          document.head.appendChild(s);
        });
      }

      async function readResumeFile(file) {
        const name = file.name.toLowerCase();
        if (/\.txt$|\.md$|\.markdown$/.test(name) || file.type.startsWith('text/')) {
          return await file.text();
        }
        if (/\.pdf$/.test(name) || file.type === 'application/pdf') {
          await loadScript(PDFJS_CDN);
          if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
          const buf = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((it) => it.str).join(' ') + '\n';
          }
          return text;
        }
        if (/\.docx$/.test(name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          await loadScript(MAMMOTH_CDN);
          const buf = await file.arrayBuffer();
          const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
          return result.value;
        }
        if (/\.doc$/.test(name)) {
          throw new Error('暂不支持 .doc 格式，请将简历另存为 .docx 或 .pdf 后再上传');
        }
        return await file.text();
      }

      function parseResumeText(raw) {
        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const out = { name: '', email: '', phone: '', direction: '', experience: '', skills: '', raw };
        const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) out.email = emailMatch[0];
        const phoneMatch = raw.match(/1[3-9]\d{9}|\+?\d[\d\s\-]{8,}\d/);
        if (phoneMatch) out.phone = phoneMatch[0].trim();
        for (let i = 0; i < Math.min(12, lines.length); i++) {
          const ln = lines[i];
          if (/^[\u4e00-\u9fa5]{2,4}$/.test(ln) && !/简历|Resume|求职|个人|信息|教育|实习|项目|技能|工作|经历/.test(ln)) { out.name = ln; break; }
          if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(ln)) { out.name = ln; break; }
        }
        const sectionRe = [
          { key: 'education', re: /^(?:教育(?:背景|经历|信息|情况)?|Education|Academic|学历)\s*[:：]?\s*$/i },
          { key: 'experience', re: /^(?:实习|工作|实践|经历|Experience|Work\s*Experience|Professional|Employment)\s*[:：]?\s*$/i },
          { key: 'projects', re: /^(?:项目|Projects?)\s*[:：]?\s*$/i },
          { key: 'skills', re: /^(?:技能|技术栈|Skills?|Tech|Stack)\s*[:：]?\s*$/i }
        ];
        let cur = null;
        const buf = { education: [], experience: [], projects: [], skills: [] };
        for (const ln of lines) {
          let hit = null;
          for (const s of sectionRe) { if (s.re.test(ln)) { hit = s.key; break; } }
          if (hit) { cur = hit; continue; }
          if (cur) buf[cur].push(ln);
        }
        if (!buf.experience.length && !buf.projects.length) buf.experience = lines.slice(Math.min(8, lines.length)).filter((l) => l.length > 6);
        const bulletize = (arr) => arr.filter((l) => l.length > 4 && !/^[-•·●*]\s*$/.test(l)).map((l) => l.replace(/^[•·●*\-]\s*/, '')).join('\n');
        out.experience = bulletize(buf.experience.length ? buf.experience : buf.projects);
        const skillsLines = buf.skills.length ? buf.skills : lines.filter((l) => /[:：]/.test(l) && l.length < 80 && /(产品|数据|技能|语言|工具|Skills?|Tech|Stack)/i.test(l));
        out.skills = skillsLines.join(' / ').replace(/\s+/g, ' ').trim();
        if (!out.skills) out.skills = '（请补充你的技能与技术栈）';
        return out;
      }

      $uploadBtn.addEventListener('click', () => $resumeFile.click());
      $resumeFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        $uploadFileInfo.textContent = '⏳ 正在解析 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)…';
        $upName.value = ''; $upDirection.value = ''; $upEmail.value = ''; $upPhone.value = ''; $upExperience.value = ''; $upSkills.value = '';
        $uploadDialog.showModal();
        try {
          const text = await readResumeFile(file);
          if (!text || !text.trim()) throw new Error('未能从文件中提取到文本');
          const parsed = parseResumeText(text);
          $upName.value = parsed.name;
          $upEmail.value = parsed.email;
          $upPhone.value = parsed.phone;
          $upExperience.value = parsed.experience;
          $upSkills.value = parsed.skills;
          $uploadFileInfo.textContent = '✅ 已从 ' + file.name + ' 解析（' + (file.size / 1024).toFixed(1) + ' KB · ' + text.length + ' 字）— 解析仅按规则抽取，可能不完全准确，请人工核对';
        } catch (err) {
          $uploadFileInfo.textContent = '❌ ' + (err && err.message ? err.message : '解析失败');
          showToast('解析失败：' + (err.message || '未知错误'));
        } finally {
          $resumeFile.value = '';
        }
      });

      $('#upload-close').addEventListener('click', () => $uploadDialog.close());
      $('#upload-cancel').addEventListener('click', () => $uploadDialog.close());

      $('#upload-import').addEventListener('click', () => {
        const name = ($upName.value || '我的简历').trim();
        const direction = $upDirection.value.trim();
        const expLines = $upExperience.value.split('\n').map((l) => l.trim()).filter(Boolean);
        const skills = $upSkills.value.trim();
        if (!expLines.length) { showToast('请至少填写一条经历要点'); $upExperience.focus(); return; }
        const appendMaster = $upAppendMaster.checked;
        const company = direction ? name + ' · ' + direction : name + ' · 个人简历';
        const bullets = expLines.map(escapeHtml).map((b) => '<li>' + b + '</li>').join('');
        const experienceHTML = '<div class="resume-item"><div class="resume-item-head"><strong>' + escapeHtml(company) + '</strong><span>导入的简历</span></div><ul>' + bullets + '</ul></div>';
        const key = 'upload-' + Date.now();
        resumes[key] = {
          role: direction || '个人简历',
          company: company,
          score: '—',
          experience: experienceHTML,
          skills: skills,
          generated: true,
          uploaded: true,
          source: '上传简历'
        };
        if (appendMaster) {
          MASTER_ITEMS.push({ company: company, period: '导入', bullets: expLines });
          if (skills && !MASTER_SKILLS.includes(skills.split(/[:：\s\/]/)[0])) {
            // keep master skills as-is for safety; user can edit manually
          }
        }
        const card = document.createElement('button');
        card.className = 'version-card'; card.type = 'button'; card.dataset.resume = key;
        card.innerHTML = '<strong>' + escapeHtml(name) + (direction ? ' · ' + escapeHtml(direction) : '') + '_v1</strong><span>目标：' + escapeHtml(direction || '通用') + '</span><div class="version-meta"><span class="badge badge-gray">导入</span><span>刚刚</span></div>';
        versionList.appendChild(card);
        card.addEventListener('click', () => selectVersion(card));
        selectVersion(card);
        $uploadDialog.close();
        showToast('简历已导入为新版本' + (appendMaster ? '，已追加到主简历库' : ''));
      });

      // 选择器 dialog
      const genDialog = $('#gen-job-dialog');
      const genList = $('#gen-job-list');
      let selectedJobCard = null;
      $('#generate-from-job').addEventListener('click', () => {
        genList.innerHTML = ''; selectedJobCard = null; $('#gen-job-confirm').disabled = true;
        document.querySelectorAll('#kanban-board .job-card').forEach(card => {
          const row = createResumeJobOption(card);
          row.addEventListener('click', () => { selectedJobCard = card; genList.querySelectorAll('.gen-job-row').forEach(r => r.classList.toggle('active', r === row)); $('#gen-job-confirm').disabled = false; });
          genList.appendChild(row);
        });
        genDialog.showModal();
      });
      $('#gen-job-close').addEventListener('click', () => genDialog.close());
      $('#gen-job-cancel').addEventListener('click', () => genDialog.close());
      $('#gen-job-confirm').addEventListener('click', () => {
        if (!selectedJobCard) return;
        const company = selectedJobCard.dataset.company; const position = selectedJobCard.dataset.position;
        genDialog.close();
        createGeneratedVersion(company, position, getJDForJob(company, position));
      });

      // 智能改写（LLM 可选）
      const llmDialog = $('#llm-config-dialog');
      const getLLM = () => { try { return JSON.parse(localStorage.getItem('offer-os-llm') || 'null'); } catch { return null; } };
      const activeResumeKey = () => document.querySelector('.version-card.active')?.dataset.resume;
      $('#polish-resume').addEventListener('click', () => {
        const data = resumes[activeResumeKey()];
        if (!data || !data.match) { showToast('请先用「从岗位生成」创建适配版本，再启用智能改写'); return; }
        const cfg = getLLM();
        $('#llm-base').value = cfg?.base || 'https://api.openai.com/v1';
        $('#llm-key').value = '';
        $('#llm-model').value = cfg?.model || 'gpt-4o-mini';
        llmDialog.showModal();
      });
      $('#llm-close').addEventListener('click', () => llmDialog.close());
      $('#llm-cancel').addEventListener('click', () => llmDialog.close());
      $('#llm-save').addEventListener('click', () => {
        const cfg = Object.assign({}, getLLM() || {}, { base: $('#llm-base').value.trim() || 'https://api.openai.com/v1', key: $('#llm-key').value.trim(), model: $('#llm-model').value.trim() || 'gpt-4o-mini' });
        if (!cfg.key) { showToast('请填写 API Key'); return; }
        localStorage.setItem('offer-os-llm', JSON.stringify(cfg));
        llmDialog.close();
        const data = resumes[activeResumeKey()];
        if (data && data.match) runPolish(data, cfg);
      });
      async function runPolish(data, cfg) {
        showToast('正在调用 LLM 改写（仅供参考）…');
        const plain = data.experience.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const prompt = `你是简历优化助手。基于候选人真实经历与下方 JD，把经历改写成更贴合 JD 的措辞，严禁编造事实。只输出改写后的经历要点，每条一行，前缀“- ”。\n\n【JD】\n${data.jd}\n\n【候选人经历】\n${plain}\n\n【技能】\n${data.skills}`;
        try {
          const resp = await fetch(cfg.base.replace(/\/$/, '') + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
            body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: '简历优化助手，不编造事实。' }, { role: 'user', content: prompt }], temperature: 0.3 })
          });
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const json = await resp.json();
          const text = json.choices?.[0]?.message?.content || '';
          const bullets = text.split('\n').map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 6);
          if (!bullets.length) throw new Error('返回为空');
          data.draft = bullets;
          $('#ai-draft').hidden = false;
          renderAiDraft(bullets);
          showToast('AI 改写草稿已生成，请人工核对后采纳');
        } catch (err) {
          showToast('LLM 调用失败：' + err.message + '（已保留规则匹配结果）');
        }
      }

      /* ---- 校招官网入口：分组视图（分类 / 评级可自定义） ---- */
      const CATEGORIES = ['互联网大厂', '互联网中厂', '手机大厂', '游戏大厂', '游戏中厂', '硬件大厂', '硬件中厂', '智能驾驶/新能源', '外企中国', 'AI 独角兽'];
      const RATING_PRESETS = ['5分', '4分', '3分', '2分', '1分'];
      const PORTAL_STORAGE_KEY = 'offer-os-campus-portals-v2';
      const GROUPBY_KEY = 'offer-os-portal-group-by';
      const DOMAIN_MAP = { bytedance:'字节跳动', tencent:'腾讯', qq:'腾讯', alibaba:'阿里巴巴', meituan:'美团', xiaohongshu:'小红书', baidu:'百度', antgroup:'蚂蚁集团', jd:'京东', mi:'小米', xiaomi:'小米', huawei:'华为', oppo:'OPPO', vivo:'vivo', honor:'荣耀', moonshot:'月之暗面', kimi:'月之暗面', zhipu:'智谱', stepfun:'阶跃星辰', deepseek:'深度求索', didi:'滴滴', bilibili:'哔哩哔哩', netease:'网易', '163':'网易', trip:'携程', ctrip:'携程', pdd:'拼多多', pinduoduo:'拼多多', kuaishou:'快手', meitu:'美图', shopee:'Shopee', iqiyi:'爱奇艺', vip:'唯品会', helloinc:'哈啰', hellobike:'哈啰', ke:'贝壳', zhihu:'知乎', ximalaya:'喜马拉雅', soulapp:'Soul', sina:'新浪', weibo:'微博', huya:'虎牙', zhipin:'BOSS直聘', kujiale:'酷家乐', youzan:'有赞', dxy:'丁香园', dewu:'得物', mihoyo:'米哈游', '37games':'三七互娱', wanmei:'完美世界', 'g-bits':'吉比特', xd:'心动', lingxi:'灵犀互娱', funplus:'趣加', dji:'大疆', insta360:'影石', minimax:'MiniMax', minimaxi:'MiniMax', kling:'可灵', klingai:'可灵', sensetime:'商汤', megvii:'旷视', brainco:'强脑科技', unitree:'宇树', deeprobotics:'云深处', guwenteyu:'游戏科学', nio:'蔚来', xiaopeng:'小鹏', lixiang:'理想', pony:'小马智行', weride:'文远知行', momenta:'Momenta', microsoft:'微软', amazon:'亚马逊', adobe:'Adobe', paypal:'PayPal', iflytek:'科大讯飞', cambricon:'寒武纪', baichuan:'百川智能', lingyiwanwu:'零一万物', '4paradigm':'第四范式' };
      const CATEGORY_HINTS = { bytedance:'互联网大厂', tencent:'互联网大厂', qq:'互联网大厂', alibaba:'互联网大厂', meituan:'互联网大厂', jd:'互联网大厂', baidu:'互联网大厂', antgroup:'互联网大厂', pinduoduo:'互联网大厂', pdd:'互联网大厂', kuaishou:'互联网大厂', netease:'互联网大厂', '163':'互联网大厂', didi:'互联网大厂', bilibili:'互联网中厂', trip:'互联网中厂', ctrip:'互联网中厂', dewu:'互联网中厂', xiaohongshu:'互联网中厂', iqiyi:'互联网中厂', vip:'互联网中厂', helloinc:'互联网中厂', hellobike:'互联网中厂', ke:'互联网中厂', zhihu:'互联网中厂', ximalaya:'互联网中厂', soulapp:'互联网中厂', '360':'互联网中厂', sina:'互联网中厂', weibo:'互联网中厂', huya:'互联网中厂', zhipin:'互联网中厂', kujiale:'互联网中厂', youzan:'互联网中厂', dxy:'互联网中厂', huawei:'手机大厂', mi:'手机大厂', xiaomi:'手机大厂', oppo:'手机大厂', vivo:'手机大厂', honor:'手机大厂', mihoyo:'游戏大厂', '37games':'游戏大厂', wanmei:'游戏大厂', 'g-bits':'游戏大厂', xd:'游戏大厂', lingxi:'游戏大厂', funplus:'游戏大厂', dji:'硬件大厂', insta360:'硬件中厂', deepseek:'AI 独角兽', moonshot:'AI 独角兽', kimi:'AI 独角兽', zhipu:'AI 独角兽', stepfun:'AI 独角兽', minimax:'AI 独角兽', minimaxi:'AI 独角兽', kling:'AI 独角兽', klingai:'AI 独角兽', sensetime:'AI 独角兽', megvii:'AI 独角兽', brainco:'AI 独角兽', unitree:'AI 独角兽', deeprobotics:'AI 独角兽', guwenteyu:'AI 独角兽', iflytek:'AI 独角兽', cambricon:'AI 独角兽', baichuan:'AI 独角兽', lingyiwanwu:'AI 独角兽', '4paradigm':'AI 独角兽', nio:'智能驾驶/新能源', xiaopeng:'智能驾驶/新能源', lixiang:'智能驾驶/新能源', pony:'智能驾驶/新能源', weride:'智能驾驶/新能源', momenta:'智能驾驶/新能源', microsoft:'外企中国', amazon:'外企中国', adobe:'外企中国', shopee:'外企中国', paypal:'外企中国' };
      const PRESET_PORTALS = [
        // 互联网大厂
        { name:'字节跳动', url:'https://jobs.bytedance.com/campus', category:'互联网大厂', rating:'5分', batch:'校招 / 实习', status:'开放中', note:'产品、运营、研发等 2027 届岗位' },
        { name:'腾讯', url:'https://join.qq.com', category:'互联网大厂', rating:'4分', batch:'秋招', status:'开放中', note:'技术、产品、设计、市场及职能类' },
        { name:'阿里巴巴', url:'https://job.alibaba.com', category:'互联网大厂', rating:'4分', batch:'秋招', status:'分批开放', note:'淘天、阿里云、国际数字商业等' },
        { name:'蚂蚁集团', url:'https://talent.antgroup.com', category:'互联网大厂', rating:'4分', batch:'秋招', status:'开放中', note:'支付、数字金融、技术平台及 AI' },
        { name:'美团', url:'https://campus.meituan.com', category:'互联网大厂', rating:'4分', batch:'秋招', status:'开放中', note:'到店、到家、基础研发平台' },
        { name:'百度', url:'https://talent.baidu.com/jobs/list', category:'互联网大厂', rating:'3分', batch:'秋招', status:'开放中', note:'文心大模型、智能驾驶、搜索' },
        { name:'拼多多', url:'https://careers.pinduoduo.com', category:'互联网大厂', rating:'', batch:'校招 / 实习', status:'持续更新', note:'电商、支付、多多买菜等' },
        { name:'京东', url:'https://campus.jd.com', category:'互联网大厂', rating:'3分', batch:'秋招', status:'持续更新', note:'零售、物流、健康、科技' },
        { name:'快手', url:'https://job.kuaishou.com', category:'互联网大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'短视频、直播、电商与社区' },
        { name:'网易', url:'https://campus.163.com', category:'互联网大厂', rating:'', batch:'秋招', status:'开放中', note:'网易系产品、云音乐、严选等' },
        { name:'滴滴出行', url:'https://talent.didiglobal.com', category:'互联网大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'出行、地图、自动驾驶' },
        // 互联网中厂
        { name:'哔哩哔哩', url:'https://jobs.bilibili.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'社区、直播、游戏与 PUGV' },
        { name:'携程', url:'https://campus.ctrip.com', category:'互联网中厂', rating:'', batch:'秋招', status:'开放中', note:'酒旅、交通票务、度假' },
        { name:'得物', url:'https://www.dewu.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'持续更新', note:'潮流电商、社区与鉴定' },
        { name:'小红书', url:'https://job.xiaohongshu.com/campus', category:'互联网中厂', rating:'5分', batch:'日常实习', status:'即将截止', note:'社区、商业化、电商与内容生态' },
        { name:'爱奇艺', url:'https://zhaopin.iqiyi.com', category:'互联网中厂', rating:'', batch:'秋招', status:'开放中', note:'长视频、内容、技术与会员' },
        { name:'唯品会', url:'https://campus.vip.com', category:'互联网中厂', rating:'', batch:'秋招', status:'持续更新', note:'特卖电商、供应链' },
        { name:'哈啰出行', url:'https://www.helloinc.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'共享出行、本地生活' },
        { name:'贝壳', url:'https://campus.ke.com', category:'互联网中厂', rating:'', batch:'秋招', status:'开放中', note:'居住服务、房产科技' },
        { name:'知乎', url:'https://www.zhihu.com/careers', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'内容社区、商业化' },
        { name:'喜马拉雅', url:'https://www.ximalaya.com/careers', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'持续更新', note:'音频内容、AI 语音' },
        { name:'Soul ', url:'https://job.soulapp.cn', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'社交、社区产品' },
        { name:'360 ', url:'https://campus.360.cn', category:'互联网中厂', rating:'', batch:'秋招', status:'开放中', note:'安全、浏览器、IoT' },
        { name:'新浪 / 微博', url:'https://career.sina.com.cn', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'门户、微博、内容' },
        { name:'虎牙', url:'https://job.huya.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'游戏直播、社区' },
        { name:'BOSS 直聘', url:'https://www.zhipin.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'持续更新', note:'招聘平台、SaaS' },
        { name:'酷家乐（群核科技）', url:'https://www.kujiale.com/jobs', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'3D 空间设计 SaaS、AI' },
        { name:'有赞', url:'https://job.youzan.com', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'持续更新', note:'商家 SaaS、私域' },
        { name:'丁香园', url:'https://job.dxy.cn', category:'互联网中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'医疗健康、专业内容' },
        // 手机大厂
        { name:'华为终端', url:'https://career.huawei.com', category:'手机大厂', rating:'', batch:'校招', status:'开放中', note:'终端、鸿蒙、影像、杭研所' },
        { name:'小米', url:'https://campus.mi.com', category:'手机大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'人车家全生态、MIUI、影像' },
        { name:'OPPO ', url:'https://careers.oppo.com', category:'手机大厂', rating:'', batch:'校招', status:'开放中', note:'影像、ColorOS、一加' },
        { name:'vivo ', url:'https://careers.vivo.com', category:'手机大厂', rating:'', batch:'校招', status:'开放中', note:'影像 AI、系统软件、杭州 AI 研发中心' },
        { name:'荣耀', url:'https://careers.honor.com', category:'手机大厂', rating:'', batch:'校招', status:'开放中', note:'终端、MagicOS、影像' },
        // 游戏大厂
        { name:'腾讯游戏', url:'https://game.qq.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'天美、光子等工作室群' },
        { name:'网易游戏', url:'https://game.163.com/hr', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'雷火、盘古等工作室' },
        { name:'米哈游', url:'https://careers.mihoyo.com', category:'游戏大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'原神、崩坏、绝区零' },
        { name:'三七互娱', url:'https://www.37games.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'手游发行与研发' },
        { name:'完美世界', url:'https://hr.wanmei.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'端游手游研发' },
        { name:'吉比特', url:'https://www.g-bits.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'问道、RO、雷霆游戏' },
        { name:'心动网络（TapTap）', url:'https://careers.xd.com', category:'游戏大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'TapTap、自研游戏' },
        { name:'阿里灵犀互娱', url:'https://lingxi.taobao.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'灵犀互娱、SLG / 卡牌' },
        { name:'趣加 FunPlus ', url:'https://careers.funplus.com', category:'游戏大厂', rating:'', batch:'校招', status:'开放中', note:'出海 SLG、全球发行' },
        // 硬件大厂
        { name:'大疆 DJI ', url:'https://we.dji.com', category:'硬件大厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'无人机、影像硬件、云台' },
        // 硬件中厂
        { name:'影石 Insta360 ', url:'https://www.insta360.com/jobs', category:'硬件中厂', rating:'', batch:'校招 / 实习', status:'开放中', note:'运动相机、360 影像' },
        // 智能驾驶 / 新能源
        { name:'蔚来', url:'https://careers.nio.com', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'智能电动、换电、智驾' },
        { name:'小鹏', url:'https://job.xiaopeng.com', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'智能汽车、智驾、机器人' },
        { name:'理想', url:'https://www.lixiang.com', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'增程 / 纯电、智能空间' },
        { name:'小马智行', url:'https://www.pony.ai', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'Robotaxi、L4 自动驾驶' },
        { name:'文远知行', url:'https://www.weride.ai', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'Robotaxi、L4 自动驾驶' },
        { name:'Momenta ', url:'https://www.momenta.ai', category:'智能驾驶/新能源', rating:'', batch:'校招 / 实习', status:'开放中', note:'量产自动驾驶、数据驱动' },
        // 外企中国
        { name:'微软中国', url:'https://careers.microsoft.com', category:'外企中国', rating:'', batch:'校招 / 实习', status:'开放中', note:'Azure、办公、Research' },
        { name:'亚马逊中国', url:'https://www.amazon.jobs', category:'外企中国', rating:'', batch:'校招 / 实习', status:'开放中', note:'AWS、电商、国际化' },
        { name:'Adobe 中国', url:'https://careers.adobe.com', category:'外企中国', rating:'', batch:'校招 / 实习', status:'开放中', note:'创意、文档、AI' },
        { name:'Shopee ', url:'https://careers.shopee.cn', category:'外企中国', rating:'', batch:'校招 / 实习', status:'开放中', note:'出海电商、东南亚' },
        { name:'PayPal 中国', url:'https://www.paypal.com/careers', category:'外企中国', rating:'', batch:'校招 / 实习', status:'开放中', note:'跨境支付、风控' },
        // AI 独角兽
        { name:'DeepSeek 深度求索', url:'https://www.deepseek.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'开源大模型、推理优化（杭州总部）' },
        { name:'月之暗面 Kimi ', url:'https://www.moonshot.cn', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'超长上下文大模型（北京）' },
        { name:'智谱 AI ', url:'https://www.zhipuai.cn', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'通用大模型、政企信创' },
        { name:'MiniMax ', url:'https://www.minimaxi.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'多模态、语音 / 视频生成（上海）' },
        { name:'可灵 AI ', url:'https://klingai.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'AI 视频生成（快手）' },
        { name:'商汤 SenseTime ', url:'https://career.sensetime.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'计算机视觉、多模态（上海）' },
        { name:'旷视 Megvii ', url:'https://www.megvii.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'机器视觉、AIoT（北京）' },
        { name:'强脑科技 BrainCo ', url:'https://www.brainco.cn', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'脑机接口硬件 + AI（杭州滨江）' },
        { name:'宇树科技', url:'https://www.unitree.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'四足机器人、具身 AI（杭州）' },
        { name:'云深处科技', url:'https://www.deeprobotics.cn', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'四足机器人（杭州）' },
        { name:'游戏科学', url:'https://www.guwenteyu.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'3A 游戏（黑神话，杭州）' },
        { name:'科大讯飞', url:'https://www.iflytek.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'智能语音、认知大模型' },
        { name:'寒武纪', url:'https://www.cambricon.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'AI 芯片、算力基础软件' },
        { name:'百川智能', url:'https://www.baichuan-ai.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'通用大模型、搜索增强' },
        { name:'零一万物', url:'https://www.lingyiwanwu.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'通用大模型、应用层' },
        { name:'第四范式', url:'https://www.4paradigm.com', category:'AI 独角兽', rating:'', batch:'校招 / 实习', status:'开放中', note:'企业级 AI、决策智能' }
      ];
      const escapeHtml = (v) => (v == null ? '' : String(v)).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
      const STATUS_BADGE = { '开放中':'badge-mint', '持续更新':'badge-mint', '分批开放':'badge-butter', '即将截止':'badge-blush', '已结束':'badge-gray' };
      const statusBadge = (s) => STATUS_BADGE[s] || 'badge-gray';
      const ratingScore = (v) => { const m = /(\d+(?:\.\d+)?)/.exec(String(v || '')); return m ? parseFloat(m[1]) : -1; };
      const ratingBadge = (v) => { const n = ratingScore(v); if (n >= 5) return 'badge-mint'; if (n >= 4) return 'badge-blue'; if (n >= 3) return 'badge-butter'; if (n >= 1) return 'badge-gray'; return 'badge-lilac'; };

      const normalizePortal = (p) => {
        if (!p) return p;
        if (p.name && /校园招聘$/.test(p.name)) p.name = p.name.replace(/校园招聘$/, '');
        if (p.rating === undefined) p.rating = '';
        if (p.favorite === undefined) p.favorite = false;
        return p;
      };
      const loadPortals = () => {
        let list = null;
        try {
          const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
          if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) list = parsed; }
        } catch (e) {}
        if (!list) list = PRESET_PORTALS.map((p, i) => ({ id: 'pre-' + i, custom: false, addedAt: '', ...p }));
        list = list.map(normalizePortal);
        try { localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
        return list;
      };
      let portals = loadPortals();
      const persistPortals = () => { try { localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(portals)); } catch (e) {} };

      const parseUrl = (raw) => {
        const s = (raw || '').trim();
        if (!s) return null;
        let url;
        try { url = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        const parts = host.split('.');
        const tld2 = ['com.cn', 'net.cn', 'org.cn', 'gov.cn'];
        let root;
        if (parts.length >= 3 && tld2.includes(parts.slice(-2).join('.'))) root = parts[parts.length - 3];
        else if (parts.length >= 2) root = parts[parts.length - 2];
        else root = host;
        const name = DOMAIN_MAP[root] || (root ? root.charAt(0).toUpperCase() + root.slice(1) : '');
        const category = CATEGORY_HINTS[root] || '其他';
        return { name, domain: host, category, normalizedUrl: url.href };
      };

      const rootDomainOf = (host) => {
        if (!host) return '';
        const parts = host.replace(/^www\./, '').split('.');
        if (parts.length <= 2) return parts.join('.');
        const tld2 = ['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'co.uk', 'com.hk', 'edu.cn'];
        if (tld2.includes(parts.slice(-2).join('.'))) return parts.slice(-3).join('.');
        return parts.slice(-2).join('.');
      };
      const logoFor = (p) => {
        let host = p.domain || '';
        if (!host) { try { host = new URL(p.url).hostname; } catch (e) { return ''; } }
        const rd = rootDomainOf(host);
        return rd ? 'https://logo.clearbit.com/' + rd : '';
      };

      let groupBy = 'category';
      try { groupBy = localStorage.getItem(GROUPBY_KEY) || 'category'; } catch (e) {}
      if (['category', 'rating', 'none'].indexOf(groupBy) < 0) groupBy = 'category';
      const collapsedGroups = new Set();

      const categoryOptions = () => {
        const used = [...new Set(portals.map(p => p.category).filter(Boolean))];
        return CATEGORIES.filter(c => used.includes(c)).concat(used.filter(c => CATEGORIES.indexOf(c) < 0));
      };
      const ratingGroups = () => {
        const used = [...new Set(portals.map(p => p.rating || ''))];
        used.sort((a, b) => ratingScore(b) - ratingScore(a));
        return used;
      };

      const logoCell = (p) => {
        const host = p.domain || (() => { try { return new URL(p.url).hostname; } catch (e) { return ''; } })();
        const rd = rootDomainOf(host);
        const src = rd ? 'https://logo.clearbit.com/' + rd : '';
        const fb = rd ? 'https://icons.duckduckgo.com/ip3/' + rd + '.ico' : '';
        const initial = escapeHtml((p.name || '?').trim().charAt(0).toUpperCase());
        const img = src ? '<img class="company-logo-img" alt="" loading="lazy" src="' + src + '" onload="this.classList.add(\'loaded\')" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src=\'' + fb + '\';}else{this.remove();}">' : '';
        return '<span class="company-logo portal-logo-sm' + (src ? '' : ' no-logo') + '">' + img + '<span class="company-initial">' + initial + '</span></span>';
      };
      const portalRowCells = (p, opts) => '<td class="portal-fav-cell"><button class="portal-star' + (p.favorite ? ' favorite' : '') + '" type="button" data-fav="' + (p.favorite ? '1' : '0') + '" aria-label="' + (p.favorite ? '取消收藏' : '收藏') + '"><svg class="icon icon-sm"><use href="#i-star"/></svg></button></td>'
        + '<td><div class="company-cell">' + logoCell(p) + '<div><strong>' + escapeHtml(p.name) + '</strong><span>' + escapeHtml(p.batch || '') + '</span></div></div></td>'
        + '<td><a class="table-link" href="' + escapeHtml(p.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(p.domain || p.url) + '</a></td>'
        + (opts.showCategory ? '<td><span class="badge badge-gray">' + escapeHtml(p.category || '—') + '</span></td>' : '')
        + (opts.showRating ? '<td>' + (p.rating ? '<span class="badge ' + ratingBadge(p.rating) + '">' + escapeHtml(p.rating) + '</span>' : '<span class="muted-dash">—</span>') + '</td>' : '')
        + '<td>' + escapeHtml(p.batch || '—') + '</td>'
        + '<td><span class="badge ' + statusBadge(p.status) + '">' + escapeHtml(p.status || '—') + '</span></td>'
        + '<td class="portal-note">' + escapeHtml(p.note || '—') + '</td>'
        + '<td><div class="portal-row-actions"><button class="library-icon-button portal-edit" type="button" aria-label="编辑" title="编辑"><svg class="icon icon-sm"><use href="#i-edit"/></svg></button><button class="library-icon-button library-delete portal-del" type="button" aria-label="删除" title="删除"><svg class="icon icon-sm"><use href="#i-trash"/></svg></button></div></td>';

      const renderPortals = () => {
        const wrap = $('#portal-groups');
        if (!wrap) return;
        $$('.portal-toolbar [data-group-by]').forEach(b => b.classList.toggle('active', b.dataset.groupBy === groupBy));
        wrap.innerHTML = '';
        let total = 0;
        const renderTable = (items, opts, headHTML, groupKey) => {
          items = items.slice().sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
          const box = document.createElement('div');
          box.className = 'portal-group';
          if (groupKey) box.dataset.groupKey = groupKey;
          if (headHTML) box.innerHTML = headHTML;
          const table = document.createElement('div');
          table.className = 'panel table-panel';
          table.style.boxShadow = 'none';
          table.innerHTML = '<table class="data-table portal-table"><thead><tr>'
            + '<th class="portal-fav-th"><svg class="icon icon-sm"><use href="#i-star"/></svg></th><th>公司 / 入口</th><th>官网</th>'
            + (opts.showCategory ? '<th>分类</th>' : '')
            + (opts.showRating ? '<th>评级</th>' : '')
            + '<th>批次 / 方向</th><th>状态</th><th>备注</th><th>操作</th>'
            + '</tr></thead><tbody></tbody></table>';
          const tbody = table.querySelector('tbody');
          items.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.id = p.id;
            tr.innerHTML = portalRowCells(p, opts);
            tbody.appendChild(tr);
          });
          box.appendChild(table);
          if (groupKey && collapsedGroups.has(groupKey)) box.classList.add('collapsed');
          wrap.appendChild(box);
        };
        if (groupBy === 'none') {
          const items = portals.slice();
          total = items.length;
          if (items.length) renderTable(items, { showCategory: true, showRating: true }, '', null);
        } else if (groupBy === 'category') {
          categoryOptions().forEach(cat => {
            const items = portals.filter(p => p.category === cat);
            if (!items.length) return;
            total += items.length;
            const key = 'category|' + cat;
            const head = '<div class="portal-group-head"><svg class="icon icon-sm chevron"><use href="#i-chevron"/></svg><h2>' + escapeHtml(cat) + '</h2><span class="badge badge-gray">' + items.length + '</span></div>';
            renderTable(items, { showRating: true }, head, key);
          });
        } else {
          ratingGroups().forEach(r => {
            const items = portals.filter(p => (p.rating || '') === r);
            if (!items.length) return;
            total += items.length;
            const label = r || '未评级';
            const key = 'rating|' + r;
            const head = '<div class="portal-group-head"><svg class="icon icon-sm chevron"><use href="#i-chevron"/></svg><h2>' + escapeHtml(label) + '</h2><span class="badge badge-gray">' + items.length + '</span></div>';
            renderTable(items, { showCategory: true }, head, key);
          });
        }
        const eb = $('#campus-eyebrow'); if (eb) eb.textContent = 'CAMPUS PORTALS · ' + portals.length + ' TRACKED';
        const pe = $('#portal-empty'); if (pe) pe.hidden = total > 0;
      };

      $$('.portal-toolbar [data-group-by]').forEach(b => b.addEventListener('click', () => {
        groupBy = b.dataset.groupBy;
        try { localStorage.setItem(GROUPBY_KEY, groupBy); } catch (e) {}
        renderPortals();
      }));
      $('#portal-groups').addEventListener('click', (e) => {
        const starBtn = e.target.closest('.portal-star');
        if (starBtn) {
          const tr = starBtn.closest('tr');
          const p = portals.find(x => x.id === tr.dataset.id);
          if (p) {
            p.favorite = !p.favorite;
            persistPortals();
            starBtn.classList.toggle('favorite', p.favorite);
            starBtn.dataset.fav = p.favorite ? '1' : '0';
            starBtn.setAttribute('aria-label', p.favorite ? '取消收藏' : '收藏');
            showToast(p.favorite ? '已收藏：' + p.name : '已取消收藏：' + p.name);
          }
          return;
        }
        const delBtn = e.target.closest('.portal-del');
        const editBtn = e.target.closest('.portal-edit');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          const p = portals.find(x => x.id === tr.dataset.id);
          if (confirm('确认删除「' + (p ? p.name : '该') + '」入口？')) {
            portals = portals.filter(x => x.id !== tr.dataset.id);
            persistPortals();
            renderPortals();
            showToast('已删除入口');
          }
          return;
        }
        if (editBtn) {
          const tr = editBtn.closest('tr');
          const p = portals.find(x => x.id === tr.dataset.id);
          if (p) openAddPortal(p);
          return;
        }
        const head = e.target.closest('.portal-group-head');
        if (head) {
          const box = head.closest('.portal-group');
          const key = box.dataset.groupKey;
          if (key) {
            if (collapsedGroups.has(key)) collapsedGroups.delete(key); else collapsedGroups.add(key);
            box.classList.toggle('collapsed');
          }
        }
      });

      const addDlg = $('#add-portal-dialog');
      let editingId = null;
      const fillDatalists = () => {
        const catList = $('#pf-category-list');
        const usedCats = [...new Set(portals.map(p => p.category).filter(Boolean))];
        const cats = CATEGORIES.concat(usedCats.filter(c => CATEGORIES.indexOf(c) < 0));
        catList.innerHTML = cats.map(c => '<option value="' + escapeHtml(c) + '"></option>').join('');
        const ratingList = $('#pf-rating-list');
        const usedRatings = [...new Set(portals.map(p => p.rating).filter(Boolean))];
        const ratings = RATING_PRESETS.concat(usedRatings.filter(r => RATING_PRESETS.indexOf(r) < 0));
        ratingList.innerHTML = ratings.map(r => '<option value="' + escapeHtml(r) + '"></option>').join('');
      };
      const openAddPortal = (preset) => {
        editingId = preset ? preset.id : null;
        $('#add-portal-title').textContent = preset ? '编辑校招入口' : '添加校招入口';
        $('#add-portal-save').textContent = preset ? '保存修改' : '添加入口';
        fillDatalists();
        $('#pf-url').value = preset ? preset.url : '';
        $('#pf-url').disabled = !!preset;
        $('#pf-name').value = preset ? preset.name : '';
        $('#pf-name').dataset.auto = '0';
        $('#pf-category').value = preset ? (preset.category || '') : '';
        $('#pf-rating').value = preset ? (preset.rating || '') : '';
        $('#pf-batch').value = preset ? (preset.batch || '') : '';
        $('#pf-status').value = preset ? (preset.status || '开放中') : '开放中';
        $('#pf-note').value = preset ? (preset.note || '') : '';
        $('#pf-parse-hint').textContent = preset ? '编辑模式下网址不可更改。' : '粘贴网址后自动解析公司名与分类，可手动调整。';
        addDlg.showModal();
      };
      $('#add-portal').addEventListener('click', () => openAddPortal(null));
      $('#add-portal-close').addEventListener('click', () => addDlg.close());
      $('#add-portal-cancel').addEventListener('click', () => addDlg.close());
      addDlg.addEventListener('click', (e) => { if (e.target === addDlg) addDlg.close(); });
      $('#pf-url').addEventListener('input', () => {
        const r = parseUrl($('#pf-url').value);
        if (r) {
          if (!($('#pf-name').value.trim()) || $('#pf-name').dataset.auto === '1') {
            $('#pf-name').value = r.name;
            $('#pf-name').dataset.auto = '1';
          }
          if (!$('#pf-category').value.trim()) $('#pf-category').value = r.category;
          $('#pf-parse-hint').textContent = '已解析：' + r.domain + ' · 建议分类「' + r.category + '」（可手动调整）';
        }
      });
      $('#add-portal-save').addEventListener('click', () => {
        const url = $('#pf-url').value.trim();
        if (!url) { showToast('请填写校招官网网址'); $('#pf-url').focus(); return; }
        let norm;
        try {
          const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') { showToast('仅支持 http / https 网址'); return; }
          norm = u.href;
        } catch (e) { showToast('网址格式不正确'); return; }
        const parsed = parseUrl(url) || {};
        const name = $('#pf-name').value.trim() || parsed.name || '未命名入口';
        const category = $('#pf-category').value.trim() || '其他';
        const rating = $('#pf-rating').value.trim();
        const batch = $('#pf-batch').value.trim();
        const status = $('#pf-status').value;
        const note = $('#pf-note').value.trim();
        if (editingId) {
          const p = portals.find(x => x.id === editingId);
          if (p) Object.assign(p, { name, category, rating, batch, status, note });
          showToast('已保存修改');
        } else {
          portals.push({ id: 'u-' + Date.now(), custom: true, addedAt: new Date().toISOString().slice(0, 10), url: norm, name, category, rating, batch, status, note, favorite: false });
          showToast('已添加入口：' + name);
        }
        persistPortals();
        renderPortals();
        addDlg.close();
      });
      $('#check-portals').addEventListener('click', () => showToast(portals.length + ' 个官方入口已检查，未发现失效链接'));
      renderPortals();

      const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      const startInterview = () => {
        questionIndex = 0; interviewSeconds = 0;
        $('#interview-setup').style.display = 'none';
        $('#interview-result').style.display = 'none';
        $('#interview-live').style.display = 'block';
        const mode = $('input[name="mode"]:checked').value;
        const job = $('#interview-job').value;
        const round = $('#interview-round').value.split(' · ')[0];
        $('#live-context').textContent = `${job} · ${round} · ${mode}`;
        updateQuestion();
        clearInterval(interviewTimer);
        interviewTimer = setInterval(() => { interviewSeconds++; $('#interview-timer').textContent = formatTime(interviewSeconds); }, 1000);
      };
      const updateQuestion = () => {
        $('#question-index').textContent = `QUESTION ${questionIndex + 1} / ${questions.length}`;
        $('#question-progress').style.width = `${((questionIndex + 1) / questions.length) * 100}%`;
        $('#question-text').textContent = questions[questionIndex];
        $('#answer-input').value = '';
        $('#submit-answer').innerHTML = questionIndex === questions.length - 1 ? '完成并查看复盘<svg class="icon icon-sm"><use href="#i-check"/></svg>' : '提交并继续<svg class="icon icon-sm"><use href="#i-chevron"/></svg>';
        $('#answer-input').focus();
      };
      const endInterview = () => {
        clearInterval(interviewTimer);
        $('#interview-live').style.display = 'none';
        $('#interview-result').style.display = 'block';
        $('#result-meta').textContent = `${$('#interview-job').value} · ${questionIndex + 1} 个问题 · ${formatTime(interviewSeconds)}`;
        showToast('模拟面试已结束，复盘已生成');
      };
      $('#start-interview').addEventListener('click', startInterview);
      $('#submit-answer').addEventListener('click', () => {
        if (!$('#answer-input').value.trim()) { showToast('先写下你的回答，再继续'); $('#answer-input').focus(); return; }
        if (questionIndex >= questions.length - 1) endInterview(); else { questionIndex++; updateQuestion(); showToast('回答已记录，进入下一题'); }
      });
      $('#answer-input').addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') $('#submit-answer').click(); });
      $('#end-interview').addEventListener('click', endInterview);
      $('#restart-interview').addEventListener('click', () => { $('#interview-result').style.display = 'none'; $('#interview-setup').style.display = 'grid'; $('#interview-timer').textContent = '00:00'; });
      $('#pause-hint').addEventListener('click', () => showToast('提示：用“动机—证据—岗位连接”三步回答'));
      $('#history-interview').addEventListener('click', () => showToast('历史：5 场模拟 · 平均分 81 · 最高分 86'));

      const toolData = {
        feishu: { title: '飞书同步', icon: '#i-refresh', intro: '岗位表、面试日程与简历版本保持在同一个数据底座。', points: ['Job / Interview / Resume 三张表已连接', '最近同步：2 分钟前 · 无冲突', '看板筛选和视图偏好仅保留在当前原型'], action: '立即同步' },
        scout: { title: '岗位搜索器', icon: '#i-search', intro: '按目标批次和关键词搜集官方招聘页的新机会。', points: ['关键词：AI 产品经理 / 增长产品', '范围：互联网、AI、消费科技', '近 15 天已搜集 28 条，6 条为今日新增'], action: '运行一次搜索' },
        apply: { title: '网申助手', icon: '#i-zap', intro: '跳转官方网申页时，用预录信息减少重复填写。', points: ['基础资料：已完善 92%', '教育、经历与项目字段已准备', '开放性问答仍需你亲自完成'], action: '打开使用说明' },
        'resume-autofill': { title: '简历自动填写', icon: '#i-magic', intro: '开源双语 Agent：整理可复用的已核验简历信息，自动填写各大招聘网站的申请表。', points: ['来源：GitHub · CCC-Zach/resume-autofill-agent', '修复简历解析错误，避免上传覆盖手填信息', '提交前暂停，等你确认再投递'], action: '打开 GitHub 仓库', link: 'https://github.com/CCC-Zach/resume-autofill-agent' }
      };
      const toolDialog = $('#tool-dialog');
      const openTool = (key) => {
        const data = toolData[key]; if (!data) return;
        $('#tool-dialog-title').textContent = data.title;
        $('#tool-dialog-body').innerHTML = `<div class="tool-detail"><div class="tool-hero"><span class="assistant-icon"><svg class="icon"><use href="${data.icon}"/></svg></span><div><h3>${data.title}</h3><p>${data.intro}</p></div></div><ul class="tool-points">${data.points.map(point => `<li><span class="check"><svg class="icon icon-sm"><use href="#i-check"/></svg></span>${point}</li>`).join('')}</ul></div>`;
        $('#tool-primary').textContent = data.action;
        $('#tool-primary').onclick = () => {
          if (data.link) { window.open(data.link, '_blank', 'noopener'); toolDialog.close(); return; }
          toolDialog.close(); showToast(`${data.title}：演示操作已完成`);
        };
        if (typeof toolDialog.showModal === 'function') toolDialog.showModal(); else toolDialog.setAttribute('open', '');
      };
      $$('.tool-nav').forEach(button => button.addEventListener('click', () => openTool(button.dataset.tool)));

      const assistant = $('#assistant-drawer');
      $('#open-assistant').addEventListener('click', () => assistant.classList.add('open'));
      $('#close-assistant').addEventListener('click', () => assistant.classList.remove('open'));
      const sendChat = (message) => {
        if (!message.trim()) return;
        const user = document.createElement('div'); user.className = 'chat-bubble user'; user.textContent = message;
        $('#chat').append(user);
        const reply = document.createElement('div'); reply.className = 'chat-bubble'; reply.textContent = message.includes('字节') ? '字节一面准备清单还有两项：补一个失败案例，以及用 3 分钟完整拆解“AI 助手留存下降”。我建议先练第二项。' : '我已经结合当前岗位、简历和日程整理了这个问题。演示版不会连接真实 AI，但这个入口会保留你所在模块的上下文。';
        setTimeout(() => { $('#chat').append(reply); $('#chat').scrollTop = $('#chat').scrollHeight; }, 350);
        $('#chat').scrollTop = $('#chat').scrollHeight;
      };
      $('#chat-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#chat-input'); sendChat(input.value); input.value = ''; });
      $$('.quick-prompt').forEach(button => button.addEventListener('click', () => sendChat(button.textContent)));

      $('#global-search').addEventListener('click', () => { activateSection('jobs'); setTimeout(() => $('#job-search').focus(), 50); });
      $('#add-event').addEventListener('click', () => showToast('已添加一个空白自定义日程（演示）'));
      document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); activateSection('jobs'); setTimeout(() => $('#job-search').focus(), 50); }
        if (event.key === 'Escape') { assistant.classList.remove('open'); closeMobileNav(); }
      });

      // ---- 复盘 review workspace（纯前端，localStorage 持久化）----
      const REVIEW_STORAGE_KEY = 'offer-os-review-records';
      let reviewRecords = [];
      let activeReviewId = null;

      const reviewTitleInput = $('#review-title-input');
      const reviewTranscript = $('#review-transcript');
      const reviewReflection = $('#review-reflection');
      const reviewActions = $('#review-actions');
      const reviewSuggestionBox = $('#review-suggestion');
      const reviewSuggestionList = $('#review-suggestion-list');
      const reviewListEl = $('#review-list');
      const reviewCountEl = $('#review-count');

      const loadReviews = () => {
        try { reviewRecords = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]'); }
        catch (e) { reviewRecords = []; }
      };

      const persistReviews = () => {
        try { localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewRecords)); }
        catch (e) { showToast('本地保存失败，浏览器可能禁用了存储'); }
      };

      // 规则式、可解释的结构化建议生成；明确标注为「仅供参考」，不替代你的判断。
      const buildSuggestion = (transcript) => {
        const text = (transcript || '').trim();
        const findings = [];
        if (!text) {
          findings.push('粘贴逐字稿后，这里会基于内容给出结构化建议（仅作参考）。');
          return findings;
        }
        const wordCount = text.replace(/\s+/g, '').length;
        const questionCount = (text.match(/[？?]/g) || []).length;
        const hasStar = /(star|情境|任务|行动|结果|经历|例子|项目)/i.test(text);
        const hasMetric = /(%|万|倍|提升|增长|下降|留存|转化|采纳|gmv|dau|用户|收入)/i.test(text);
        const hasWhy = /(为什么|为什么想|动机|为什么选择|为什么做)/i.test(text);
        const hasSelf = /(我|我的)/.test(text);
        findings.push('整体：逐字稿约 ' + wordCount + ' 字' + (questionCount ? '，含 ' + questionCount + ' 个问号（可能是追问或自问）' : '') + '。');
        if (hasStar) findings.push('经历类回答：用 STAR 收束——把“情境 / 任务 / 行动 / 结果”讲清，结果尽量带量化影响。');
        if (hasMetric) findings.push('数据意识：已出现量化表述，继续保持；若某段只有定性结论，可补一个“前后对比”的数字。');
        if (hasWhy) findings.push('动机类问题：已出现“为什么”，建议把岗位 / 公司 / 个人主线串成一条线，避免泛泛而谈。');
        if (!hasSelf) findings.push('主体性偏弱：回答里少见“我”的具体判断与动作，建议把“我们”拆回你自己的决策。');
        findings.push('表达节奏：先给结论，再用一个最能证明它的经历展开；控制单题时长，避免在第一题讲完所有故事。');
        return findings;
      };

      const renderReviewList = () => {
        reviewListEl.innerHTML = '';
        if (!reviewRecords.length) {
          const empty = document.createElement('div');
          empty.className = 'review-record empty';
          empty.textContent = '还没有复盘，点击右上角「新建复盘」开始。';
          reviewListEl.appendChild(empty);
          reviewCountEl.textContent = '0';
          return;
        }
        reviewCountEl.textContent = String(reviewRecords.length);
        reviewListEl.scrollTop = 0;
        reviewRecords.forEach(record => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'review-record' + (record.id === activeReviewId ? ' active' : '');
          item.dataset.id = record.id;
          const strong = document.createElement('strong');
          strong.textContent = record.title || '未命名复盘';
          const span = document.createElement('span');
          span.textContent = record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('zh-CN') : '';
          item.append(strong, span);
          item.addEventListener('click', () => renderReview(record.id));
          reviewListEl.appendChild(item);
        });
      };

      const renderSuggestionList = (items) => {
        reviewSuggestionList.innerHTML = '';
        (items || []).forEach(text => {
          const li = document.createElement('li');
          li.textContent = text;
          reviewSuggestionList.appendChild(li);
        });
        reviewSuggestionBox.hidden = (items || []).length === 0;
      };

      const renderReview = (recordId) => {
        const record = reviewRecords.find(r => r.id === recordId);
        if (!record) { resetReviewEditor(); return; }
        activeReviewId = recordId;
        reviewTitleInput.value = record.title || '';
        reviewTranscript.value = record.transcript || '';
        reviewReflection.value = record.reflection || '';
        reviewActions.value = record.actions || '';
        renderSuggestionList(record.suggestion || []);
        renderReviewList();
      };

      const resetReviewEditor = () => {
        activeReviewId = null;
        reviewTitleInput.value = '';
        reviewTranscript.value = '';
        reviewReflection.value = '';
        reviewActions.value = '';
        reviewSuggestionBox.hidden = true;
        reviewSuggestionList.innerHTML = '';
        reviewListEl.querySelectorAll('.review-record.active').forEach(el => el.classList.remove('active'));
      };

      const saveReview = () => {
        const transcript = reviewTranscript.value;
        const reflection = reviewReflection.value;
        const actions = reviewActions.value;
        const title = reviewTitleInput.value.trim() || '未命名复盘';
        if (!transcript.trim() && !reflection.trim() && !actions.trim()) {
          showToast('先写点内容再保存');
          return;
        }
        const suggestion = buildSuggestion(transcript);
        const record = {
          id: activeReviewId || ('r' + Date.now().toString(36)),
          title,
          transcript,
          reflection,
          actions,
          suggestion,
          updatedAt: new Date().toISOString()
        };
        const idx = reviewRecords.findIndex(r => r.id === record.id);
        if (idx >= 0) reviewRecords[idx] = record; else reviewRecords.push(record);
        activeReviewId = record.id;
        persistReviews();
        renderReviewList();
        renderSuggestionList(suggestion);
        showToast('复盘已保存到本地');
      };

      $('#review-save').addEventListener('click', saveReview);
      $('#review-new').addEventListener('click', () => { resetReviewEditor(); reviewTitleInput.focus(); showToast('已开始新的复盘'); });
      $('#review-suggest').addEventListener('click', () => {
        const suggestion = buildSuggestion(reviewTranscript.value);
        renderSuggestionList(suggestion);
        if ((!suggestion.length || (suggestion.length === 1 && /粘贴逐字稿/.test(suggestion[0]))) && !reviewTranscript.value.trim()) showToast('先粘贴逐字稿再生成建议');
      });

      loadReviews();
      renderReviewList();

      /* ---- Settings (account info + API provider) ---- */
      const PROFILE_KEY = 'offer-os-profile';
      const LLM_KEY = 'offer-os-llm';
      const $settingsDialog = $('#settings-dialog');
      const $settingsTabs = $('#settings-tabs');
      const $settingsAccountPane = $('#settings-account-pane');
      const $settingsApiPane = $('#settings-api-pane');
      const $settingsAccountRow = $('#settings-account-row');
      const $stProvider = $('#st-provider');
      const $stModel = $('#st-model');
      const $stKey = $('#st-key');
      const $stBase = $('#st-baseurl');

      const API_PROVIDERS = {
        deepseek: { label: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'] },
        volcano: { label: '火山引擎（豆包）', base: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-1.5-pro-32k', models: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'] },
        moonshot: { label: 'Moonshot Kimi', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', models: ['kimi-k2-turbo-preview', 'moonshot-v1-8k', 'moonshot-v1-32k'] },
        zhipu: { label: '智谱 AI（GLM）', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', models: ['glm-4', 'glm-4-flash', 'glm-4.5'] },
        qwen: { label: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] },
        openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o'] },
        custom: { label: '自定义', base: '', model: '', models: [] }
      };

      const loadProfile = () => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {}; } catch (e) { return {}; } };
      const persistProfile = (p) => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} };
      const loadLLM = () => { try { return JSON.parse(localStorage.getItem(LLM_KEY) || 'null') || {}; } catch (e) { return {}; } };

      function inferProvider(cfg) {
        if (cfg.provider && API_PROVIDERS[cfg.provider]) return cfg.provider;
        const base = cfg.base || '';
        if (/deepseek\.com/.test(base)) return 'deepseek';
        if (/volces\.com/.test(base)) return 'volcano';
        if (/moonshot\.(cn|ai)/.test(base)) return 'moonshot';
        if (/bigmodel\.cn/.test(base)) return 'zhipu';
        if (/dashscope/.test(base)) return 'qwen';
        if (/openai\.com/.test(base)) return 'openai';
        return 'custom';
      }

      function renderIdentity() {
        const user = loadAuth();
        const profile = loadProfile();
        const name = profile.nickname || (user ? user.display : DEFAULT_PROFILE.name);
        const avatar = user ? user.initials : (profile.nickname ? profile.nickname.trim().slice(0, 2).toUpperCase() : DEFAULT_PROFILE.avatar);
        $('#profile-name').textContent = name;
        $('#profile-avatar').textContent = avatar;
        $('#profile-sub').textContent = profile.direction ? '方向 · ' + profile.direction : (user ? (user.method === 'email' ? '邮箱已验证' : '手机已验证') : DEFAULT_PROFILE.sub);
        const _dt = $('#dashboard-title');
        if (_dt) _dt.textContent = '早上好，' + name;
      }

      function renderSettingsAccount() {
        const user = loadAuth();
        if (user) {
          $settingsAccountRow.innerHTML = '<span class="user-avatar lg">' + escapeHtml(user.initials) + '</span>' +
            '<div class="settings-account-info"><strong>' + escapeHtml(loadProfile().nickname || user.display) + '</strong><span>' + escapeHtml(maskAccount(user.account)) + ' · ' + (user.method === 'email' ? '邮箱验证码' : '手机短信') + '</span></div>' +
            '<button class="secondary-button" type="button" id="st-logout">退出登录</button>';
        } else {
          $settingsAccountRow.innerHTML = '<span class="user-avatar lg">?</span>' +
            '<div class="settings-account-info"><strong>尚未登录</strong><span>登录后可在多设备间同步你的求职数据</span></div>' +
            '<button class="primary-button" type="button" id="st-login">立即登录</button>';
        }
      }

      function renderModelList(pid) {
        $('#st-model-list').innerHTML = API_PROVIDERS[pid].models.map((m) => '<option value="' + escapeHtml(m) + '"></option>').join('');
      }

      function fillSettingsForm() {
        const profile = loadProfile();
        const cfg = loadLLM();
        $('#st-nickname').value = profile.nickname || '';
        $('#st-direction').value = profile.direction || '';
        const pid = inferProvider(cfg);
        $stProvider.value = pid;
        $stModel.value = cfg.model || API_PROVIDERS[pid].model;
        $stKey.value = cfg.key || '';
        $stBase.value = cfg.base || API_PROVIDERS[pid].base;
        renderModelList(pid);
      }

      $stProvider.addEventListener('change', () => {
        const pid = $stProvider.value;
        const p = API_PROVIDERS[pid];
        $stBase.value = p.base;
        if (!$stModel.value || p.models.indexOf($stModel.value) < 0) $stModel.value = p.model;
        renderModelList(pid);
      });

      function openSettings() {
        fillSettingsForm();
        renderSettingsAccount();
        $settingsTabs.querySelectorAll('.segment').forEach((seg) => seg.classList.toggle('active', seg.dataset.settingsTab === 'account'));
        $settingsAccountPane.hidden = false;
        $settingsApiPane.hidden = true;
        $settingsDialog.showModal();
      }

      $('#profile-settings').addEventListener('click', openSettings);
      $('#settings-close').addEventListener('click', () => $settingsDialog.close());
      $('#settings-cancel').addEventListener('click', () => $settingsDialog.close());

      $settingsTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment');
        if (!btn) return;
        const tab = btn.dataset.settingsTab;
        $settingsTabs.querySelectorAll('.segment').forEach((seg) => seg.classList.toggle('active', seg === btn));
        $settingsAccountPane.hidden = tab !== 'account';
        $settingsApiPane.hidden = tab !== 'api';
      });

      $settingsAccountRow.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.id === 'st-login') {
          $settingsDialog.close();
          showGate();
        } else if (btn.id === 'st-logout') {
          $settingsDialog.close();
          clearAuth();
          applyAuth(null);
          showGate();
          showToast('已退出登录');
        }
      });

      $('#settings-save').addEventListener('click', () => {
        const profile = { nickname: $('#st-nickname').value.trim(), direction: $('#st-direction').value.trim() };
        persistProfile(profile);
        const cfg = {
          provider: $stProvider.value,
          base: $stBase.value.trim() || API_PROVIDERS[$stProvider.value].base,
          key: $stKey.value.trim(),
          model: $stModel.value.trim() || API_PROVIDERS[$stProvider.value].model
        };
        try { localStorage.setItem(LLM_KEY, JSON.stringify(cfg)); } catch (e) {}
        renderIdentity();
        renderSettingsAccount();
        showToast('设置已保存' + (cfg.key ? '' : '（API Key 未填写，AI 功能需填写后可用）'));
        $settingsDialog.close();
      });

      /* ---- Auth (front-end mock) + Login Gate ---- */
      const AUTH_KEY = 'offer-os-auth';
      const $loginGate = $('#login-gate');
      const $appShell = $('.app-shell');
      const $loginTabs = $('#login-tabs');
      const $loginSendEmail = $('#login-send-email');
      const $loginSendSms = $('#login-send-sms');
      const $loginSubmit = $('#login-submit');
      const $loginEmail = $('#login-email');
      const $loginPhone = $('#login-phone');
      const $loginCodeEmail = $('#login-code-email');
      const $loginCodePhone = $('#login-code-phone');
      const $loginDemoEmail = $('#login-demo-email');
      const $loginDemoPhone = $('#login-demo-phone');
      const $loginEmailPane = $('#login-email-pane');
      const $loginPhonePane = $('#login-phone-pane');
      const DEFAULT_PROFILE = { avatar: 'XR', name: '欣睿', sub: 'AI 产品 · 增长实习' };

      let loginMethod = 'email';
      let sentCode = null;
      let countdownTimer = null;

      const maskAccount = (acc) => {
        if (acc.indexOf('@') >= 0) {
          const parts = acc.split('@');
          const name = parts[0];
          const head = name.length > 2 ? name[0] + '***' + name[name.length - 1] : name;
          return head + '@' + parts[1];
        }
        return acc.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      };
      const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

      const persistAuth = (user) => { try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch (e) {} };
      const loadAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } };
      const clearAuth = () => { try { localStorage.removeItem(AUTH_KEY); } catch (e) {} };

      function showGate() {
        resetLogin();
        $loginGate.hidden = false;
        $appShell.hidden = true;
      }
      function hideGate() {
        $loginGate.hidden = true;
        $appShell.hidden = false;
      }

      function applyAuth(user) {
        if (!user) {
          $('#profile-avatar').textContent = DEFAULT_PROFILE.avatar;
          $('#profile-name').textContent = DEFAULT_PROFILE.name;
          $('#profile-sub').textContent = DEFAULT_PROFILE.sub;
          renderIdentity();
          return;
        }
        $('#profile-avatar').textContent = user.initials;
        $('#profile-name').textContent = user.display;
        $('#profile-sub').textContent = user.method === 'email' ? '邮箱已验证' : '手机已验证';
        renderIdentity();
      }

      function startCountdown(btn) {
        let t = 60;
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = t + 's 后重发';
        countdownTimer = setInterval(() => {
          t -= 1;
          if (t <= 0) {
            clearInterval(countdownTimer);
            btn.disabled = false;
            btn.textContent = label;
          } else {
            btn.textContent = t + 's 后重发';
          }
        }, 1000);
      }

      function sendCode(method) {
        const isEmail = method === 'email';
        const acc = (isEmail ? $loginEmail.value : $loginPhone.value).trim();
        if (isEmail) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acc)) { showToast('请输入有效的邮箱地址'); $loginEmail.focus(); return; }
        } else {
          if (!/^1[3-9]\d{9}$/.test(acc)) { showToast('请输入有效的 11 位手机号'); $loginPhone.focus(); return; }
        }
        sentCode = String(Math.floor(100000 + Math.random() * 900000));
        const label = isEmail ? '邮箱' : '短信';
        const demo = isEmail ? $loginDemoEmail : $loginDemoPhone;
        demo.hidden = false;
        demo.textContent = '（演示）已向 ' + maskAccount(acc) + ' 发送' + label + '验证码：' + sentCode;
        showToast(label + '验证码已发送（演示模式）');
        startCountdown(isEmail ? $loginSendEmail : $loginSendSms);
      }

      function resetLogin() {
        loginMethod = 'email';
        $loginTabs.querySelectorAll('.segment').forEach((seg) => seg.classList.toggle('active', seg.dataset.loginMethod === 'email'));
        $loginEmailPane.hidden = false;
        $loginPhonePane.hidden = true;
        $loginEmail.value = '';
        $loginPhone.value = '';
        $loginCodeEmail.value = '';
        $loginCodePhone.value = '';
        sentCode = null;
        $loginDemoEmail.hidden = true;
        $loginDemoPhone.hidden = true;
        if (countdownTimer) { clearInterval(countdownTimer); }
        $loginSendEmail.disabled = false; $loginSendEmail.textContent = '获取验证码';
        $loginSendSms.disabled = false; $loginSendSms.textContent = '获取短信验证码';
      }

      function doLogin() {
        const acc = (loginMethod === 'email' ? $loginEmail.value : $loginPhone.value).trim();
        const code = (loginMethod === 'email' ? $loginCodeEmail.value : $loginCodePhone.value).trim();
        if (!code) { showToast('请输入验证码'); return; }
        if (!sentCode || code !== sentCode) { showToast('验证码不正确，请重新获取'); return; }
        const isEmail = loginMethod === 'email';
        const display = isEmail ? capitalize(acc.split('@')[0]) : '手机用户';
        const initials = isEmail ? acc.charAt(0).toUpperCase() : acc.slice(-2);
        const user = { account: acc, method: loginMethod, display, initials, ts: Date.now() };
        persistAuth(user);
        applyAuth(user);
        hideGate();
        showToast('登录成功 · ' + maskAccount(acc));
      }

      $loginTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment');
        if (!btn) return;
        loginMethod = btn.dataset.loginMethod;
        $loginTabs.querySelectorAll('.segment').forEach((seg) => seg.classList.toggle('active', seg === btn));
        $loginEmailPane.hidden = loginMethod !== 'email';
        $loginPhonePane.hidden = loginMethod !== 'phone';
        $loginCodeEmail.value = '';
        $loginCodePhone.value = '';
        sentCode = null;
        $loginDemoEmail.hidden = true;
        $loginDemoPhone.hidden = true;
      });

      $loginSendEmail.addEventListener('click', () => sendCode('email'));
      $loginSendSms.addEventListener('click', () => sendCode('phone'));
      $loginSubmit.addEventListener('click', doLogin);

      const _initUser = loadAuth();
      applyAuth(_initUser);
      if (_initUser) hideGate(); else showGate();


    })();
