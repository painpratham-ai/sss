// POST /api/upload — accepts a PDF, extracts text using pdf-parse, stores Upload record
import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';
    let fileType = file.type || 'application/octet-stream';

    // Auto-detect image mimetype if not populated
    if (fileType === 'application/octet-stream' || !fileType) {
      if (file.name.toLowerCase().endsWith('.png')) fileType = 'image/png';
      else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) fileType = 'image/jpeg';
      else if (file.name.toLowerCase().endsWith('.webp')) fileType = 'image/webp';
      else if (file.name.toLowerCase().endsWith('.gif')) fileType = 'image/gif';
    }

    if (file.name.toLowerCase().endsWith('.pdf') || fileType === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();
        extractedText = result.text || '';
      } catch (e: any) {
        // PDF might be image-only; fall back to text placeholder
        extractedText = `[PDF parsing failed: ${e.message}. Treat as scanned document — OCR not configured.]`;
      }
    } else if (fileType.startsWith('image/')) {
      try {
        const base64Image = buffer.toString('base64');
        const imageUrl = `data:${fileType};base64,${base64Image}`;
        const { callModel } = require('@/lib/models');
        const response = await callModel({
          preferredModel: 'llama_vision',
          question: 'Extract all text, formulas, equations, tables, and diagrams from this image. Output the transcript in clean markdown. For math formulas, use LaTeX format (e.g. $...$ or $$...$$). Describe diagrams or charts in text or Mermaid syntax if applicable.',
          hasImage: true,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text, formulas, equations, tables, and diagrams from this image. Output the transcript in clean markdown. For math formulas, use LaTeX format (e.g. $...$ or $$...$$). Describe diagrams or charts in text or Mermaid syntax if applicable.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ]
        });
        extractedText = response.content || '';
      } catch (err: any) {
        extractedText = `[OCR Extraction failed: ${err.message}]`;
      }
    } else if (fileType.startsWith('text/') || file.name.match(/\.(txt|md|csv)$/i)) {
      extractedText = buffer.toString('utf-8');
    } else {
      extractedText = `[Binary file ${file.name} uploaded — text extraction not available for this format.]`;
    }

    const upload = await db.upload.create({
      data: {
        filename: file.name,
        mimeType: fileType,
        size: file.size,
        extractedText
      }
    });

    return NextResponse.json({
      id: upload.id,
      filename: upload.filename,
      size: upload.size,
      extractedText,
      textLength: extractedText.length,
      preview: extractedText.slice(0, 500)
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
