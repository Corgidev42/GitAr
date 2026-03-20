import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileType = formData.get('type') as 'tab' | 'audio' | 'technique';

  if (!fileType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (fileType === 'technique') {
    const techniqueKey = (formData.get('techniqueKey') as string)?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 64) || 'technique';
    const uploadedPaths: string[] = [];
    const destDir = path.join(process.cwd(), 'public', 'assets', 'techniques');
    fs.mkdirSync(destDir, { recursive: true });

    for (const file of files) {
      let mime = file.type || '';
      if (!mime && /\.(jpe?g)$/i.test(file.name)) mime = 'image/jpeg';
      else if (!mime && /\.png$/i.test(file.name)) mime = 'image/png';
      else if (!mime && /\.gif$/i.test(file.name)) mime = 'image/gif';
      else if (!mime && /\.webp$/i.test(file.name)) mime = 'image/webp';
      else if (!mime && /\.svg$/i.test(file.name)) mime = 'image/svg+xml';
      if (!IMAGE_TYPES.has(mime)) {
        return NextResponse.json({ error: `Type non supporté : ${mime || 'inconnu'} (JPEG, PNG, GIF, WebP, SVG)` }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, '') || '.png';
      const safeExt = ext.length <= 8 ? ext : '.png';
      const safeName = `${techniqueKey}_${Date.now()}${safeExt}`;
      fs.writeFileSync(path.join(destDir, safeName), buffer);
      uploadedPaths.push(`/assets/techniques/${safeName}`);
    }

    return NextResponse.json({ paths: uploadedPaths });
  }

  const lessonId = formData.get('lessonId') as string;
  if (!lessonId) {
    return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
  }

  const uploadedPaths: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    let destDir: string;
    let publicPath: string;

    if (fileType === 'tab') {
      destDir = path.join(process.cwd(), 'public', 'assets', 'tabs');
      const fileName = `${lessonId}_${safeName}`;
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, fileName), buffer);
      publicPath = `/assets/tabs/${fileName}`;
    } else {
      destDir = path.join(process.cwd(), 'public', 'assets', 'audio', lessonId);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, safeName), buffer);
      publicPath = `/assets/audio/${lessonId}/${safeName}`;
    }

    uploadedPaths.push(publicPath);
  }

  return NextResponse.json({ paths: uploadedPaths });
}
