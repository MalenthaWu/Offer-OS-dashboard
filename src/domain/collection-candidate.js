const text = (value) => String(value ?? '').trim();

export function normalizeCollectionCandidate(raw) {
  try {
    const url = new URL(text(raw?.sourceUrl));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.search = '';
    url.hash = '';
    const candidate = {
      source: text(raw.source),
      sourceUrl: url.href,
      company: text(raw.company),
      title: text(raw.title),
      location: text(raw.location),
      batch: text(raw.batch),
      summary: text(raw.summary),
      sourceJobId: text(raw.sourceJobId),
    };
    return candidate.source && candidate.company && candidate.title ? candidate : null;
  } catch {
    return null;
  }
}

export function matchesDirection(candidate, direction) {
  const terms = [text(direction?.name), ...text(direction?.keywords).split(',')]
    .map((term) => term.toLowerCase())
    .filter(Boolean);
  const haystack = `${candidate.title} ${candidate.summary}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}
