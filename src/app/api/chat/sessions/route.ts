import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Get Chat Sessions Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json().catch(() => ({}));

    const newSession = await prisma.chatSession.create({
      data: {
        title: title || 'การสนทนาใหม่',
        userId: session.user.id,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Create Chat Session Error:', error);
    return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
  }
}
