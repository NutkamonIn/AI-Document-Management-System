import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return new NextResponse('Missing image ID', { status: 400 });
    }

    let dataUrl: string | null = null;
    const prismaAny = prisma as any;

    // 1. ดึงด้วย Raw SQL Query ตรงจาก Neon Database ป้องกัน Prisma Client Cache ล้มเหลว 100%
    try {
      const rows = await prismaAny.$queryRawUnsafe(
        'SELECT "dataUrl" FROM "DocumentImage" WHERE "id" = $1 LIMIT 1',
        id
      );
      if (Array.isArray(rows) && rows.length > 0 && rows[0].dataUrl) {
        dataUrl = rows[0].dataUrl;
      }
    } catch {}

    // 2. Fallback ดึงด้วย Prisma Client Model หาก Raw SQL ยังไม่ไดัผล
    if (!dataUrl && prismaAny.documentImage && typeof prismaAny.documentImage.findUnique === 'function') {
      try {
        const imageRecord = await prismaAny.documentImage.findUnique({
          where: { id },
        });
        if (imageRecord?.dataUrl) {
          dataUrl = imageRecord.dataUrl;
        }
      } catch {}
    }

    if (!dataUrl) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.*)$/);
    if (!matches) {
      return new NextResponse('Invalid image format', { status: 500 });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Fetch Document Image Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
