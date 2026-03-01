import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inlineMd = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-stone-200 px-1 py-0.5 text-xs font-mono">$1</code>');

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
              <li key={j} className="text-stone-800" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(item)) }} />
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
      elements.push(
        <div key={`tbl-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <tbody>
              {tableRows.map((cells, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                  {cells.map((cell, ci) => (
                    <td key={ci} className={cn('px-3 py-2 border-b border-stone-100', ci === 0 && 'font-bold text-stone-700 w-[35%]')} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlineMd(cell)) }} />
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

    if (line === '---') { flushList(); elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200" />); continue; }
    if (line.startsWith('###')) { flushList(); elements.push(<h4 key={i} className="mt-4 mb-1 font-bold text-emerald-700 text-base">{line.replace(/^###\s*/, '')}</h4>); continue; }
    if (line.startsWith('##')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900">{line.replace(/^##\s*/, '')}</h3>); continue; }
    if (line.startsWith('#')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900">{line.replace(/^#\s*/, '')}</h3>); continue; }
    if (/^\d+\.\s/.test(line)) { if (listItems.length === 0) listType = 'ol'; listItems.push(line.replace(/^\d+\.\s*/, '')); continue; }
    if (/^[-*]\s/.test(line)) { if (listItems.length === 0) listType = 'ul'; listItems.push(line.replace(/^[-*]\s*/, '')); continue; }
    if (line.startsWith('⚠️')) { flushList(); elements.push(<p key={i} className="my-2 text-xs text-stone-400 italic">{line}</p>); continue; }
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
