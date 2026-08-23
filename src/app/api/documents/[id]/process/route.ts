import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import fs from 'fs/promises';
import path from 'path';
import { processDocumentRAG } from '@/lib/rag/processor';

export async function POST(
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
      return NextResponse.json({ error: 'ไม่พบเอกสารที่ระบุ' }, { status: 404 });
    }

    const relativePath = document.fileUrl.replace('/uploads/', '').replace('/upload/', '');
    let filePath = path.join(process.cwd(), 'uploads', relativePath);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(process.cwd(), 'upload', relativePath);
    }
    const pdfBuffer = await fs.readFile(filePath);

    const result = await processDocumentRAG(documentId, pdfBuffer);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'เกิดข้อผิดพลาดในการประมวลผล RAG' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'ประมวลผลเอกสารสำเร็จ',
      document: result.document,
      chunksProcessed: result.chunksProcessed,
      pagesProcessed: result.pagesProcessed,
    });
  } catch (error: any) {
    console.error('Manual RAG Processing Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล RAG' },
      { status: 500 }
    );
  }
}
