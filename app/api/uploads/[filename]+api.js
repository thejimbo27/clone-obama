// Serve uploaded files from data/uploads/
// e.g. /api/uploads/my-headshot.png

import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export function GET(request, { params }) {
  try {
    const filename = params.filename;
    // Sanitize — no path traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return new Response('Not found', { status: 404 });
    }
    const filePath = join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    const ext = extname(filename).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const data = readFileSync(filePath);
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
