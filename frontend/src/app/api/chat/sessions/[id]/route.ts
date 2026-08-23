import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const chatSession = await prisma.chatSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชตนี้' }, { status: 404 });
    }

    await prisma.chatSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบห้องแชตเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Delete Chat Session Error:', error);
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await req.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'โปรดระบุหัวข้อห้องแชต' }, { status: 400 });
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id, userId: session.user.id },
      data: { title: title.trim() },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Rename Chat Session Error:', error);
    return NextResponse.json({ error: 'Failed to rename chat session' }, { status: 500 });
  }
}
