// Serve uploaded files from data/uploads/
// e.g. /api/uploads/my-headshot.png

import { readFileSync, realpathSync } from 'fs';
import { join, extname, resolve } from 'path';

const UPLOAD_DIR = resolve(process.cwd(), 'data', 'uploads');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Only UUID-generated filenames are valid (uuid + extension)
const SAFE_FILENAME = /^[a-f0-9\-]{36}\.(png|jpg|jpeg|gif|webp)$/;

export function GET(request, { params }) {
  try {
    const filename = params.filename;
    if (!filename || !SAFE_FILENAME.test(filename)) {
      return new Response('Not found', { status: 404 });
    }
    const filePath = join(UPLOAD_DIR, filename);
    // Resolve symlinks and verify we're still inside UPLOAD_DIR
    let realPath;
    try { realPath = realpathSync(filePath); } catch { return new Response('Not found', { status: 404 }); }
    if (!realPath.startsWith(UPLOAD_DIR)) {
      return new Response('Not found', { status: 404 });
    }
    const ext = extname(filename).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const data = readFileSync(realPath);
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}
