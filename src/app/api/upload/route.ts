import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const lessonId = formData.get('lessonId') as string;
  const fileType = formData.get('type') as 'tab' | 'audio';

  if (!lessonId || !fileType) {
    return NextResponse.json({ error: 'Missing lessonId or type' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
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
