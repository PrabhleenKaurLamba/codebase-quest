import { NextResponse } from 'next/server';
import { fetchRepository } from '@/lib/github';
import { makeQuest } from '@/lib/quest';
export async function POST(request: Request) { try { const { url } = await request.json(); const repo = await fetchRepository(url); return NextResponse.json(await makeQuest(repo.name, repo.repository, repo.tree, repo.files)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis failed.' }, { status: 400 }); } }
