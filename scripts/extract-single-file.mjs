import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = await readFile('offer-os.html', 'utf8');
const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!styleMatch || !scriptMatch) throw new Error('Unable to locate inline style or application script');

await mkdir('src/legacy', { recursive: true });
await writeFile('src/legacy/legacy.css', styleMatch[1].trimStart());
await writeFile('src/legacy/legacy-app.js', scriptMatch[1].trimStart());

const html = source
  .replace(styleMatch[0], '')
  .replace(scriptMatch[0], '<script type="module" src="/src/main.js"></script>\n</body>');
await writeFile('index.html', html);
