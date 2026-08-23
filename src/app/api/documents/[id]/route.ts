import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId, ownerId: session.user.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'ไม่พบเอกสารที่ต้องการลบ' }, { status: 404 });
    }

    const rawPath = document.fileUrl.startsWith('/') ? document.fileUrl.slice(1) : document.fileUrl;
    const decodedPath = decodeURIComponent(rawPath);
    const fileName = path.basename(decodedPath);

    const possiblePaths = [
      path.join(process.cwd(), 'uploads', fileName),
      path.join(process.cwd(), 'uploads', decodedPath),
    ];

    let deletedCount = 0;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        await fs.unlink(p);
        deletedCount++;
      } catch {}
    }

    if (deletedCount === 0) {
      console.warn(`[Delete File Warning] ${decodedPath}`);
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: 'ลบเอกสารและไฟล์เรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete Document Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบเอกสาร' }, { status: 500 });
  }
}
