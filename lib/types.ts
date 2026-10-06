export type Reference = { path: string; lines?: string; note: string };
export type SourceFile = { path: string; content: string };
export type Repository = { owner: string; repo: string; branch: string };
export type Mission = {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prompt: string;
  hint: string;
  options: string[];
  correctAnswer: string;
  references: Reference[];
  concepts: string[];
  feedback?: { correct: boolean; summary: string; points: string[]; references: Reference[] };
};
export type Quest = { name: string; language: string; summary: string; repository: Repository; tree: string[]; files: SourceFile[]; missions: Mission[] };
