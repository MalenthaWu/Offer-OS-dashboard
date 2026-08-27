const MESSAGE = '本地存储不可用，岗位和备份功能已停用。当前岗位仅可查看，请检查浏览器是否允许 IndexedDB 后刷新页面重试。';

function disabledControls(root) {
  return root.querySelectorAll([
    '#top-add-job',
    '.add-job-trigger',
    '#add-job-form input',
    '#add-job-form select',
    '#add-job-form textarea',
    '#add-job-form button[type="submit"]',
    '[data-job-action="delete"]',
    '[data-job-action="stage"]',
    '.job-delete',
    '.table-job-delete',
    '.library-delete',
    '#detail-delete',
    '#local-data-export',
    '#local-data-import',
    '#local-data-file',
  ].join(','));
}

function createStatus(document) {
  const status = document.createElement('section');
  status.id = 'persistence-unavailable';
  status.setAttribute('role', 'alert');
  status.setAttribute('aria-live', 'assertive');
  status.tabIndex = -1;
  Object.assign(status.style, {
    position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: '200',
    maxWidth: 'min(680px, calc(100vw - 24px))', padding: '12px 16px', border: '1px solid #b45b4e',
    borderRadius: '10px', background: '#fff4f1', color: '#5d241b', boxShadow: '0 8px 24px rgba(0,0,0,.15)',
    fontSize: '14px', lineHeight: '1.5', textAlign: 'center',
  });
  status.textContent = MESSAGE;
  document.body?.appendChild(status);
  return status;
}

export function disablePersistenceDependentControls({ root = document } = {}) {
  const document = root.nodeType === 9 ? root : root.ownerDocument;
  if (!document) return false;

  document.documentElement.dataset.persistenceState = 'unavailable';
  const status = document.querySelector('#persistence-unavailable') ?? createStatus(document);
  status.textContent = MESSAGE;

  disabledControls(document).forEach((control) => {
    control.disabled = true;
    control.setAttribute('aria-disabled', 'true');
  });
  document.querySelectorAll('#kanban-board .job-card').forEach((card) => {
    card.draggable = false;
    card.setAttribute('aria-disabled', 'true');
  });

  if (document.__OFFER_OS_PERSISTENCE_GUARD__) return true;
  const blockSubmit = (event) => {
    if (!event.target.closest?.('#add-job-form')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const blockMutation = (event) => {
    if (!event.target.closest?.('#top-add-job, .add-job-trigger, [data-job-action="delete"], [data-job-action="stage"], .job-delete, .table-job-delete, .library-delete, #detail-delete, #local-data-export, #local-data-import')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const blockDrag = (event) => {
    if (!event.target.closest?.('#kanban-board .job-card, #kanban-board .kanban-col')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  document.addEventListener('submit', blockSubmit, true);
  document.addEventListener('click', blockMutation, true);
  document.addEventListener('dragstart', blockDrag, true);
  document.addEventListener('drop', blockDrag, true);
  document.__OFFER_OS_PERSISTENCE_GUARD__ = true;
  return true;
}

export { MESSAGE as PERSISTENCE_UNAVAILABLE_MESSAGE };
