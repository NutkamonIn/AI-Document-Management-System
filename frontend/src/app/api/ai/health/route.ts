import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const provider = process.env.AI_PROVIDER || 'groq';
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    if (provider === 'groq' && groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${groqKey}` },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        return NextResponse.json({
          status: 'ONLINE',
          provider: 'Groq Cloud AI',
          model: 'groq/compound',
        });
      }
    }

    if (provider === 'gemini' && geminiKey) {
      return NextResponse.json({
        status: 'ONLINE',
        provider: 'Google Gemini',
        model: 'gemini-1.5-flash',
      });
    }

    try {
      const res = await fetch(`${ollamaUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          status: 'ONLINE',
          provider: 'Ollama (Local)',
          version: data.version,
        });
      }
    } catch {}

    if (groqKey) {
      return NextResponse.json({
        status: 'ONLINE',
        provider: 'Groq Cloud AI',
        model: 'groq/compound',
      });
    }

    return NextResponse.json({ status: 'OFFLINE', provider: 'Groq Cloud AI' });
  } catch (error) {
    return NextResponse.json({ status: 'OFFLINE', provider: 'Groq Cloud AI' });
  }
}
