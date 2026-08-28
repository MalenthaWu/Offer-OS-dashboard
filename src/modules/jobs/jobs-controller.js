import { renderJobs } from './jobs-view.js';
import { isSafeExternalLink } from '../../security/external-links.js';
import { isCommittedMutationError } from '../../app/committed-mutation.js';

const asText = (value) => value == null ? '' : String(value);

function formInput(form) {
  const data = new FormData(form);
  return {
    company: asText(data.get('company')).trim(),
    position: asText(data.get('position')).trim(),
    batch: asText(data.get('batch') || '日常实习'),
    base: asText(data.get('base')).trim(),
    priority: asText(data.get('priority')).trim(),
    email: asText(data.get('email')).trim(),
    applyLink: asText(data.get('apply_link')).trim(),
    referral: asText(data.get('referral_code')).trim(),
    other: asText(data.get('other')).trim(),
    jdRaw: asText(data.get('jd')),
    jdFormatted: asText(data.get('jd')),
    favorite: false,
    stage: '关注',
  };
}

function applyFilters(root) {
  const board = root.querySelector('#kanban-board');
  if (!board) return;
  const query = asText(root.querySelector('#job-search')?.value).trim().toLowerCase();
  const batch = asText(root.querySelector('#batch-filter')?.value || 'all');

  board.querySelectorAll('.job-card').forEach((card) => {
    const searchable = `${card.dataset.company || ''} ${card.dataset.position || ''}`.toLowerCase();
    const visible = (!query || searchable.includes(query))
      && (batch === 'all' || card.dataset.batch === batch);
    card.style.display = visible ? '' : 'none';
  });
  root.querySelectorAll('#job-table-body tr[data-job-search]').forEach((row) => {
    const searchable = `${row.dataset.company || ''} ${row.dataset.position || ''}`.toLowerCase();
    const visible = (!query || searchable.includes(query))
      && (batch === 'all' || row.dataset.batch === batch);
    row.style.display = visible ? '' : 'none';
  });
}

function failureMessage(error) {
  if (isCommittedMutationError(error)) return `${error.operation || '数据'}已保存，但界面刷新失败，请刷新页面确认。`;
  return `保存失败：${error instanceof Error ? error.message : '未知错误'}`;
}

function beforeJobId(column, jobId, clientY) {
  const cards = [...column.querySelectorAll(':scope > .job-card')].filter((card) => card.dataset.id !== jobId);
  if (!Number.isFinite(clientY)) return null;
  const nextCard = cards.find((card) => clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2);
  return nextCard?.dataset.id ?? null;
}

export function initJobsController({ root, store, service, showToast, onFilter = () => {} }) {
  root.__OFFER_OS_JOBS_CLEANUP__?.();
  const board = root.querySelector('#kanban-board');
  const tableBody = root.querySelector('#job-table-body');
  const form = root.querySelector('#add-job-form');
  const search = root.querySelector('#job-search');
  const batchFilter = root.querySelector('#batch-filter');
  let draggedJobId = null;

  const render = () => {
    renderJobs(root, store.getState().jobs);
    applyFilters(root); onFilter();
  };
  const onSearchInput = () => { applyFilters(root); onFilter(); };
  const onBatchChange = () => { applyFilters(root); onFilter(); };
  const onFailure = (error) => showToast(failureMessage(error));

  const removeJob = async (id, name) => {
    if (!root.defaultView?.confirm(`确定删除「${name}」？`)) return;
    try {
      await service.remove(id);
    } catch (error) {
      onFailure(error);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const submittedForm = event.currentTarget;
    const input = formInput(submittedForm);
    if (!input.company || !input.position) return;
    if (input.applyLink && !isSafeExternalLink(input.applyLink)) {
      showToast('保存失败：投递链接必须是安全的 http/https 绝对地址');
      return;
    }

    try {
      await service.create(input);
      const dialog = submittedForm.closest('dialog');
      dialog?.close?.();
      submittedForm.reset();
    } catch (error) {
      if (isCommittedMutationError(error)) {
        submittedForm.closest('dialog')?.close?.();
        submittedForm.reset();
      }
      onFailure(error);
    }
  };

  const onJobActionClick = async (event, container) => {
    const action = event.target.closest('[data-job-action]');
    if (!action || !container?.contains(action)) return;
    const card = action.closest('.job-card');
    const row = action.closest('tr[data-id]');
    const item = card ?? row;
    if (!item?.dataset.id) return;

    if (action.dataset.jobAction === 'detail') {
      root.defaultView?.__OFFER_OS_OPEN_JOB_DETAIL__?.(item);
      return;
    }
    if (action.dataset.jobAction !== 'delete') return;

    const name = `${item.dataset.company || ''} ${item.dataset.position || ''}`.trim();
    await removeJob(item.dataset.id, name);
  };

  const onJobStageChange = async (event, container) => {
    const control = event.target.closest('[data-job-action="stage"]');
    if (!control || !container?.contains(control)) return;
    const card = control.closest('.job-card');
    const row = control.closest('tr[data-id]');
    const item = card ?? row;
    const stage = control.value;
    if (!item?.dataset.id || !stage || stage === item.dataset.stage) return;

    try {
      await service.move(item.dataset.id, stage, null);
    } catch (error) {
      if (!isCommittedMutationError(error)) control.value = item.dataset.stage;
      onFailure(error);
    }
  };

  const onDragStart = (event) => {
    const card = event.target.closest('.job-card');
    if (!card || !board?.contains(card)) return;
    draggedJobId = card.dataset.id;
    card.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', draggedJobId);
  };

  const onDragEnd = () => {
    draggedJobId = null;
    board?.querySelectorAll('.dragging, .drag-over').forEach((element) => element.classList.remove('dragging', 'drag-over'));
  };

  const onDragOver = (event) => {
    const column = event.target.closest('.kanban-col');
    if (!column || !board?.contains(column)) return;
    event.preventDefault();
    column.classList.add('drag-over');
  };

  const onDrop = async (event) => {
    const column = event.target.closest('.kanban-col');
    if (!column || !board?.contains(column)) return;
    event.preventDefault();
    const jobId = draggedJobId || event.dataTransfer?.getData('text/plain');
    const stage = column.dataset.stage;
    const beforeId = beforeJobId(column, jobId, event.clientY);
    onDragEnd();
    if (!jobId || !stage) return;

    try {
      await service.move(jobId, stage, beforeId);
    } catch (error) {
      onFailure(error);
    }
  };

  form?.addEventListener('submit', onSubmit);
  const onBoardClick = (event) => onJobActionClick(event, board);
  const onTableClick = (event) => onJobActionClick(event, tableBody);
  const onBoardChange = (event) => onJobStageChange(event, board);
  const onTableChange = (event) => onJobStageChange(event, tableBody);
  board?.addEventListener('click', onBoardClick);
  tableBody?.addEventListener('click', onTableClick);
  board?.addEventListener('change', onBoardChange);
  tableBody?.addEventListener('change', onTableChange);
  board?.addEventListener('dragstart', onDragStart);
  board?.addEventListener('dragend', onDragEnd);
  board?.addEventListener('dragover', onDragOver);
  board?.addEventListener('drop', onDrop);
  search?.addEventListener('input', onSearchInput);
  batchFilter?.addEventListener('change', onBatchChange);
  if (root.defaultView) {
    root.defaultView.__OFFER_OS_REMOVE_JOB__ = (id, name) => removeJob(id, name);
    root.defaultView.__OFFER_OS_RECORD_FOLLOW_UP__ = (id) => service.recordFollowUp(id);
  }
  const unsubscribe = store.subscribe('jobs:changed', render);
  render();

  const cleanup = () => {
    form?.removeEventListener('submit', onSubmit);
    board?.removeEventListener('click', onBoardClick);
    tableBody?.removeEventListener('click', onTableClick);
    board?.removeEventListener('change', onBoardChange);
    tableBody?.removeEventListener('change', onTableChange);
    board?.removeEventListener('dragstart', onDragStart);
    board?.removeEventListener('dragend', onDragEnd);
    board?.removeEventListener('dragover', onDragOver);
    board?.removeEventListener('drop', onDrop);
    search?.removeEventListener('input', onSearchInput);
    batchFilter?.removeEventListener('change', onBatchChange);
    unsubscribe();
    if (root.defaultView?.__OFFER_OS_REMOVE_JOB__) delete root.defaultView.__OFFER_OS_REMOVE_JOB__;
    if (root.defaultView?.__OFFER_OS_RECORD_FOLLOW_UP__) delete root.defaultView.__OFFER_OS_RECORD_FOLLOW_UP__;
    if (root.__OFFER_OS_JOBS_CLEANUP__ === cleanup) delete root.__OFFER_OS_JOBS_CLEANUP__;
  };
  root.__OFFER_OS_JOBS_CLEANUP__ = cleanup;
  return cleanup;
}
