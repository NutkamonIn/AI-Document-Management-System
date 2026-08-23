import React, { useState, useEffect } from 'react';
import { MermaidDiagram } from '@/components/ui/mermaid-diagram';

export function MarkdownRenderer({ content }: { content: string }) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; altText: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inBlockquote = false;
  let quoteLines: string[] = [];
  let inMermaidBlock = false;
  let mermaidLines: string[] = [];

  const flushMermaidBlock = (key: string) => {
    if (mermaidLines.length === 0) return;
    const chart = mermaidLines.join('\n');
    elements.push(<MermaidDiagram key={key} chart={chart} />);
    mermaidLines = [];
    inMermaidBlock = false;
  };

  const renderFormattedText = (text: string): React.ReactNode => {
    if (!text) return null;

    let sanitized = text.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n');
    const brParts = sanitized.split(/<br\s*\/?>/gi);

    return brParts.map((brPart, brIdx) => {
      const codeParts = brPart.split(/(`.*?`)/g);

      const renderedCode = codeParts.map((codePart, codeIdx) => {
        if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length > 2) {
          return (
            <code
              key={codeIdx}
              className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200"
            >
              {codePart.slice(1, -1)}
            </code>
          );
        }

        const imageParts = codePart.split(/(!\[[^\]]*\]\([^)]+\))/g);
        const renderedImages = imageParts.map((imgPart, imgIdx) => {
          const imgMatch = imgPart.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (imgMatch) {
            const [, altText, url] = imgMatch;
            return (
              <div
                key={imgIdx}
                className="my-2.5 max-w-md overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-xs group cursor-pointer hover:border-blue-300 transition-all duration-200"
                onClick={() => setSelectedImage({ url, altText })}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={url}
                    alt={altText || 'ภาพประกอบเอกสาร'}
                    className="w-full h-auto max-h-80 object-contain group-hover:scale-102 transition-transform duration-200 p-1"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-md">
                      กดเพื่อขยายรูปภาพ
                    </span>
                  </div>
                </div>
                {altText && (
                  <div className="p-2 text-center text-xs text-gray-500 font-medium bg-white border-t border-gray-100">
                    {altText}
                  </div>
                )}
              </div>
            );
          }

          const linkParts = imgPart.split(/((?<!\!)\[[^\]]*\]\([^)]+\))/g);
          return linkParts.map((linkPart, linkIdx) => {
            const match = linkPart.match(/^\[(.*?)\]\((.*?)\)$/);
            if (match) {
              const [, linkText, url] = match;
              return (
                <a
                  key={linkIdx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-medium hover:text-blue-800"
                >
                  {linkText}
                </a>
              );
            }

            const boldParts = linkPart.split(/(\*\*.*?\*\*|__.*?__|<b>.*?<\/b>|<strong>.*?<\/strong>)/gi);
            const renderedBold = boldParts.map((boldPart, boldIdx) => {
              if (
                (boldPart.startsWith('**') && boldPart.endsWith('**')) ||
                (boldPart.startsWith('__') && boldPart.endsWith('__'))
              ) {
                return (
                  <strong key={boldIdx} className="font-semibold text-gray-900">
                    {boldPart.slice(2, -2)}
                  </strong>
                );
              }
              if (/^<b\b[^>]*>(.*?)<\/b>/gi.test(boldPart) || /^<strong\b[^>]*>(.*?)<\/strong>/gi.test(boldPart)) {
                const innerText = boldPart.replace(/<\/?(b|strong)>/gi, '');
                return (
                  <strong key={boldIdx} className="font-semibold text-gray-900">
                    {innerText}
                  </strong>
                );
              }

              const italicParts = boldPart.split(/(\*.*?\*|_.*?_|<i>.*?<\/i>|<em>.*?<\/em>)/gi);
              return italicParts.map((italicPart, italicIdx) => {
                if (
                  (italicPart.startsWith('*') && italicPart.endsWith('*')) ||
                  (italicPart.startsWith('_') && italicPart.endsWith('_'))
                ) {
                  return (
                    <em key={italicIdx} className="italic text-gray-800">
                      {italicPart.slice(1, -1)}
                    </em>
                  );
                }
                if (/^<i\b[^>]*>(.*?)<\/i>/gi.test(italicPart) || /^<em\b[^>]*>(.*?)<\/em>/gi.test(italicPart)) {
                  const innerText = italicPart.replace(/<\/?(i|em)>/gi, '');
                  return (
                    <em key={italicIdx} className="italic text-gray-800">
                      {innerText}
                    </em>
                  );
                }

                if (italicPart.startsWith('~~') && italicPart.endsWith('~~')) {
                  return (
                    <span key={italicIdx} className="line-through text-gray-500">
                      {italicPart.slice(2, -2)}
                    </span>
                  );
                }

                return italicPart;
              });
            });

            return <React.Fragment key={linkIdx}>{renderedBold}</React.Fragment>;
          });
        });

        return <React.Fragment key={codeIdx}>{renderedImages}</React.Fragment>;
      });

      return (
        <React.Fragment key={brIdx}>
          {brIdx > 0 && <br className="my-0.5" />}
          {renderedCode}
        </React.Fragment>
      );
    });
  };

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return;

    const headers = tableRows[0];
    const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => cell.replace(/[-:\s]/g, '') === ''));

    elements.push(
      <div key={key} className="my-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          {headers && (
            <thead className="bg-blue-50/80 border-b border-gray-200 text-blue-900 font-semibold">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-2.5 align-top">
                    {renderFormattedText(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-gray-50/80 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2.5 text-gray-700 leading-relaxed align-top">
                    {renderFormattedText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  const flushBlockquote = (key: string) => {
    if (quoteLines.length === 0) return;

    elements.push(
      <blockquote
        key={key}
        className="my-3 border-l-4 border-blue-500 bg-blue-50/40 p-3 rounded-r-xl text-sm italic text-blue-900"
      >
        {quoteLines.map((ql, qIdx) => (
          <div key={qIdx}>{renderFormattedText(ql)}</div>
        ))}
      </blockquote>
    );
    quoteLines = [];
    inBlockquote = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join('\n');
        const firstLine = (codeBlockLines[0] || '').trim();
        const isMermaid =
          codeBlockLang === 'mermaid' ||
          /^(flowchart|graph|sequenceDiagram|gantt|pie|classDiagram)\b/i.test(firstLine);

        if (isMermaid) {
          elements.push(<MermaidDiagram key={`mermaid-${index}`} chart={codeText} />);
        } else {
          elements.push(
            <div key={`codeblock-${index}`} className="my-3 rounded-xl bg-slate-900 p-4 text-slate-100 font-mono text-xs overflow-x-auto shadow-sm">
              <pre>{codeText}</pre>
            </div>
          );
        }
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim().toLowerCase();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    const isExplicitMermaidStart = /^(flowchart\s+(TD|LR|TB|BT|RL)|graph\s+(TD|LR|TB|BT|RL)|sequenceDiagram|gantt|pie|classDiagram)\b/i.test(trimmed);
    if (isExplicitMermaidStart) {
      if (inMermaidBlock) {
        flushMermaidBlock(`mermaid-auto-${index}`);
      }
      inMermaidBlock = true;
      mermaidLines.push(line);
      return;
    }

    if (inMermaidBlock) {
      const isDiagramLine =
        /(-->|---|==>|-.->|\[.*?\]|\(.*?\)|{.*?})/.test(trimmed) ||
        /^(subgraph|end|style|classDef|click)\b/i.test(trimmed) ||
        /^[A-Za-z0-9_]+\s*(-->|---|==>)/.test(trimmed);

      if (isDiagramLine) {
        mermaidLines.push(line);
        return;
      } else {
        flushMermaidBlock(`mermaid-auto-${index}`);
      }
    }

    if (trimmed.startsWith('>')) {
      inBlockquote = true;
      quoteLines.push(trimmed.slice(1).trim());
      return;
    } else if (inBlockquote) {
      flushBlockquote(`quote-${index}`);
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`table-${index}`);
    }

    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      elements.push(<hr key={`hr-${index}`} className="my-3 border-t border-gray-200" />);
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${index}`} className="text-base font-bold text-gray-900 mt-4 mb-2 border-b pb-1 border-gray-200">
          {renderFormattedText(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${index}`} className="text-sm font-bold text-gray-900 mt-3 mb-1.5 border-b pb-1 border-gray-200">
          {renderFormattedText(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-xs font-bold text-gray-800 mt-2 mb-1">
          {renderFormattedText(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${index}`} className="flex items-start gap-2 my-1 text-sm text-gray-800">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
          <div className="flex-1">{renderFormattedText(trimmed.slice(2))}</div>
        </div>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const [, num, itemText] = numMatch;
      elements.push(
        <div key={`ol-${index}`} className="flex items-start gap-2 my-1 text-sm text-gray-800">
          <span className="font-semibold text-blue-700 shrink-0 min-w-[20px] text-xs mt-0.5">{num}.</span>
          <div className="flex-1">{renderFormattedText(itemText)}</div>
        </div>
      );
      return;
    }

    elements.push(
      <div key={`p-${index}`} className="text-sm text-gray-800 leading-relaxed my-0.5">
        {renderFormattedText(trimmed)}
      </div>
    );
  });

  if (inMermaidBlock) {
    flushMermaidBlock(`mermaid-auto-end`);
  }
  if (inTable) {
    flushTable(`table-end`);
  }
  if (inBlockquote) {
    flushBlockquote(`quote-end`);
  }

  return (
    <div className="space-y-0.5">
      {elements}

      {/* Floating Image Lightbox Overlay Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center bg-slate-900/90 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl p-3 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/90 text-slate-300 hover:text-white hover:bg-red-600/90 border border-slate-600/50 transition-colors shadow-lg cursor-pointer"
              title="ปิดรูปภาพ (ESC)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Expanded Image */}
            <img
              src={selectedImage.url}
              alt={selectedImage.altText || 'รูปภาพขยาย'}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
            />

            {/* Caption */}
            {selectedImage.altText && (
              <div className="mt-3 text-center text-xs font-medium text-slate-200 px-4 py-1.5 bg-slate-800/80 rounded-full border border-slate-700/60">
                {selectedImage.altText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
