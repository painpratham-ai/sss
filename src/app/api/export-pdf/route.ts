// POST /api/export-pdf — Server-side PDF generation for school-ready project workbook
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - jsPDF import for server-side
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ExportRequest {
  topic: string;
  subject: string;
  className: string;
  board: string;
  outline: any;
  finalOutput: string;
  images?: { prompt: string; path: string; caption: string }[];
  studentName?: string;
  schoolName?: string;
  teacherName?: string;
}

// Constants for layout
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 7;
const HEADING_HEIGHT = 10;

function addPageNumber(doc: jsPDF, pageNum: number) {
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`— ${pageNum} —`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function addDecorativeBorder(doc: jsPDF) {
  // Outer border
  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, PAGE_WIDTH - 20, PAGE_HEIGHT - 20);
  // Inner border
  doc.setDrawColor(100, 140, 200);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, PAGE_WIDTH - 26, PAGE_HEIGHT - 26);
}

function addCoverPage(doc: jsPDF, data: ExportRequest) {
  addDecorativeBorder(doc);

  // School name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName || 'School Name', PAGE_WIDTH / 2, 50, { align: 'center' });

  // Board badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.board} Board`, PAGE_WIDTH / 2, 62, { align: 'center' });

  // Decorative line
  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(1);
  doc.line(50, 72, PAGE_WIDTH - 50, 72);

  // Subject
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.subject}`, PAGE_WIDTH / 2, 95, { align: 'center' });

  // Project title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.topic, CONTENT_WIDTH - 20);
  doc.text(titleLines, PAGE_WIDTH / 2, 120, { align: 'center' });

  // Another decorative line
  doc.setDrawColor(30, 64, 120);
  doc.line(50, 145, PAGE_WIDTH - 50, 145);

  // Student info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const infoY = 170;
  doc.text(`Name: ${data.studentName || '________________________'}`, PAGE_WIDTH / 2, infoY, { align: 'center' });
  doc.text(`Class: ${data.className}`, PAGE_WIDTH / 2, infoY + 12, { align: 'center' });
  doc.text(`Subject: ${data.subject}`, PAGE_WIDTH / 2, infoY + 24, { align: 'center' });
  doc.text(`Teacher: ${data.teacherName || '________________________'}`, PAGE_WIDTH / 2, infoY + 36, { align: 'center' });

  // Year
  doc.setFontSize(11);
  doc.text(`Academic Year ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, PAGE_WIDTH / 2, 240, { align: 'center' });
}

function addCertificatePage(doc: jsPDF, data: ExportRequest) {
  doc.addPage();
  addDecorativeBorder(doc);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE', PAGE_WIDTH / 2, 50, { align: 'center' });

  doc.setDrawColor(30, 64, 120);
  doc.line(70, 56, PAGE_WIDTH - 70, 56);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  const certText = `This is to certify that ${data.studentName || '________________'}, ` +
    `a student of Class ${data.className}, has successfully completed the ${data.subject} project ` +
    `on the topic "${data.topic}" under my guidance and supervision. ` +
    `This project is a bonafide work carried out as per the ${data.board} Board guidelines ` +
    `for the academic year ${new Date().getFullYear()}-${new Date().getFullYear() + 1}.`;

  const certLines = doc.splitTextToSize(certText, CONTENT_WIDTH - 20);
  doc.text(certLines, MARGIN_LEFT + 10, 80);

  // Signature area
  doc.text('Teacher\'s Signature: _______________', MARGIN_LEFT + 10, 160);
  doc.text('Date: _______________', MARGIN_LEFT + 10, 175);
  doc.text('Principal\'s Signature: _______________', PAGE_WIDTH - MARGIN_RIGHT - 80, 160);
  doc.text('School Seal', PAGE_WIDTH - MARGIN_RIGHT - 50, 175);

  addPageNumber(doc, 2);
}

function addAcknowledgementPage(doc: jsPDF, data: ExportRequest) {
  doc.addPage();
  addDecorativeBorder(doc);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ACKNOWLEDGEMENT', PAGE_WIDTH / 2, 50, { align: 'center' });

  doc.setDrawColor(30, 64, 120);
  doc.line(60, 56, PAGE_WIDTH - 60, 56);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  const ackText = `I would like to express my sincere gratitude to my ${data.subject} teacher ` +
    `${data.teacherName || '________________'} for their invaluable guidance and support throughout ` +
    `the completion of this project on "${data.topic}". Their expertise and encouragement helped me ` +
    `understand the subject matter deeply.\n\n` +
    `I am also thankful to our Principal for providing the necessary resources and a conducive ` +
    `learning environment at ${data.schoolName || 'our school'}.\n\n` +
    `I extend my gratitude to my parents for their constant support and motivation. ` +
    `I also thank my classmates for their helpful discussions and suggestions.\n\n` +
    `Finally, I acknowledge the use of various textbooks, reference materials, and online resources ` +
    `that were instrumental in completing this project.`;

  const ackLines = doc.splitTextToSize(ackText, CONTENT_WIDTH - 20);
  doc.text(ackLines, MARGIN_LEFT + 10, 80);

  doc.text(`${data.studentName || '________________'}`, PAGE_WIDTH - MARGIN_RIGHT - 40, 200, { align: 'center' });
  doc.text(`Class ${data.className}`, PAGE_WIDTH - MARGIN_RIGHT - 40, 212, { align: 'center' });

  addPageNumber(doc, 3);
}

function addIndexPage(doc: jsPDF, data: ExportRequest) {
  doc.addPage();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLE OF CONTENTS', PAGE_WIDTH / 2, MARGIN_TOP + 10, { align: 'center' });

  doc.setDrawColor(30, 64, 120);
  doc.line(50, MARGIN_TOP + 16, PAGE_WIDTH - 50, MARGIN_TOP + 16);

  const sections = data.outline?.sections || [];
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let y = MARGIN_TOP + 32;
  const startPage = 5; // Content starts at page 5

  // Add header row
  doc.setFont('helvetica', 'bold');
  doc.text('Sr.', MARGIN_LEFT, y);
  doc.text('Topic', MARGIN_LEFT + 15, y);
  doc.text('Page', PAGE_WIDTH - MARGIN_RIGHT - 5, y, { align: 'right' });
  y += 3;
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');

  sections.forEach((sec: any, i: number) => {
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 10) {
      doc.addPage();
      y = MARGIN_TOP;
    }
    const label = `${i + 1}.`;
    const name = sec.name || `Section ${i + 1}`;
    const pageNum = `${startPage + i}`;

    doc.text(label, MARGIN_LEFT, y);
    const nameLines = doc.splitTextToSize(name, CONTENT_WIDTH - 40);
    doc.text(nameLines[0], MARGIN_LEFT + 15, y);
    doc.text(pageNum, PAGE_WIDTH - MARGIN_RIGHT - 5, y, { align: 'right' });

    // Dotted line
    doc.setLineDashPattern([1, 1], 0);
    const textWidth = doc.getTextWidth(nameLines[0]);
    doc.line(MARGIN_LEFT + 15 + textWidth + 2, y, PAGE_WIDTH - MARGIN_RIGHT - doc.getTextWidth(pageNum) - 7, y);
    doc.setLineDashPattern([], 0);

    y += LINE_HEIGHT;
  });

  addPageNumber(doc, 4);
}

function renderMarkdownContent(doc: jsPDF, text: string, startY: number, pageNum: { current: number }): number {
  let y = startY;

  // Split into lines and process
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 3; // Empty line spacing
      continue;
    }

    // Check for local generated image markdown
    if (trimmed.startsWith('![') && trimmed.includes('](')) {
      const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const caption = match[1];
        const imgPath = match[2];
        const cleanPath = imgPath.startsWith('/') ? imgPath : '/' + imgPath;
        const localPath = path.join(process.cwd(), 'public', cleanPath.split('?')[0]);

        if (fs.existsSync(localPath)) {
          try {
            const imgBuffer = fs.readFileSync(localPath);
            const imgHeight = 65; // mm
            const spacing = 10;

            if (y + imgHeight + spacing > PAGE_HEIGHT - MARGIN_BOTTOM) {
              addPageNumber(doc, pageNum.current);
              doc.addPage();
              pageNum.current++;
              y = MARGIN_TOP;
            }

            const imgWidth = 100; // mm
            const imgX = (PAGE_WIDTH - imgWidth) / 2;
            const base64Data = `data:image/png;base64,${imgBuffer.toString('base64')}`;
            doc.addImage(base64Data, 'PNG', imgX, y, imgWidth, imgHeight);
            y += imgHeight + 4;

            // Draw caption below image
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text(caption, PAGE_WIDTH / 2, y, { align: 'center' });
            y += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
          } catch (imgErr) {
            console.error('Failed to embed image in PDF:', imgErr);
          }
          continue;
        }
      }
    }

    // Check for page break needed
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 15) {
      addPageNumber(doc, pageNum.current);
      doc.addPage();
      pageNum.current++;
      y = MARGIN_TOP;
    }

    // Heading ## 
    if (trimmed.startsWith('## ')) {
      y += 4;
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 55, 100);
      const headingText = trimmed.replace(/^##\s*/, '');
      const headingLines = doc.splitTextToSize(headingText, CONTENT_WIDTH);
      doc.text(headingLines, MARGIN_LEFT, y);
      y += headingLines.length * HEADING_HEIGHT;
      // Underline
      doc.setDrawColor(25, 55, 100);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, y - 2, MARGIN_LEFT + Math.min(doc.getTextWidth(headingLines[0]), CONTENT_WIDTH), y - 2);
      y += 4;
      doc.setTextColor(0, 0, 0);
      continue;
    }

    // Sub-heading ###
    if (trimmed.startsWith('### ')) {
      y += 3;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 80, 130);
      const subText = trimmed.replace(/^###\s*/, '');
      const subLines = doc.splitTextToSize(subText, CONTENT_WIDTH);
      doc.text(subLines, MARGIN_LEFT, y);
      y += subLines.length * 8;
      y += 2;
      doc.setTextColor(0, 0, 0);
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const bulletText = trimmed.replace(/^[-*]\s*/, '');
      // Remove markdown bold/italic
      const cleanText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      const bulletLines = doc.splitTextToSize(`•  ${cleanText}`, CONTENT_WIDTH - 10);
      for (const bLine of bulletLines) {
        if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 10) {
          addPageNumber(doc, pageNum.current);
          doc.addPage();
          pageNum.current++;
          y = MARGIN_TOP;
        }
        doc.text(bLine, MARGIN_LEFT + 5, y);
        y += LINE_HEIGHT;
      }
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const cleanText = numberedMatch[2].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      const numLines = doc.splitTextToSize(`${numberedMatch[1]}. ${cleanText}`, CONTENT_WIDTH - 10);
      for (const nLine of numLines) {
        if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 10) {
          addPageNumber(doc, pageNum.current);
          doc.addPage();
          pageNum.current++;
          y = MARGIN_TOP;
        }
        doc.text(nLine, MARGIN_LEFT + 5, y);
        y += LINE_HEIGHT;
      }
      continue;
    }

    // Regular paragraph text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    // Strip markdown formatting
    const cleanLine = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '[Image]')
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1');

    const paraLines = doc.splitTextToSize(cleanLine, CONTENT_WIDTH);
    for (const pLine of paraLines) {
      if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 10) {
        addPageNumber(doc, pageNum.current);
        doc.addPage();
        pageNum.current++;
        y = MARGIN_TOP;
      }
      doc.text(pLine, MARGIN_LEFT, y);
      y += LINE_HEIGHT;
    }
  }

  return y;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as ExportRequest;

    if (!data.finalOutput) {
      return NextResponse.json({ error: 'No content to export' }, { status: 400 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page 1: Cover Page
    addCoverPage(doc, data);

    // Page 2: Certificate
    addCertificatePage(doc, data);

    // Page 3: Acknowledgement
    addAcknowledgementPage(doc, data);

    // Page 4: Table of Contents
    addIndexPage(doc, data);

    // Pages 5+: Content
    doc.addPage();
    const pageNum = { current: 5 };

    renderMarkdownContent(doc, data.finalOutput, MARGIN_TOP, pageNum);
    addPageNumber(doc, pageNum.current);

    // Final page: Bibliography placeholder
    doc.addPage();
    pageNum.current++;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 55, 100);
    doc.text('BIBLIOGRAPHY', PAGE_WIDTH / 2, MARGIN_TOP + 10, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const biblioText = [
      `1. ${data.board} Board Prescribed Textbook for ${data.subject}, Class ${data.className}`,
      `2. Reference materials and study guides for ${data.topic}`,
      `3. Online educational resources and scholarly articles`,
      `4. National Council of Educational Research and Training (NCERT) publications`,
      `5. Various internet sources for supplementary information and diagrams`,
    ];
    let bibY = MARGIN_TOP + 28;
    for (const ref of biblioText) {
      const refLines = doc.splitTextToSize(ref, CONTENT_WIDTH);
      doc.text(refLines, MARGIN_LEFT, bibY);
      bibY += refLines.length * LINE_HEIGHT + 3;
    }
    addPageNumber(doc, pageNum.current);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return as downloadable PDF
    const filename = `${data.topic.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_Project.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('PDF export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
