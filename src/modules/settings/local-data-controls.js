import { exportBackup as exportLocalBackup, importBackup as importLocalBackup } from '../../data/backup.js';

const REPLACE_CONFIRMATION = '覆盖导入会覆盖本地岗位和活动，确认继续吗？';

function backupDate(now) {
  return new Date(now).toISOString().slice(0, 10);
}

function importModeFromPrompt(target) {
  const answer = target.prompt?.('请选择导入方式：输入 merge 合并或 replace 覆盖', 'merge');
  if (answer === 'merge' || answer === '合并') return 'merge';
  if (answer === 'replace' || answer === '覆盖') return 'replace';
  return null;
}

function createButton(document, id, label) {
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = label;
  return button;
}

export function initLocalDataControls({
  root = document,
  db,
  jobService,
  exportBackup = exportLocalBackup,
  importBackup = importLocalBackup,
  now = () => new Date(),
  url = URL,
  BlobCtor = Blob,
  chooseImportMode,
  confirmReplace,
  showToast = () => {},
} = {}) {
  const accountPane = root?.querySelector?.('#settings-account-pane');
  if (!accountPane || accountPane.querySelector('#local-data-controls')) return Boolean(accountPane);

  const document = accountPane.ownerDocument;
  const target = document.defaultView ?? globalThis;
  const chooseMode = chooseImportMode ?? (() => importModeFromPrompt(target));
  const confirmOverwrite = confirmReplace ?? ((message) => target.confirm?.(message) ?? false);

  const section = document.createElement('section');
  section.id = 'local-data-controls';
  section.className = 'settings-section';
  const title = document.createElement('div');
  title.className = 'settings-section-title';
  title.textContent = '本地数据备份';
  const hint = document.createElement('p');
  hint.className = 'form-hint';
  hint.textContent = '仅包含本地岗位和活动；不会导出 API Key 或其他浏览器设置。';
  const actions = document.createElement('div');
  actions.className = 'settings-account-row';
  const exportButton = createButton(document, 'local-data-export', '导出本地数据');
  const importButton = createButton(document, 'local-data-import', '导入本地数据');
  const fileInput = document.createElement('input');
  fileInput.id = 'local-data-file';
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  const download = document.createElement('a');
  download.id = 'local-data-download';
  download.hidden = true;

  actions.append(exportButton, importButton, fileInput, download);
  section.append(title, actions, hint);
  accountPane.append(section);

  let importInFlight = false;

  exportButton.addEventListener('click', async () => {
    try {
      const exportedAt = now();
      const backup = await exportBackup(db, exportedAt);
      const blob = new BlobCtor([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const objectUrl = url.createObjectURL(blob);
      download.href = objectUrl;
      download.download = `offer-os-backup-${backupDate(exportedAt)}.json`;
      try {
        download.click();
      } finally {
        url.revokeObjectURL(objectUrl);
      }
      showToast('本地数据已导出');
    } catch (error) {
      showToast(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  importButton.addEventListener('click', () => {
    if (!importInFlight) fileInput.click();
  });
  fileInput.addEventListener('change', async () => {
    if (importInFlight) return;
    const file = fileInput.files?.[0];
    if (!file) return;

    importInFlight = true;
    importButton.disabled = true;
    fileInput.disabled = true;

    try {
      const mode = chooseMode();
      if (mode !== 'merge' && mode !== 'replace') return;
      if (mode === 'replace' && !confirmOverwrite(REPLACE_CONFIRMATION)) return;

      let payload;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        showToast('导入失败：备份文件不是有效的 JSON');
        return;
      }

      await importBackup(db, payload, { mode, jobService });
      showToast(mode === 'replace' ? '本地岗位和活动已覆盖导入' : '本地数据已合并导入');
    } catch (error) {
      showToast(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      fileInput.value = '';
      fileInput.disabled = false;
      importButton.disabled = false;
      importInFlight = false;
    }
  });

  return true;
}
