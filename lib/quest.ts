import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { Mission, Quest, Repository, SourceFile } from './types';

const schema = z.object({ language: z.string(), summary: z.string(), missions: z.array(z.object({ title: z.string(), difficulty: z.enum(['Easy','Medium','Hard']), prompt: z.string(), hint: z.string(), options: z.array(z.string()).length(4), correctAnswer: z.string(), concepts: z.array(z.string()), references: z.array(z.object({ path: z.string(), lines: z.string(), note: z.string() })) })).min(4).max(7) });
const snippet = (files: SourceFile[]) => files.slice(0, 14).map(f => `FILE: ${f.path}\n${f.content.slice(0, 4500)}`).join('\n\n');
const missionPrompt = (files: SourceFile[]) => `You are creating an evidence-grounded codebase onboarding quest. Generate 5–7 escalating missions. Every reference path MUST exactly exist in the supplied files. Never claim unobserved facts. Label deductions as investigations.

Rules for each mission:
- "prompt" must be a direct question that helps a new engineer understand architecture, code flow, responsibility boundaries, business logic, or how multiple files interact.
- Favor questions about system structure, request flow, feature orchestration, module relationships, change impact, or debugging starting points.
- Do NOT ask trivia questions about syntax, component names, exact HTML tags, repo titles, or easy literal lookups like "What component wraps the children in RootLayout?"
- Start the question with words like "What", "Where", "Which", "How", or "Why" and end it with a question mark.
- The four option strings should be plausible but not obvious; each should represent realistic architectural interpretations rather than literal implementation details.
- Make the correct answer the most helpful interpretation for a new team member learning the codebase, not the most literal string match in the repo.
- Include exactly four answer choices in "options".
- Set "correctAnswer" to one of the four strings exactly as it appears in "options".
- "hint" must be a short supportive clue, not a second question.
- "title" should be brief and descriptive.
- Keep the mission focused on real code evidence from the repository supplied below.

${snippet(files)}`;
function language(files: SourceFile[]) { const p = files.map(f=>f.path).join(' '); if (/\.tsx?|\.jsx?/.test(p)) return 'JavaScript / TypeScript'; if (/\.py/.test(p)) return 'Python'; if (/\.go/.test(p)) return 'Go'; if (/\.rb/.test(p)) return 'Ruby'; return 'Mixed source'; }
function fallback(files: SourceFile[]): Omit<Quest,'name'|'repository'|'tree'|'files'> {
  const top = files.slice(0, 6);
  const entry = top.find(f => /(^|\/)(src\/)?(main|server)\./i.test(f.path) || /(^|\/)(app\/(layout|page)|pages\/_app|pages\/index)\./i.test(f.path) || (/(^|\/)index\./i.test(f.path) && !/(^|\/)(components|ui|tests?|__tests__|stories)(\/|$)/i.test(f.path))) || top[0];
  const config = top.find(f=>/package\.json|pyproject\.toml|go\.mod|cargo\.toml/i.test(f.path)) || top[1] || entry;
  const ref = (f: SourceFile, note: string) => ({ path:f.path, note });
  return { language: language(files), summary: 'A focused map built from the repository’s visible source and configuration files.', missions: [
    { title:'Locate the entry path', difficulty:'Easy', prompt:'Which part of the app is most likely establishing the primary user flow, and why would a new engineer start there?', hint:`Start with the top-level app shell and bootstrapping files such as ${entry.path}.`, options:['The app entry that defines the initial shell and user-facing route structure','The documentation page that explains the project','The package metadata that lists dependencies','The generated static assets folder'], correctAnswer:'The app entry that defines the initial shell and user-facing route structure', concepts:['entry point','startup'], references:[ref(entry,'Likely application entry')] },
    { title:'Trace the request lifecycle', difficulty:'Easy', prompt:'How does the codebase move from an initial route or screen into the actual feature logic a user depends on?', hint:`Inspect the app entry plus the route or API files that appear in the repo.`, options:['By starting at the app shell and then following the route or handler that delegates work to feature modules','By reading only the CSS because it describes the interface','By checking only external dependencies for clues','By jumping straight to static images because they show user experience'], correctAnswer:'By starting at the app shell and then following the route or handler that delegates work to feature modules', concepts:['request lifecycle','routing'], references:[ref(config,'Project configuration')] },
    { title:'Find the responsibility split', difficulty:'Medium', prompt:'Which layer in this codebase is most likely responsible for coordinating UI, business rules, and data access without becoming too coupled?', hint:'Look for the boundary where rendering, domain logic, and service calls meet.', options:['The orchestration layer where user-facing code delegates to business logic and data access','The stylesheet that controls layout and color','The lockfile that captures installed versions','The README that explains the repo at a high level'], correctAnswer:'The orchestration layer where user-facing code delegates to business logic and data access', concepts:['module boundary','data flow'], references:top.slice(0,2).map(f=>ref(f,'Follow this module’s imports')) },
    { title:'Map the change surface', difficulty:'Medium', prompt:'If a new feature or behavior needed to be added, which files would give a new engineer the clearest picture of the full impact before they touched code?', hint:'Trace the main models, handlers, and screens together before changing anything.', options:['The domain model, the request handlers, and the screens or components that consume that data','Only the tests because they define expected behavior','Only the generated output folder because it shows the final result','Only the config files because they are the source of truth'], correctAnswer:'The domain model, the request handlers, and the screens or components that consume that data', concepts:['domain model','change impact'], references:top.slice(0,3).map(f=>ref(f,'Potentially affected code')) },
    { title:'Spot the hot path', difficulty:'Hard', prompt:'If a feature started feeling slow or brittle, where would a new engineer look first to understand the likely bottleneck?', hint:'Focus on repeated work, downstream calls, and expensive operations in the core flow.', options:['The path where repeated work or external calls happen before the result is returned to the user','The static asset directory because it is usually the slowest part','The markdown docs because they explain release notes','The package lock because it tracks dependency versions'], correctAnswer:'The path where repeated work or external calls happen before the result is returned to the user', concepts:['performance','observability'], references:top.slice(0,4).map(f=>ref(f,'Search for I/O or hot paths')) }
  ] };
}
export async function makeQuest(name: string, repository: Repository, tree: string[], files: SourceFile[]): Promise<Quest> {
  const base = { name, repository, tree, files };
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error('AI Gateway is not configured. Add AI_GATEWAY_API_KEY to .env.local, then restart the development server.');
  try { const { object } = await generateObject({ model: 'openai/gpt-4o-mini', schema, prompt: missionPrompt(files) }); return { ...base, ...object }; }
  catch (error) { throw new Error(`AI Gateway could not generate this quest: ${error instanceof Error ? error.message : 'unknown Gateway error'}`); }
}
export async function evaluateMission(mission: Mission, answer: string, files: SourceFile[]) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (mission.options && mission.correctAnswer) {
    const selected = normalize(answer);
    const correctAnswer = mission.correctAnswer;
    const correct = mission.options.some(option => normalize(option) === selected && normalize(option) === normalize(correctAnswer));
    return {
      correct,
      summary: correct ? 'Correct — the evidence matches the best answer.' : `Not quite. The correct answer is "${correctAnswer}".`,
      points: correct ? ['Selected the correct answer from the options.'] : [`Correct answer: ${correctAnswer}`],
      references: mission.references.filter((r: { path: string }) => files.some(f => f.path === r.path))
    };
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error('AI Gateway is not configured. Add AI_GATEWAY_API_KEY to .env.local, then restart the development server.');
  try {
    const { text } = await generateText({ model: 'openai/gpt-4o-mini', prompt: `Evaluate this onboarding answer only against supplied source evidence. Return valid JSON with correct boolean, summary string, points string array (max 3), references array of {path,lines,note}. Be constructive and never invent paths.\nMISSION:${JSON.stringify(mission)}\nANSWER:${answer}\nFILES:\n${snippet(files)}` });
    const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(raw);
    return { correct: Boolean(parsed.correct), summary: String(parsed.summary || 'Evidence reviewed.'), points: Array.isArray(parsed.points) ? parsed.points.slice(0, 3) : [], references: (parsed.references || mission.references).filter((r: {path:string}) => files.some(f=>f.path===r.path)) };
  } catch (error) {
    throw new Error(`AI Gateway could not evaluate this answer: ${error instanceof Error ? error.message : 'unknown Gateway error'}`);
  }
}
