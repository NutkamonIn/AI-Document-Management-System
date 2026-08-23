import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { findRelevantChunks } from '@/lib/rag/similarity-search';
import { streamGeminiChat } from '@/lib/rag/gemini';
import { streamGroqChat } from '@/lib/rag/groq';
import { recordTokenUsage } from '@/lib/rag/quota-tracker';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.2';
const AI_PROVIDER = process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : process.env.GEMINI_API_KEY ? 'gemini' : 'ollama');

async function saveMessageToDb(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  targetSessionId?: string,
  sources?: string[]
): Promise<string | null> {
  try {
    let chatSession = null;

    if (targetSessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: targetSessionId, userId },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          title: content.trim().slice(0, 30) || 'การสนทนาใหม่',
          userId,
        },
      });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role,
        content,
        sources: sources ?? undefined,
      },
    });

    if (chatSession.title === 'การสนทนาใหม่' && role === 'user') {
      const autoTitle = content.trim().slice(0, 30);
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: { title: autoTitle, updatedAt: new Date() },
      });
    } else {
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: { updatedAt: new Date() },
      });
    }

    return chatSession.id;
  } catch (err) {
    console.error('Failed to save message to DB:', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, selectedDocumentIds, selectedModel, sessionId: inputSessionId } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'โปรดระบุคำถาม' }, { status: 400 });
    }

    const activeSessionId = await saveMessageToDb(session.user.id, 'user', message, inputSessionId);

    const relevantChunks = await findRelevantChunks(
      message,
      session.user.id,
      12,
      Array.isArray(selectedDocumentIds) ? selectedDocumentIds : undefined
    );

    if (relevantChunks.length === 0) {
      const defaultResponse = 'ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารที่คุณเลือกอัปโหลดไว้ โปรดตรวจสอบว่าได้เลือกไฟล์เอกสาร หรือประมวลผล RAG แล้วหรือยัง';
      await saveMessageToDb(session.user.id, 'assistant', defaultResponse, activeSessionId || undefined);
      await recordTokenUsage(session.user.id, 500);
      return NextResponse.json({
        answer: defaultResponse,
        sources: [],
        sessionId: activeSessionId,
      });
    }

    const sources: { documentName: string; pageNumber: number }[] = [];
    const contextText = relevantChunks
      .map((c, i) => {
        sources.push({ documentName: c.documentName, pageNumber: c.pageNumber });
        return `[เอกสาร ${i + 1}: ${c.documentName} หน้า ${c.pageNumber}]\n${c.content}`;
      })
      .join('\n\n');

    const uniqueSources = Array.from(new Set(sources.map((s) => `${s.documentName} (หน้า ${s.pageNumber})`)));

    // ดึงคลังรูปภาพประกอบจริงทั้งหมดผ่าน Raw SQL Query เพื่อข้าม Prisma Client Cache 100%
    const targetDocIds = Array.from(new Set(relevantChunks.map((c) => c.documentId)));
    let docImages: { id: string; pageNumber: number }[] = [];

    try {
      if (targetDocIds.length > 0) {
        const escapedDocIds = targetDocIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
        const rows = await (prisma as any).$queryRawUnsafe(
          `SELECT "id", "pageNumber" FROM "DocumentImage" WHERE "documentId" IN (${escapedDocIds}) ORDER BY "pageNumber" ASC`
        );
        if (Array.isArray(rows)) {
          docImages = rows.map((r: any) => ({ id: r.id, pageNumber: Number(r.pageNumber) }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch docImages via raw SQL:', err);
    }

    let imageGalleryPrompt = '';
    if (docImages.length > 0) {
      imageGalleryPrompt =
        '\n\n--- รายชื่อแท็กรูปภาพประกอบจริงที่มีในเอกสาร (เลือกแสดงแท็กรูปภาพเหล่านี้ประกอบคำตอบ) ---\n' +
        docImages
          .map((img) => `![ภาพประกอบ หน้า ${img.pageNumber}](/api/documents/images/${img.id})`)
          .join('\n');
    }

    const systemPrompt = `คุณคือผู้ช่วย AI สรุปและตอบคำถามจากเอกสารภาษาไทย โดยอ้างอิงข้อมูลจากเนื้อหาเอกสารอ้างอิงด้านล่างนี้เป็นหลัก 
- ตอบคำถามให้ครบถ้วน ละเอียด สมบูรณ์ที่สุด ห้ามตัดจบกลางคราว ห้ามละเว้นหัวข้อสำคัญ และอธิบายหัวข้อต่างๆ ให้ชัดเจนอ่านง่าย
- จัดรูปแบบคำตอบให้สวยงาม ใช้หัวข้อ (Markdown Headers), ตาราง (Markdown Tables), และรายการข้อๆ (Bullet points) 
- ห้ามใส่อิโมจิในคำตอบเด็ดขาด
- หากมีแท็กรูปภาพในรูปแบบ ![alt](url) ให้คงแท็กรูปภาพนั้นไว้ และนำแท็กรูปภาพ ![alt](url) มาแสดงประกอบคำตอบในตำแหน่งที่เกี่ยวข้องเสมอ
- หากผู้ขอให้แสดงรูปภาพ แนบภาพ หรือสรุปเอกสารที่มีภาพประกอบ ให้เลือกแท็กรูปภาพ ![alt](url) จากคลังรูปภาพด้านล่างมารวมไว้ในกล่องคำตอบเสมอ
- หากมีข้อมูลในเอกสารอ้างอิง ให้สรุปคำตอบจากข้อมูลจริงนั้นทันที และห้ามต่อท้ายด้วยประโยคปฏิเสธเด็ดขาด
- เฉพาะกรณีที่ในเอกสารไม่มีข้อมูลเกี่ยวกับคำถามเลยจริงๆ ให้ตอบว่า "ไม่พบข้อมูลนี้ในเอกสารที่คุณอัปโหลดไว้"

--- ข้อมูลเอกสารอ้างอิง ---
${contextText}
${imageGalleryPrompt}`;

    const encoder = new TextEncoder();
    const userId = session.user.id;

    if (AI_PROVIDER === 'groq' && process.env.GROQ_API_KEY) {
      const groqTokenStream = await streamGroqChat(systemPrompt, message, selectedModel);
      let fullAnswer = '';

      const customStream = new ReadableStream({
        async start(controller) {
          const initialMetadata = JSON.stringify({ type: 'metadata', sources: uniqueSources, sessionId: activeSessionId }) + '\n';
          controller.enqueue(encoder.encode(initialMetadata));

          const reader = groqTokenStream.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const data = JSON.parse(line);
                  if (data.type === 'token' && data.content) {
                    fullAnswer += data.content;
                  }
                } catch {}
              }

              controller.enqueue(value);
            }
          } catch (err) {
            controller.error(err);
          } finally {
            if (fullAnswer.trim()) {
              await saveMessageToDb(userId, 'assistant', fullAnswer, activeSessionId || undefined, uniqueSources);
              const promptTokens = Math.round((systemPrompt.length + message.length) * 1.2);
              const completionTokens = Math.round(fullAnswer.length * 1.5);
              await recordTokenUsage(userId, promptTokens + completionTokens);
            }
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    if (AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
      const geminiTokenStream = await streamGeminiChat(systemPrompt, message);
      let fullAnswer = '';

      const customStream = new ReadableStream({
        async start(controller) {
          const initialMetadata = JSON.stringify({ type: 'metadata', sources: uniqueSources, sessionId: activeSessionId }) + '\n';
          controller.enqueue(encoder.encode(initialMetadata));

          const reader = geminiTokenStream.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const data = JSON.parse(line);
                  if (data.type === 'token' && data.content) {
                    fullAnswer += data.content;
                  }
                } catch {}
              }

              controller.enqueue(value);
            }
          } catch (err) {
            controller.error(err);
          } finally {
            if (fullAnswer.trim()) {
              await saveMessageToDb(userId, 'assistant', fullAnswer, activeSessionId || undefined, uniqueSources);
              const promptTokens = Math.round((systemPrompt.length + message.length) * 1.2);
              const completionTokens = Math.round(fullAnswer.length * 1.5);
              await recordTokenUsage(userId, promptTokens + completionTokens);
            }
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        system: systemPrompt,
        prompt: message,
        stream: true,
        options: {
          num_predict: 4096,
          temperature: 0.3,
        },
      }),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      throw new Error(`Ollama Chat Stream Error with status ${ollamaRes.status}`);
    }

    const decoder = new TextDecoder();
    let fullAnswer = '';

    const customStream = new ReadableStream({
      async start(controller) {
        const initialMetadata = JSON.stringify({ type: 'metadata', sources: uniqueSources, sessionId: activeSessionId }) + '\n';
        controller.enqueue(encoder.encode(initialMetadata));

        const reader = ollamaRes.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  fullAnswer += parsed.response;
                  const tokenLine = JSON.stringify({ type: 'token', content: parsed.response }) + '\n';
                  controller.enqueue(encoder.encode(tokenLine));
                }
              } catch {}
            }
          }

          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.response) {
                fullAnswer += parsed.response;
                const tokenLine = JSON.stringify({ type: 'token', content: parsed.response }) + '\n';
                controller.enqueue(encoder.encode(tokenLine));
              }
            } catch {}
          }
        } catch (err) {
          controller.error(err);
        } finally {
          if (fullAnswer.trim()) {
            await saveMessageToDb(userId, 'assistant', fullAnswer, activeSessionId || undefined, uniqueSources);
            const promptTokens = Math.round((systemPrompt.length + message.length) * 1.2);
            const completionTokens = Math.round(fullAnswer.length * 1.5);
            await recordTokenUsage(userId, promptTokens + completionTokens);
          }
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการตอบคำถาม' }, { status: 500 });
  }
}
