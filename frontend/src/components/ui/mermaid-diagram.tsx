'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  suppressErrorRendering: true,
  themeVariables: {
    primaryColor: '#eff6ff',
    primaryTextColor: '#1e3a8a',
    primaryBorderColor: '#3b82f6',
    lineColor: '#2563eb',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#ffffff',
  },
});

function sanitizeMermaidChart(chart: string): string {
  if (!chart) return '';
  // 1. ครอบอัญประกาศ ["..."] ข้อความในโหนดที่มีวงเล็บซ้อน [...] ที่ยังไม่มีอัญประกาศ
  let cleaned = chart.replace(/\[([^"\]]*?\([^"\]]*?\)[^"\]]*?)\]/g, '["$1"]');
  // 2. เคลียร์ตัวอักษรเว้นวรรคพิเศษ
  cleaned = cleaned.replace(/[\u00a0\u202f]/g, ' ');
  return cleaned;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart || !chart.trim()) return;
      try {
        const cleanedChart = sanitizeMermaidChart(chart.trim());
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // ตรวจสอบความถูกต้องของไวยากรณ์ก่อนวาดลง DOM
        const isValid = await mermaid.parse(cleanedChart).catch(() => false);
        if (!isValid) {
          if (isMounted) setError(true);
          return;
        }

        const { svg: renderedSvg } = await mermaid.render(id, cleanedChart);
        if (isMounted) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-3 rounded-xl bg-slate-900 p-4 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 p-4 rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/20 shadow-xs overflow-x-auto flex justify-center items-center"
      dangerouslySetInnerHTML={{
        __html: svg || '<div className="text-xs text-blue-500 font-medium animate-pulse p-4">กำลังเรนเดอร์ไดอะแกรม...</div>',
      }}
    />
  );
}
