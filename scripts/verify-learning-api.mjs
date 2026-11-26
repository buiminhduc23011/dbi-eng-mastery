// Runs only on a brand-new temporary SQLite database, never on the learner's DB.
// Prerequisite: dotnet build backend/EngMastery.Api
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const folder = await mkdtemp(join(tmpdir(), 'engmastery-verification-'));
const dll = resolve('backend/EngMastery.Api/bin/Debug/net8.0/EngMastery.Api.dll');
const base = 'http://127.0.0.1:8190';
let server;
let output = '';
async function start(dbName) {
  output = '';
  server = spawn('dotnet', [dll, '--urls', base], {
    env: { ...process.env, Database__Provider: 'sqlite', ConnectionStrings__Sqlite: `Data Source=${join(folder, dbName)}`, ASPNETCORE_ENVIRONMENT: 'Development', Logging__LogLevel__Default: 'Warning' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${output}`);
    try { const r = await fetch(`${base}/api/learning/progress`); if (r.ok) return; } catch { /* not listening yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Test server did not start: ${output}`);
}
async function stop() {
  if (server && server.exitCode === null) { const exited = new Promise(r => server.once('exit', r)); server.kill(); await exited; }
}
async function request(path, method = 'GET', body, expected = 200) {
  const r = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(r.status, expected, `${method} ${path}: ${await (r.status !== expected ? r.text() : Promise.resolve(''))}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
let passed = 0;
const ok = message => { passed++; console.log(`PASS ${passed}: ${message}`); };
try {
  // Refuse to attach to another server on the test port.
  try { await fetch(base); throw new Error('Port 8190 is occupied; stop that server or use another test port.'); }
  catch (e) { if (!String(e).includes('fetch failed')) throw e; }
  await start('original-test.db');
  await request('/backup/import', 'POST', {
    cards: [{ term: 'legacy learner fixture', meaningVi: 'Dữ liệu học cũ', category: 'Personal old deck', repetition: 9, intervalDays: 41, easeFactor: 2.8, nextReviewDate: '2030-01-01T00:00:00Z', mistakeCount: 3, consecutiveTypingPasses: 4, status: 2 }],
    drills: [{ promptVi: 'Câu cũ đã chỉnh sửa', targetEn: 'My old sentence.', category: 'Personal old deck', practiceCount: 17, lastScore: 91, nextReviewDate: '2030-01-02T00:00:00Z' }],
    studyLogs: [{ studyDate: '2025-01-02', cardsReviewed: 37, drillsCompleted: 8, aiCallsUsed: 2, studyDurationSeconds: 900 }],
  });
  await request('/settings', 'PUT', { DailyTarget: '13', UserFixture: 'keep me' });
  const before = await request('/backup/export');
  assert.deepEqual(await request('/learning/progress'), {});
  ok('legacy fixture and empty foundation state coexist');

  const completion = await request('/learning/lessons/foundation-01/completion', 'PUT', { independentCount: 2 });
  assert.equal(completion.completions, 1);
  assert.equal(completion.independentCount, 2);
  assert.equal(new Date(completion.nextReviewOn) - new Date(completion.completedOn), 86400000);
  const repeated = await Promise.all(Array.from({ length: 4 }, () => request('/learning/lessons/foundation-01/completion', 'PUT', { independentCount: 3 })));
  repeated.forEach(p => assert.deepEqual(p, completion));
  const after = await request('/backup/export');
  assert.deepEqual(after.cards, before.cards);
  assert.deepEqual(after.drills, before.drills);
  assert.deepEqual(after.studyLogs.find(l => l.studyDate === '2025-01-02'), before.studyLogs[0]);
  assert.equal(after.studyLogs.find(l => l.studyDate === completion.completedOn).drillsCompleted, 1);
  const settings = await request('/settings');
  assert.equal(settings.DailyTarget, '13'); assert.equal(settings.UserFixture, 'keep me');
  assert.equal(settings['Learning.v1.lesson.foundation-01'], undefined);
  await request('/settings', 'PUT', { 'Learning.v1.lesson.foundation-01': 'stale data' });
  assert.deepEqual((await request('/learning/progress'))['foundation-01'], completion);
  ok('completion and concurrent retries preserve old cards, schedules, logs and settings');

  await request('/learning/lessons/unknown/completion', 'PUT', { independentCount: 1 }, 404);
  await request('/learning/lessons/foundation-02/completion', 'PUT', { independentCount: 4 }, 400);
  await request('/learning/lessons/foundation-02/completion', 'PUT', { independentCount: -1 }, 400);
  assert.equal(Object.keys(await request('/learning/progress')).length, 1);
  const extended = await request('/learning/lessons/foundation-13/completion', 'PUT', { independentCount: 3 });
  assert.equal(extended.lessonId, 'foundation-13');
  const bothProgress = await request('/learning/progress');
  assert.deepEqual(bothProgress['foundation-01'], completion);
  assert.deepEqual(bothProgress['foundation-13'], extended);
  await request('/learning/lessons/foundation-36/completion', 'PUT', { independentCount: 1 });
  assert.equal((await request('/learning/progress'))['foundation-36'].lessonId, 'foundation-36');
  ok('unknown lessons rejected, old progress retained, and new course IDs 13–36 accepted');

  await stop(); await start('original-test.db');
  assert.deepEqual((await request('/learning/progress'))['foundation-01'], completion);
  const restarted = await request('/backup/export');
  assert.deepEqual(restarted.cards, before.cards); assert.deepEqual(restarted.drills, before.drills);
  ok('restart retains progress and all legacy fixtures');

  const personal = { category: 'My sentences', promptVi: 'Tôi cần một ngày.', targetEn: 'I need a day.', alternativesEn: [], keywords: [], grammarNote: 'Câu của tôi' };
  const created = await request('/drills', 'POST', personal, 201);
  assert.equal((await request('/drills', 'POST', personal)).id, created.id);
  ok('personal sentence retry does not duplicate the saved drill');

  const backup = await request('/backup/export');
  assert.equal(backup.version, 2);
  assert.ok(backup.learningProgress['Learning.v1.lesson.foundation-01']);
  assert.equal(JSON.stringify(backup).includes('GeminiApiKey'), false);
  const merged = await request('/backup/import', 'POST', backup);
  assert.deepEqual(merged, { cardsAdded: 0, drillsAdded: 0, studyLogsAdded: 0, progressAdded: 0 });
  ok('version-2 export includes new progress and history; repeat import is non-destructive');

  await request('/backup/import', 'POST', { learningProgress: { GeminiApiKey: 'not allowed' } }, 400);
  await request('/backup/import', 'POST', { learningProgress: { 'Learning.v1.lesson.foundation-02': '{bad json' } }, 400);
  assert.deepEqual(await request('/backup/export').then(({exportedAt, ...rest}) => rest), (({exportedAt, ...rest}) => rest)(backup));
  ok('invalid backup fields rejected atomically');

  await stop(); await start('restore-test.db');
  await request('/backup/import', 'POST', backup);
  const restored = await request('/backup/export');
  const withoutIds = values => values.map(({ id, ...rest }) => rest).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // Built-in seeds in the new DB retain their own creation times. Verify learner-authored rows exactly.
  assert.deepEqual(withoutIds(restored.cards.filter(c => c.term === 'legacy learner fixture')), withoutIds(backup.cards.filter(c => c.term === 'legacy learner fixture')));
  assert.deepEqual(withoutIds(restored.drills.filter(d => d.category === 'Personal old deck' || d.category === 'My sentences')), withoutIds(backup.drills.filter(d => d.category === 'Personal old deck' || d.category === 'My sentences')));
  assert.deepEqual(restored.learningProgress, backup.learningProgress);
  assert.deepEqual(withoutIds(restored.studyLogs), withoutIds(backup.studyLogs));
  ok('restore into another database recovers learner rows, new progress and study history');
  console.log(`${passed}/${passed} integration checks passed. Isolated test files: ${folder}`);
} finally { await stop(); }
