import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Serves the Self-Guided Member Guide PDF.
 *
 * Place the PDF file at:
 *   /public/documents/self-guided-guide.pdf
 *
 * Until the file is added, this route returns a 404 with instructions.
 */
export async function GET() {
  const pdfPath = path.join(process.cwd(), 'public', 'documents', 'self-guided-guide.pdf');

  if (!fs.existsSync(pdfPath)) {
    return NextResponse.json(
      {
        error: 'PDF not found',
        instructions:
          'Place the Self-Guided Member Guide PDF at /public/documents/self-guided-guide.pdf. ' +
          'The file will then be served here and attached to first-login emails automatically.',
      },
      { status: 404 },
    );
  }

  const buffer = fs.readFileSync(pdfPath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Divergent-Self-Guided-Guide.pdf"',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
