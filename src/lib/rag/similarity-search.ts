import { prisma } from '@/lib/prisma';
import { generateEmbedding } from './embedding';

export interface SearchResultChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber: number;
  similarity: number;
}

export async function findRelevantChunks(
  userQuery: string,
  ownerId: string,
  topK: number = 4,
  selectedDocumentIds?: string[]
): Promise<SearchResultChunk[]> {
  try {
    const queryEmbedding = await generateEmbedding(userQuery);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    let docFilterClause = '';
    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      const escapedIds = selectedDocumentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
      docFilterClause = `AND d."id" IN (${escapedIds})`;
    }

    const results = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         dc."id",
         dc."documentId",
         d."name" as "documentName",
         dc."content",
         dc."pageNumber",
         1 - (dc."embedding" <=> $1::vector) as similarity
       FROM "DocumentChunk" dc
       JOIN "Document" d ON dc."documentId" = d."id"
       WHERE d."ownerId" = $2 AND d."status" = 'COMPLETED' ${docFilterClause}
       ORDER BY dc."embedding" <=> $1::vector ASC
       LIMIT $3`,
      vectorString,
      ownerId,
      topK
    );

    return results.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      documentName: row.documentName,
      content: row.content,
      pageNumber: Number(row.pageNumber),
      similarity: Number(row.similarity),
    }));
  } catch (error) {
    console.error('Vector Similarity Search Error:', error);
    return [];
  }
}
