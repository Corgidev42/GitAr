import { NextResponse } from 'next/server';
import { readDatabase } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  return NextResponse.json(db);
}
