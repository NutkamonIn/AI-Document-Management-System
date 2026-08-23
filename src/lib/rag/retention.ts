import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export const RETENTION_DAYS = 2;

export async function cleanupExpiredDocuments() {
  try {
    const expirationThreshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const expiredDocs = await prisma.document.findMany({
      where: {
        createdAt: {
          lt: expirationThreshold,
        },
      },
    });

    if (expiredDocs.length === 0) return 0;

    let deletedCount = 0;
    for (const doc of expiredDocs) {
      const rawPath = doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl;
      const decodedPath = decodeURIComponent(rawPath);
      const fileName = path.basename(decodedPath);

      const possiblePaths = [
        path.join(process.cwd(), decodedPath),
        path.join(process.cwd(), 'uploads', fileName),
      ];

      for (const p of possiblePaths) {
        try {
          await fs.access(p);
          await fs.unlink(p);
        } catch {}
      }

      await prisma.document.delete({
        where: { id: doc.id },
      });

      deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    console.error('Cleanup Expired Documents Error:', error);
    return 0;
  }
}

export function getRemainingHoursText(createdAtStr: string): string {
  const createdDate = new Date(createdAtStr);
  const expiryDate = new Date(createdDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'หมดอายุแล้ว';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `เหลืออีก ${days} วัน ${remHours} ชม.`;
  }

  return `เหลืออีก ${hours} ชม. ${minutes} นาที`;
}
