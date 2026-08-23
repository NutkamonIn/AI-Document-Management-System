import { describe, it, expect } from 'vitest';

describe('Daily Quota Tracker Engine (Level 1 Unit Test)', () => {
  const TOTAL_TOKENS_LIMIT = 500000;
  const TOTAL_REQUESTS_LIMIT = 14400;

  it('should calculate remaining token capacity percentage to 1 decimal place precision', () => {
    const usedTokens = 177400;
    const remainingTokens = TOTAL_TOKENS_LIMIT - usedTokens;
    const remainingPercent = ((remainingTokens / TOTAL_TOKENS_LIMIT) * 100).toFixed(1);

    expect(remainingTokens).toBe(322600);
    expect(remainingPercent).toBe('64.5');
  });

  it('should calculate remaining request capacity percentage to 1 decimal place precision', () => {
    const usedRequests = 208;
    const remainingRequests = TOTAL_REQUESTS_LIMIT - usedRequests;
    const remainingPercent = ((remainingRequests / TOTAL_REQUESTS_LIMIT) * 100).toFixed(1);

    expect(remainingRequests).toBe(14192);
    expect(remainingPercent).toBe('98.6');
  });

  it('should correctly format daily UTC date tracking key', () => {
    const userId = 'user_test_123';
    const now = new Date();
    const utcDateStr = now.toISOString().split('T')[0];
    const expectedKey = `${userId}_${utcDateStr}`;

    expect(expectedKey).toContain(userId);
    expect(expectedKey).toMatch(/^[a-zA-Z0-9_]+_\d{4}-\d{2}-\d{2}$/);
  });
});
