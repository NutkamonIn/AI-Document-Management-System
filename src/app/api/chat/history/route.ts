import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSessionId = searchParams.get('sessionId');

    let chatSession = null;

    if (requestedSessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: requestedSessionId, userId: session.user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          title: 'การสนทนาใหม่',
          userId: session.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return NextResponse.json({
      sessionId: chatSession.id,
      title: chatSession.title,
      messages: chatSession.messages,
    });
  } catch (error: any) {
    console.error('Fetch Chat History Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการสนทนา' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, role, content, sources } = await req.json();

    if (!sessionId || !role || !content) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        sources: sources ?? undefined,
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(newMessage);
  } catch (error: any) {
    console.error('Save Chat Message Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อความ' }, { status: 500 });
  }
}
