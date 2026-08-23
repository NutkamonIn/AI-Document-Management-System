export interface TextChunk {
  content: string;
  pageNumber: number;
}

export function recursiveChunkText(
  text: string,
  pageNumber: number,
  chunkSize: number = 500,
  overlap: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let startIndex = 0;

  const cleanedText = text.replace(/\s+/g, ' ').trim();

  if (cleanedText.length === 0) return [];

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanedText.length) {
      const lastSpaceIndex = cleanedText.lastIndexOf(' ', endIndex);
      if (lastSpaceIndex > startIndex) {
        endIndex = lastSpaceIndex;
      }
    }

    const chunkContent = cleanedText.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        pageNumber,
      });
    }

    startIndex = endIndex - overlap;
    if (startIndex >= cleanedText.length || endIndex >= cleanedText.length) {
      break;
    }
  }

  return chunks;
}