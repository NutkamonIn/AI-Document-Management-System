import fs from 'fs/promises';
import path from 'path';

export interface QuotaRecord {
  usedTokens: number;
  usedRequests: number;
  lastUpdated: string;
}

interface QuotaStore {
  [key: string]: QuotaRecord;
}

const QUOTA_FILE_PATH = path.join(process.cwd(), 'uploads', 'quota_usage.json');

// ตั้งค่าเริ่มต้นการใช้งานเป็น 0 เพื่อให้ระบบนับจากการใช้งานจริง (Real Data)
const BASELINE_TOKENS = 0;
const BASELINE_REQUESTS = 0;

function getTodayKey(userId: string): string {
  const now = new Date();
  const utcDateStr = now.toISOString().split('T')[0];
  return `${userId}_${utcDateStr}`;
}

async function loadQuotaStore(): Promise<QuotaStore> {
  try {
    const data = await fs.readFile(QUOTA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveQuotaStore(store: QuotaStore): Promise<void> {
  try {
    const dir = path.dirname(QUOTA_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(QUOTA_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save quota store:', err);
  }
}

export async function recordTokenUsage(userId: string, tokensUsed: number): Promise<QuotaRecord> {
  const store = await loadQuotaStore();
  const key = getTodayKey(userId);

  const now = new Date();
  const utcDateStr = now.toISOString().split('T')[0];
  const existingTodayKey = Object.keys(store).find((k) => k.includes(utcDateStr));
  const activeKey = existingTodayKey || key;

  const current = store[activeKey] || { usedTokens: BASELINE_TOKENS, usedRequests: BASELINE_REQUESTS, lastUpdated: new Date().toISOString() };
  current.usedTokens += tokensUsed;
  current.usedRequests += 1;
  current.lastUpdated = new Date().toISOString();

  store[activeKey] = current;
  await saveQuotaStore(store);
  return current;
}

export async function getDailyQuotaUsage(userId: string): Promise<QuotaRecord> {
  const store = await loadQuotaStore();
  const now = new Date();
  const utcDateStr = now.toISOString().split('T')[0];

  const key = getTodayKey(userId);
  if (store[key]) return store[key];

  const existingTodayKey = Object.keys(store).find((k) => k.includes(utcDateStr));
  if (existingTodayKey && store[existingTodayKey]) {
    return store[existingTodayKey];
  }

  return { usedTokens: BASELINE_TOKENS, usedRequests: BASELINE_REQUESTS, lastUpdated: new Date().toISOString() };
}
