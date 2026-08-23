import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDailyQuotaUsage } from '@/lib/rag/quota-tracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = process.env.AI_PROVIDER || 'groq';

    // คำนวณเวลานับถอยหลังถึงรีเซ็ตโควตารายวัน 500,000 Tokens (00:00 UTC / 07:00 น. ประเทศไทย)
    const now = new Date();
    const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    
    const diffMs = nextUtcMidnight.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const dailyResetStr = `${hours} ชม. ${minutes} นาที ${seconds} วินาที (รีเซ็ตทุก 07:00 น.)`;

    // อ่านค่าการใช้งานสะสมประจำวันจาก Persistent Quota Tracker
    const quota = await getDailyQuotaUsage(session.user.id);

    const limitRequests = 14400;
    const limitTokens = 500000;

    const usedTokens = quota.usedTokens || 0;
    const usedRequests = quota.usedRequests || 0;

    const remainingRequests = Math.max(0, limitRequests - usedRequests);
    const remainingTokens = Math.max(0, limitTokens - usedTokens);

    const tokenPercentage = Number(((remainingTokens / limitTokens) * 100).toFixed(1));
    const requestPercentage = Number(((remainingRequests / limitRequests) * 100).toFixed(1));

    return NextResponse.json({
      provider: provider === 'groq' ? 'Groq Cloud AI' : provider,
      model: 'groq/compound',
      status: 'online',
      tokens: {
        remaining: remainingTokens,
        used: usedTokens,
        limit: limitTokens,
        percentage: tokenPercentage,
        resetIn: dailyResetStr,
      },
      requests: {
        remaining: remainingRequests,
        used: usedRequests,
        limit: limitRequests,
        percentage: requestPercentage,
        resetIn: dailyResetStr,
      },
    });
  } catch (error: any) {
    console.error('AI Usage Route Error:', error);
    return NextResponse.json({ error: error.message || 'ไม่สามารถดึงข้อมูลโควต้า AI ได้' }, { status: 500 });
  }
}
