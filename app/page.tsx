'use client';

import { FormEvent, useState } from 'react';
import type { Quest } from '@/lib/types';

const demo = 'https://github.com/vercel/next.js';
const difficultyClass = (level: string) => level.toLowerCase();

export default function Home() {
  const [url, setUrl] = useState(''); const [quest, setQuest] = useState<Quest | null>(null);
  const [mission, setMission] = useState(0); const [file, setFile] = useState(''); const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<Quest['missions'][number]['feedback']>();
  const [loadedFiles, setLoadedFiles] = useState<Quest['files']>([]); const [fileLoading, setFileLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  async function analyze(repoUrl: string) {
    setLoading(true); setError('');
    try { const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: repoUrl }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setQuest(data); setLoadedFiles(data.files); setExpandedFolders(new Set()); setMission(0); setFile(data.files[0]?.path || ''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); } finally { setLoading(false); }
  }
  async function start(e: FormEvent) { e.preventDefault(); await analyze(url); }
  async function openFile(path: string) {
    if (!quest) return; setFile(path); if (loadedFiles.some(item => item.path === path)) return;
    setFileLoading(true);
    try { const res = await fetch('/api/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repository: quest.repository, path }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setLoadedFiles(current => [...current, data]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load that file.'); } finally { setFileLoading(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!quest || !answer.trim()) return; setLoading(true);
    try { const res = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission: quest.missions[mission], answer, files: quest.files }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setFeedback(data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Evaluation failed.'); } finally { setLoading(false); }
  }
  function resetQuest() {
    setQuest(null); setMission(0); setFile(''); setAnswer(''); setFeedback(undefined); setHint(false); setLoadedFiles([]); setError(''); setExpandedFolders(new Set()); setUrl('');
  }
  if (!quest) return <main className="landing"><nav><div className="brand"><i>◈</i> Codebase Quest</div><span>Evidence-based onboarding for engineers</span></nav><section className="hero"><div className="eyebrow">ENGINEERING ONBOARDING, REIMAGINED</div><h1>Learn a codebase by<br/><em>following the clues.</em></h1><p>Turn any public GitHub repository into a guided investigation. Complete missions, inspect real code, and build a mental model that lasts.</p><form onSubmit={start} className="repo-form"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a public GitHub repository URL" aria-label="GitHub repository URL"/><button disabled={loading}>{loading ? 'Mapping repository…' : 'Start your quest →'}</button></form><button type="button" className="demo" onClick={() => setUrl(demo)}>Try an example repository</button>{error && <div className="error">{error}</div>}<div className="steps"><span><b>01</b> Map the terrain</span><span><b>02</b> Investigate missions</span><span><b>03</b> Build your model</span></div></section></main>;
  const current = quest.missions[mission]; const source = loadedFiles.find(f => f.path === file);
  const folders = new Set<string>(); quest.tree.forEach(path => { const parts = path.split('/'); parts.slice(0, -1).forEach((_, index) => folders.add(parts.slice(0, index + 1).join('/'))); });
  const treeItems = [...new Set([...folders, ...quest.tree])].sort((a, b) => a.localeCompare(b)).map(path => ({ path, folder: folders.has(path), name: path.split('/').pop() || path, depth: path.split('/').length - 1 })).filter(item => item.path.split('/').slice(0, -1).every((_, index, parts) => expandedFolders.has(parts.slice(0, index + 1).join('/'))));
  const toggleFolder = (path: string) => setExpandedFolders(current => { const next = new Set(current); next.has(path) ? next.delete(path) : next.add(path); return next; });
  const multipleChoice = Array.isArray(current.options) && current.options.length > 0;
  return <main className="app-shell"><header><div className="brand"><i>◈</i> Codebase Quest</div><div className="repo-name">{quest.name} <span>/{quest.language}</span></div><div className="progress"><span>{mission + (feedback?.correct ? 1 : 0)} / {quest.missions.length} missions</span><div><b style={{ width: `${((mission + (feedback?.correct ? 1 : 0)) / quest.missions.length) * 100}%` }}/></div></div></header><div className="quest-grid"><aside className="mission-panel"><div className="mission-meta"><span>MISSION {String(mission + 1).padStart(2,'0')}</span><strong className={difficultyClass(current.difficulty)}>{current.difficulty}</strong></div><h2>{current.title}</h2><p className="prompt">{current.prompt}</p>{error && <div className="error">{error}</div>}{hint ? <div className="hint">💡 {current.hint}</div> : <button className="hint-button" onClick={() => setHint(true)}>Need a nudge? Use a hint</button>}<form className="answer" onSubmit={submit}>{multipleChoice ? <div className="options"><label>Choose the best answer</label>{current.options!.map(option => <label key={option} className="choice"><input type="radio" name="mission-answer" checked={answer === option} onChange={() => setAnswer(option)} /><span>{option}</span></label>)}</div> : <><label>Your investigation notes</label><textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Explain what you found in the code…"/></>}<button disabled={loading || !answer.trim()}>{loading ? 'Checking evidence…' : 'Submit answer'}</button></form>{feedback && <div className={`feedback ${feedback.correct ? 'good' : 'needs-work'}`}><div><b>{feedback.correct ? 'Evidence confirmed' : 'Not quite yet'}</b><span>{feedback.correct ? '✓' : '↗'}</span></div><p>{feedback.summary}</p><ul>{feedback.points.map(x => <li key={x}>{x}</li>)}</ul><div className="feedback-refs">{feedback.references.map(r => <button key={r.path} onClick={() => void openFile(r.path)}>{r.path}{r.lines ? ` · L${r.lines}` : ''}</button>)}</div>{mission === quest.missions.length - 1 ? <button className="next" onClick={resetQuest}>Return to homepage</button> : feedback.correct && <button className="next" onClick={() => { setMission(mission+1); setAnswer(''); setFeedback(undefined); setHint(false); }}>Next mission →</button>}</div>}</aside><section className="explorer"><div className="explorer-top"><span>EXPLORER · {quest.tree.length} FILES</span></div><div className="code-layout"><div className="tree">{treeItems.map(item => <button style={{ paddingLeft: `${8 + item.depth * 14}px` }} className={`${file === item.path ? 'active' : ''} ${item.folder ? 'folder' : ''}`} key={item.path} onClick={() => item.folder ? toggleFolder(item.path) : void openFile(item.path)} aria-expanded={item.folder ? expandedFolders.has(item.path) : undefined}><span>{item.folder ? (expandedFolders.has(item.path) ? '⌄ ' : '› ') : '· '}</span>{item.name}</button>)}</div><div className="code"><div className="tab">{source?.path || 'Select a file'} <span>×</span></div>{fileLoading && !source ? <div className="file-loading">Loading file…</div> : <pre>{source?.content.split('\n').map((line, i) => <code key={i}><i>{i+1}</i>{line || ' '}</code>)}</pre>}</div></div></section></div></main>;
}
