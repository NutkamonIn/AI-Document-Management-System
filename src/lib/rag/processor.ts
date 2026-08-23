import { prisma } from '@/lib/prisma';
import { recursiveChunkText, TextChunk } from '@/lib/rag/chunker';
import { processAndSaveChunks } from '@/lib/rag/vector-store';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import zlib from 'zlib';
import sharp from 'sharp';
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function extractImagesFromDict(
  pdfDoc: any,
  dict: PDFDict,
  documentId: string,
  pageNumber: number,
  imageUrlsOnPage: string[]
) {
  if (!dict || typeof dict.get !== 'function') return;

  const xObjectsRef = dict.get(PDFName.of('XObject'));
  if (!xObjectsRef) return;

  const xObjects = pdfDoc.context.lookup(xObjectsRef) as PDFDict;
  if (!xObjects || typeof xObjects.entries !== 'function') return;

  const prismaDocImg = (prisma as any).documentImage;

  for (const [, refOrObject] of xObjects.entries()) {
    try {
      const xObject = pdfDoc.context.lookup(refOrObject) as any;
      if (!xObject) continue;

      const objDict = xObject.dict || (typeof xObject.get === 'function' ? xObject : null);
      if (!objDict || typeof objDict.get !== 'function') continue;

      const subtype = objDict.get(PDFName.of('Subtype'));

      if (subtype === PDFName.of('Image')) {
        const contents = typeof xObject.getContents === 'function' ? xObject.getContents() : null;
        if (contents && contents.length > 500) {
          let finalBuffer: Buffer | null = null;
          let mimeType = 'image/jpeg';

          // 1. DCTDecode: Standard JPEG file format
          if (contents[0] === 0xff && contents[1] === 0xd8) {
            finalBuffer = Buffer.from(contents);
            mimeType = 'image/jpeg';
          }
          // 2. FlateDecode or Zlib deflated raw bitmap stream
          else if (contents[0] === 0x78 && contents[1] === 0x9c) {
            try {
              const unzipped = zlib.inflateSync(Buffer.from(contents));
              const widthObj = pdfDoc.context.lookup(objDict.get(PDFName.of('Width'))) as any;
              const heightObj = pdfDoc.context.lookup(objDict.get(PDFName.of('Height'))) as any;
              const width = widthObj?.numberValue || widthObj?.value || widthObj;
              const height = heightObj?.numberValue || heightObj?.value || heightObj;

              if (width && height && typeof width === 'number' && typeof height === 'number') {
                let channels = 3;
                if (unzipped.length === width * height * 4) channels = 4;
                else if (unzipped.length === width * height * 1) channels = 1;
                else if (unzipped.length === width * height * 3) channels = 3;

                finalBuffer = await sharp(unzipped, {
                  raw: { width, height, channels: channels as any },
                })
                  .png()
                  .toBuffer();
                mimeType = 'image/png';
              }
            } catch (err) {
              console.error('Failed to convert flate stream:', err);
            }
          }

          if (finalBuffer && finalBuffer.length > 500) {
            const base64 = finalBuffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;

            if (prismaDocImg && typeof prismaDocImg.create === 'function') {
              const savedImage = await prismaDocImg.create({
                data: {
                  documentId,
                  pageNumber,
                  dataUrl,
                },
              });
              imageUrlsOnPage.push(`/api/documents/images/${savedImage.id}`);
            }
          }
        }
      } else if (subtype === PDFName.of('Form')) {
        const formResourcesRef = objDict.get(PDFName.of('Resources'));
        if (formResourcesRef) {
          const formResources = pdfDoc.context.lookup(formResourcesRef) as PDFDict;
          await extractImagesFromDict(pdfDoc, formResources, documentId, pageNumber, imageUrlsOnPage);
        }
      }
    } catch {}
  }
}

async function extractAndSavePdfImages(documentId: string, pdfBuffer: Buffer): Promise<Map<number, string[]>> {
  const pageImageUrlsMap = new Map<number, string[]>();

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const pageNumber = pageIdx + 1;
      const imageUrlsOnPage: string[] = [];

      try {
        const pageNode = page.node as any;
        const resourcesRef = typeof pageNode.Resources === 'function' ? pageNode.Resources() : pageNode.Resources;
        if (resourcesRef) {
          const resources = pdfDoc.context.lookup(resourcesRef) as PDFDict;
          await extractImagesFromDict(pdfDoc, resources, documentId, pageNumber, imageUrlsOnPage);
        }

        if (imageUrlsOnPage.length > 0) {
          pageImageUrlsMap.set(pageNumber, imageUrlsOnPage);
        }
      } catch {}
    }
  } catch (err) {
    console.error(`Failed to extract images for doc ${documentId}:`, err);
  }

  return pageImageUrlsMap;
}

export async function processDocumentRAG(documentId: string, pdfBuffer: Buffer) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    const prismaDocImg = (prisma as any).documentImage;
    if (prismaDocImg && typeof prismaDocImg.deleteMany === 'function') {
      await prismaDocImg.deleteMany({
        where: { documentId },
      });
    }

    // 1. สกัดภาพประกอบออกจาก PDF อย่างปลอดภัยพร้อมแปลงเป็น PNG/JPEG สมบูรณ์
    const pageImageUrlsMap = await extractAndSavePdfImages(documentId, pdfBuffer);

    // 2. สกัดเนื้อหาข้อความจาก PDF
    const parseFunc = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
    const pageTexts: { pageNumber: number; text: string }[] = [];

    const options = {
      pagerender: function (pageData: any) {
        return pageData.getTextContent().then(function (textContent: any) {
          let text = '';
          for (const item of textContent.items) {
            text += item.str + ' ';
          }
          pageTexts.push({
            pageNumber: pageData.pageIndex + 1,
            text: text,
          });
          return text;
        });
      },
    };

    const pdfData = await parseFunc(pdfBuffer, options);

    const allChunks: TextChunk[] = [];
    if (pageTexts.length > 0) {
      for (const page of pageTexts) {
        let textWithImages = page.text;
        const imagesOnPage = pageImageUrlsMap.get(page.pageNumber);
        if (imagesOnPage && imagesOnPage.length > 0) {
          const imageMarkdownTags = imagesOnPage
            .map((url, idx) => `\n![ภาพประกอบ หน้า ${page.pageNumber} (${idx + 1})](${url})\n`)
            .join(' ');
          textWithImages += `\n\n[ภาพประกอบในหน้า ${page.pageNumber}: ${imageMarkdownTags}]`;
        }

        if (textWithImages.trim().length > 0) {
          const pageChunks = recursiveChunkText(textWithImages, page.pageNumber);
          allChunks.push(...pageChunks);
        }
      }
    } else if (pdfData.text && pdfData.text.trim().length > 0) {
      allChunks.push(...recursiveChunkText(pdfData.text, 1));
    }

    if (allChunks.length === 0) {
      throw new Error('ไม่พบข้อความในไฟล์ PDF');
    }

    await processAndSaveChunks(documentId, allChunks);

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED' },
    });

    return {
      success: true,
      document: updatedDocument,
      chunksProcessed: allChunks.length,
      pagesProcessed: pageTexts.length || pdfData.numpages,
    };
  } catch (error: any) {
    console.error(`RAG Processing Error for doc ${documentId}:`, error);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', errorMessage: error.message },
    });

    return {
      success: false,
      error: error.message,
    };
  }
}
