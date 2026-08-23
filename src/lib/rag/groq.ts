export async function streamGroqChat(
  systemInstruction: string,
  userPrompt: string,
  selectedModel: string = 'openai/gpt-oss-120b'
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing in .env');
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  let activeModel = selectedModel && selectedModel.trim() ? selectedModel : 'openai/gpt-oss-120b';

  const payload = {
    model: activeModel,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 4096,
  };

  let response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // หากโมเดลที่เลือกส่งผลกลับมาเป็น Error (เช่น 404 Model Not Found หรือ 400 Decommissioned) ให้ Fallback กลับมาเป็น 'openai/gpt-oss-120b' อัตโนมัติ
  if (!response.ok && activeModel !== 'openai/gpt-oss-120b') {
    activeModel = 'openai/gpt-oss-120b';
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, model: activeModel }),
    });
  }

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    if (response.status === 429 || errorText.includes('daily_limit_exceeded')) {
      throw new Error('คุณ Token หมดแล้ว (เกินขีดจำกัดโควต้าประจำวันของ Groq Cloud)');
    }
    throw new Error(`Groq API Error (${response.status}): ${errorText}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const customStream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const tokenContent =
                parsed.choices?.[0]?.delta?.content ||
                parsed.choices?.[0]?.delta?.reasoning;
              if (tokenContent) {
                const tokenLine = JSON.stringify({ type: 'token', content: tokenContent }) + '\n';
                controller.enqueue(encoder.encode(tokenLine));
              }
            } catch {}
          }
        }

        if (buffer.trim().startsWith('data:')) {
          const jsonStr = buffer.trim().replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            const tokenContent =
              parsed.choices?.[0]?.delta?.content ||
              parsed.choices?.[0]?.delta?.reasoning;
            if (tokenContent) {
              const tokenLine = JSON.stringify({ type: 'token', content: tokenContent }) + '\n';
              controller.enqueue(encoder.encode(tokenLine));
            }
          } catch {}
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return customStream;
}
