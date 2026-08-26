const safeLogoProperties = ['--logo-bg', '--logo-ink'];

function copyLogoStyle(source, target) {
  safeLogoProperties.forEach((property) => {
    const value = source?.style.getPropertyValue(property);
    if (value) target.style.setProperty(property, value);
  });
}

export function createResumeJobOption(card) {
  const company = card.dataset.company || '';
  const position = card.dataset.position || '';
  const logo = card.querySelector('.company-logo');
  const title = card.querySelector('.job-title span')?.textContent || '';
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'gen-job-row';

  const logoElement = document.createElement('span');
  logoElement.className = 'company-logo';
  logoElement.textContent = logo?.textContent || company.slice(0, 1) || '?';
  copyLogoStyle(logo, logoElement);

  const titleElement = document.createElement('span');
  titleElement.className = 'gj-title';
  const heading = document.createElement('strong');
  heading.textContent = `${company} · ${position}`;
  const detail = document.createElement('span');
  detail.textContent = title;
  titleElement.append(heading, detail);
  row.append(logoElement, titleElement);
  return row;
}
