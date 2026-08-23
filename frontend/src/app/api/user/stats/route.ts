import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const docStats = await prisma.document.aggregate({
      where: { ownerId: userId },
      _count: { id: true },
      _sum: { fileSize: true },
    });

    const chunkCount = await prisma.documentChunk.count({
      where: {
        document: { ownerId: userId },
      },
    });

    const chatStats = await prisma.chatMessage.count({
      where: {
        session: { userId: userId },
      },
    });

    return NextResponse.json({
      totalDocuments: docStats._count.id || 0,
      totalStorageBytes: docStats._sum.fileSize || 0,
      totalChunks: chunkCount,
      totalChatMessages: chatStats,
    });
  } catch (error: any) {
    console.error('Fetch User Stats Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.chatSession.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ message: 'ล้างประวัติการสนทนาทั้งหมดเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Clear Chat History Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการล้างประวัติการสนทนา' }, { status: 500 });
  }
}
