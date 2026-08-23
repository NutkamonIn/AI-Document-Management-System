import { generateGeminiEmbedding } from './gemini';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

export async function generateEmbedding(text: string): Promise<number[]> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateGeminiEmbedding(text);
    } catch {}
  }

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        prompt: text,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.embedding;
    }
  } catch {}

  return generatePureJsEmbedding(text, 768);
}

function generatePureJsEmbedding(text: string, dimensions: number = 768): number[] {
  const vector = new Array(dimensions).fill(0);
  const normalizedText = text.toLowerCase().trim();

  for (let len = 1; len <= 3; len++) {
    for (let i = 0; i <= normalizedText.length - len; i++) {
      const ngram = normalizedText.slice(i, i + len);
      let hash = 0;
      for (let j = 0; j < ngram.length; j++) {
        hash = (hash << 5) - hash + ngram.charCodeAt(j);
        hash |= 0;
      }
      const index = Math.abs(hash) % dimensions;
      vector[index] += len;
    }
  }

  let sumSquares = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSquares += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSquares) || 1;
  for (let i = 0; i < dimensions; i++) {
    vector[i] = vector[i] / norm;
  }

  return vector;
}
