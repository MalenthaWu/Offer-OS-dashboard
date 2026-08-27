const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function safeExternalLink(value) {
  if (typeof value !== 'string' || !value || value.trim() !== value || /[\u0000-\u001F\u007F\s]/.test(value)) return null;

  try {
    const url = new URL(value);
    if (!SAFE_PROTOCOLS.has(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isSafeExternalLink(value) {
  return safeExternalLink(value) !== null;
}

export function openExternalLink(value, openWindow = window.open.bind(window)) {
  const href = safeExternalLink(value);
  if (!href) return false;

  const popup = openWindow(href, '_blank', 'noopener,noreferrer');
  try {
    if (popup) popup.opener = null;
  } catch {
    // A cross-origin popup may not expose an assignable opener. The
    // noopener/noreferrer features above still prevent opener access.
  }
  return true;
}
