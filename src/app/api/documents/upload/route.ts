import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { processDocumentRAG } from '@/lib/rag/processor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // สร้างข้อมูลเอกสารใน PostgreSQL DB (โดยไม่ต้องบันทึกไฟล์ PDF ลงดิสก์ในเครื่อง)
    const document = await prisma.document.create({
      data: {
        name: file.name,
        fileUrl: `cloud-rag://${Date.now()}_${file.name}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'PENDING',
        ownerId: session.user.id,
      },
    });

    // ประมวลผล RAG สกัดข้อความและ Vector Embeddings ขึ้น Neon Cloud DB โดยตรงจาก Buffer ในหน่วยความจำ (In-Memory)
    processDocumentRAG(document.id, buffer).catch((err) => {
      console.error(`Auto-RAG Background Process Error for ${document.id}:`, err);
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร' }, { status: 500 });
  }
}