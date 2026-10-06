import { NextResponse } from 'next/server';
import { evaluateMission } from '@/lib/quest';
export async function POST(request: Request) { try { const { mission, answer, files } = await request.json(); if (!mission || !answer || !files) throw new Error('A mission, answer, and code evidence are required.'); return NextResponse.json(await evaluateMission(mission, answer, files)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Evaluation failed.' }, { status: 400 }); } }
