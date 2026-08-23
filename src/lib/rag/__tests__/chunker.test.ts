import { describe, it, expect } from 'vitest';
import { recursiveChunkText } from '../chunker';

describe('PDF Recursive Chunker Engine (Level 1 Unit Test)', () => {
  it('should correctly split plain text into structured page chunks', () => {
    const text = 'This is a long PDF text document intended for testing RAG chunking algorithm.';
    const chunks = recursiveChunkText(text, 1);

    expect(chunks).toBeDefined();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].content).toContain('long PDF text document');
  });

  it('should preserve page numbers accurately across multi-page chunks', () => {
    const sampleText = 'Page text chunking validation testing.';
    const page5Chunks = recursiveChunkText(sampleText, 5);
    const page10Chunks = recursiveChunkText(sampleText, 10);

    expect(page5Chunks[0].pageNumber).toBe(5);
    expect(page10Chunks[0].pageNumber).toBe(10);
  });

  it('should handle large text content exceeding chunk size bounds gracefully', () => {
    const repeatedSentence = 'Thailand hospital PTS allowance system regulation rule. ';
    const largeContent = repeatedSentence.repeat(40);
    const chunks = recursiveChunkText(largeContent, 99);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.pageNumber).toBe(99);
      expect(chunk.content.length).toBeLessThanOrEqual(1200);
    });
  });
});
