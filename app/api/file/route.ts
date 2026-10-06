import { NextResponse } from 'next/server';
import { fetchFile } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const { repository, path } = await request.json();
    if (!repository || typeof path !== 'string') throw new Error('A repository and file path are required.');
    return NextResponse.json(await fetchFile(repository, path));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File loading failed.' }, { status: 400 });
  }
}
