import { prisma } from '@/lib/prisma';
import { generateEmbedding } from './embedding';
import { TextChunk } from './chunker';

export async function processAndSaveChunks(
  documentId: string,
  chunks: TextChunk[]
) {
  await prisma.$executeRawUnsafe(
    'DELETE FROM "DocumentChunk" WHERE "documentId" = $1',
    documentId
  );

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);
    const vectorString = `[${embedding.join(',')}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" ("id", "documentId", "content", "pageNumber", "embedding", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
      documentId,
      chunk.content,
      chunk.pageNumber,
      vectorString
    );
  }
}
