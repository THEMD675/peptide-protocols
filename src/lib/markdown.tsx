import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const inlineMd = (s: string) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 dark:hover:text-emerald-300">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stone-900 dark:text-stone-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-stone-200 dark:bg-stone-700 px-1 py-0.5 text-xs font-mono">$1</code>');

export function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  let tableRows: string[][] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1 pe-4 list-decimal list-inside">
            {listItems.map((item, j) => (
              <li key={j} className="text-stone-800 dark:text-stone-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(item)) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1 pe-4">
            {listItems.map((item, j) => (
              <li key={j} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(item)) }} />
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
      listType = 'ul';
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const [headerRow, ...bodyRows] = tableRows;
      elements.push(
        <div key={`tbl-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-800">
                {headerRow.map((cell, ci) => (
                  <th key={ci} className={cn('px-3 py-2 border-b border-stone-200 dark:border-stone-700 font-bold text-stone-700 dark:text-stone-300 text-start', ci === 0 && 'w-[35%]')} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(cell)) }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((cells, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-stone-50 dark:bg-stone-900' : 'bg-white dark:bg-stone-950'}>
                  {cells.map((cell, ci) => (
                    <td key={ci} className={cn('px-3 py-2 border-b border-stone-100 dark:border-stone-800', ci === 0 && 'font-bold text-stone-700 dark:text-stone-300 w-[35%]')} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(cell)) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={`code-${i}`} className="my-3 overflow-x-auto rounded-xl bg-stone-800 p-4 text-xs text-stone-100 leading-relaxed" dir="ltr"><code>{codeLines.join('\n')}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList(); flushTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(lines[i]); continue; }

    if (!line) { flushList(); flushTable(); elements.push(<div key={`br-${i}`} className="h-2" />); continue; }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s-:|]+\|$/.test(line)) continue;
      flushList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length > 0) { tableRows.push(cells); continue; }
    } else {
      flushTable();
    }

    if (line === '---') { flushList(); elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200 dark:border-stone-700" />); continue; }
    if (line.startsWith('###')) { flushList(); elements.push(<h4 key={i} className="mt-4 mb-1 font-bold text-emerald-700 dark:text-emerald-400 text-base">{line.replace(/^###\s*/, '')}</h4>); continue; }
    if (line.startsWith('##')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900 dark:text-stone-100">{line.replace(/^##\s*/, '')}</h3>); continue; }
    if (line.startsWith('#')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900 dark:text-stone-100">{line.replace(/^#\s*/, '')}</h3>); continue; }
    if (/^\d+\.\s/.test(line)) { if (listItems.length === 0) listType = 'ol'; listItems.push(line.replace(/^\d+\.\s*/, '')); continue; }
    if (/^[-*]\s/.test(line)) { if (listItems.length === 0) listType = 'ul'; listItems.push(line.replace(/^[-*]\s*/, '')); continue; }
    if (line.startsWith('⚠') || line.startsWith('تنبيه') || line.startsWith('ملاحظة')) { flushList(); elements.push(<p key={i} className="my-2 text-xs text-stone-500 dark:text-stone-400 italic">{line}</p>); continue; }
    flushList();
    elements.push(<p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(line)) }} />);
  }
  if (inCodeBlock && codeLines.length) {
    elements.push(<pre key="code-end" className="my-3 overflow-x-auto rounded-xl bg-stone-800 p-4 text-xs text-stone-100 leading-relaxed" dir="ltr"><code>{codeLines.join('\n')}</code></pre>);
  }
  flushList();
  flushTable();
  return elements;
}

/**
 * Render markdown to a sanitized HTML string (for print/export).
 * Mirrors renderMarkdown logic but outputs an HTML string instead of React nodes.
 */
export function renderMarkdownToHtml(text: string): string {
  const lines = text.split('\n');
  const parts: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    parts.push(`<${tag} style="padding-right:1.25rem;margin:0.5rem 0;">${listItems.map(item => `<li>${DOMPurify.sanitize(inlineMd(item))}</li>`).join('')}</${tag}>`);
    listItems = [];
    listType = 'ul';
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [header, ...body] = tableRows;
    let html = '<table style="width:100%;border-collapse:collapse;margin:0.75rem 0;"><thead><tr>';
    header.forEach(c => { html += `<th style="border:1px solid #e7e5e4;padding:6px 10px;background:#f5f5f4;text-align:start;font-weight:bold;">${DOMPurify.sanitize(inlineMd(c))}</th>`; });
    html += '</tr></thead><tbody>';
    body.forEach(row => {
      html += '<tr>';
      row.forEach(c => { html += `<td style="border:1px solid #e7e5e4;padding:6px 10px;">${DOMPurify.sanitize(inlineMd(c))}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    parts.push(html);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        parts.push(`<pre style="background:#292524;color:#f5f5f4;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;direction:ltr;"><code>${esc(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList(); flushTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(lines[i]); continue; }
    if (!line) { flushList(); flushTable(); parts.push('<br/>'); continue; }
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s-:|]+\|$/.test(line)) continue;
      flushList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length > 0) { tableRows.push(cells); continue; }
    } else {
      flushTable();
    }
    if (line === '---') { flushList(); parts.push('<hr style="margin:0.75rem 0;"/>'); continue; }
    if (line.startsWith('###')) { flushList(); parts.push(`<h4 style="margin-top:1rem;font-weight:bold;color:#059669;">${esc(line.replace(/^###\s*/, ''))}</h4>`); continue; }
    if (line.startsWith('##')) { flushList(); parts.push(`<h3 style="margin-top:1rem;font-weight:bold;">${esc(line.replace(/^##\s*/, ''))}</h3>`); continue; }
    if (line.startsWith('#')) { flushList(); parts.push(`<h3 style="margin-top:1rem;font-weight:bold;">${esc(line.replace(/^#\s*/, ''))}</h3>`); continue; }
    if (/^\d+\.\s/.test(line)) { if (listItems.length === 0) listType = 'ol'; listItems.push(line.replace(/^\d+\.\s*/, '')); continue; }
    if (/^[-*]\s/.test(line)) { if (listItems.length === 0) listType = 'ul'; listItems.push(line.replace(/^[-*]\s*/, '')); continue; }
    flushList();
    parts.push(`<p style="margin:4px 0;">${DOMPurify.sanitize(inlineMd(line))}</p>`);
  }
  if (inCodeBlock && codeLines.length) {
    parts.push(`<pre style="background:#292524;color:#f5f5f4;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;direction:ltr;"><code>${esc(codeLines.join('\n'))}</code></pre>`);
  }
  flushList();
  flushTable();
  return parts.join('\n');
}
