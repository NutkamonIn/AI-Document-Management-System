import { describe, it, expect } from 'vitest';

function sanitizeMermaidChart(chart: string): string {
  if (!chart) return '';
  let cleaned = chart.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\[([^"\]]*?\([^"\]]*?\)[^"\]]*?)\]/g, '["$1"]');
  return cleaned;
}

describe('Mermaid Flowchart Sanitizer (Level 1 Unit Test)', () => {
  it('should wrap unquoted parentheses in node labels with double quotes', () => {
    const rawChart = 'G[text (details)] --> H[result]';
    const sanitized = sanitizeMermaidChart(rawChart);

    expect(sanitized).toBe('G["text (details)"] --> H[result]');
  });

  it('should preserve already quoted node labels containing parentheses', () => {
    const rawChart = 'G["text (details)"] --> H[result]';
    const sanitized = sanitizeMermaidChart(rawChart);

    expect(sanitized).toBe('G["text (details)"] --> H[result]');
  });

  it('should clean code block ticks from mermaid string', () => {
    const rawChart = '```mermaid\nflowchart TD\nA --> B\n```';
    const sanitized = sanitizeMermaidChart(rawChart);

    expect(sanitized).toBe('flowchart TD\nA --> B');
  });
});
