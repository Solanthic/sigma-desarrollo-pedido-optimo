#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';
import { tmpdir } from 'os';
import { Marked } from 'marked';
import { chromium } from 'playwright';

const CSS = `
  :root {
    --text: #1a1a1a;
    --muted: #555;
    --border: #d0d0d0;
    --bg-subtle: #f6f8fa;
    --accent: #0366d6;
  }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: var(--text);
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  /* Headings */
  h1 { font-size: 22pt; font-weight: 700; margin: 0 0 8pt 0; padding-bottom: 6pt; border-bottom: 2px solid var(--text); }
  h2 { font-size: 16pt; font-weight: 700; margin: 28pt 0 8pt 0; padding-bottom: 4pt; border-bottom: 1px solid var(--border); }
  h3 { font-size: 13pt; font-weight: 700; margin: 20pt 0 6pt 0; }
  h4 { font-size: 11pt; font-weight: 700; margin: 16pt 0 4pt 0; }

  p { margin: 0 0 8pt 0; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 16pt 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background: var(--bg-subtle);
    font-weight: 600;
    text-align: left;
    padding: 6pt 8pt;
    border: 1px solid var(--border);
  }
  td {
    padding: 5pt 8pt;
    border: 1px solid var(--border);
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafafa; }

  /* Code */
  code {
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 9pt;
    background: var(--bg-subtle);
    padding: 1pt 4pt;
    border-radius: 3pt;
  }
  pre {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 4pt;
    padding: 10pt 12pt;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.5;
    margin: 8pt 0 16pt 0;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; font-size: inherit; }

  /* Blockquotes */
  blockquote {
    border-left: 3pt solid var(--accent);
    margin: 8pt 0 16pt 0;
    padding: 6pt 12pt;
    background: #f0f7ff;
    color: var(--text);
  }
  blockquote p { margin: 0; }

  /* Lists */
  ul, ol { margin: 4pt 0 8pt 0; padding-left: 20pt; }
  li { margin-bottom: 3pt; }
  li > ul, li > ol { margin: 2pt 0 0 0; }

  /* Links */
  a { color: var(--accent); text-decoration: none; }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 20pt 0;
  }

  /* Bold / emphasis */
  strong { font-weight: 700; }

  /* Mermaid diagrams */
  .mermaid {
    text-align: center;
    margin: 12pt 0;
    page-break-inside: avoid;
  }
  .mermaid svg {
    max-width: 100%;
    height: auto;
  }

  /* Print */
  @media print {
    body { font-size: 10pt; }
    h1 { font-size: 20pt; }
    h2 { font-size: 14pt; break-before: auto; }
    table { font-size: 8.5pt; }
    pre { font-size: 8pt; }
  }
`;

function buildHtml(markdownContent) {
  const marked = new Marked();

  // Custom renderer to turn ```mermaid blocks into <div class="mermaid">
  const renderer = new marked.Renderer();
  const originalCode = renderer.code;

  marked.use({
    renderer: {
      code({ text, lang }) {
        if (lang === 'mermaid') {
          return `<div class="mermaid">${text}</div>`;
        }
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre><code class="language-${lang || ''}">${escaped}</code></pre>`;
      }
    },
    gfm: true,
    breaks: false,
  });

  const htmlBody = marked.parse(markdownContent);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS}</style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
</head>
<body>
  ${htmlBody}
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
      themeVariables: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
        fontSize: '13px'
      }
    });
  </script>
</body>
</html>`;
}

async function convertToPdf(inputPath, outputPath) {
  const md = readFileSync(inputPath, 'utf-8');
  const html = buildHtml(md);

  const tmpPath = join(tmpdir(), `md-to-pdf-${Date.now()}.html`);
  writeFileSync(tmpPath, html, 'utf-8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${tmpPath}`, { waitUntil: 'networkidle' });

  // Wait for mermaid diagrams to render (they replace <div class="mermaid"> content with SVGs)
  await page.waitForFunction(() => {
    const diagrams = document.querySelectorAll('.mermaid');
    if (diagrams.length === 0) return true;
    return Array.from(diagrams).every(d => d.querySelector('svg'));
  }, { timeout: 15000 }).catch(() => {
    console.warn('Warning: Mermaid diagrams may not have fully rendered (timeout).');
  });

  // Small extra wait for SVG paint
  await page.waitForTimeout(500);

  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: false,
  });

  await browser.close();
  unlinkSync(tmpPath);

  return outputPath;
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node scripts/md-to-pdf.mjs <input.md> [output.pdf]');
  console.log('  If output is omitted, saves alongside the input with .pdf extension.');
  process.exit(0);
}

const inputPath = resolve(args[0]);
const outputPath = args[1]
  ? resolve(args[1])
  : join(dirname(inputPath), basename(inputPath, '.md') + '.pdf');

console.log(`Converting: ${inputPath}`);
console.log(`Output:     ${outputPath}`);

convertToPdf(inputPath, outputPath)
  .then(() => console.log('Done.'))
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
