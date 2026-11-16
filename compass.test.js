// Run with: node --test   (Node 18+, no dependencies). Place next to index.html.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

// Load the pure-logic <script id="core"> block from index.html.
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(core + ';this.API = { KEYS, AXES, ITEMS, ORDER, SHORT_FORM, FACTIONS, MIN_SIM, FLAT, ZONE, ' +
  'scoreAxes, compass, profile, similarities, rank, agreement, encodeCode, decodeCode, cleanName };', ctx);
const { KEYS, AXES, ITEMS, ORDER, SHORT_FORM, FACTIONS, MIN_SIM, FLAT, ZONE,
  scoreAxes, compass, profile, similarities, rank, agreement, encodeCode, decodeCode } = ctx.API;

const answerAll = fn => Object.fromEntries(ITEMS.map((it, i) => ['q' + i, fn(it, i)]));
const allScores = s => Array.from(KEYS, k => s[k].score);   // Array.from: avoids cross-realm prototype mismatch
const plain = o => JSON.parse(JSON.stringify(o));           // same reason, for objects made inside the vm

// ---------------------------------------------------------------- scoring

test('polarity: agreeing with high-pole items and rejecting low-pole items gives +100 everywhere', () => {
  assert.deepEqual(allScores(scoreAxes(answerAll(([, key]) => key * 2))), Array(8).fill(100));
  assert.deepEqual(allScores(scoreAxes(answerAll(([, key]) => key * -2))), Array(8).fill(-100));
});

test('agreeing with every item scores 0, is flagged as conflicted, and gets no archetype', () => {
  const s = scoreAxes(answerAll(() => 2));
  assert.deepEqual(allScores(s), Array(8).fill(0));
  assert.ok(KEYS.every(k => s[k].conflict === 1 && s[k].reject === 0));
  assert.equal(rank(s).length, 0);
});

test('rejecting every item scores 0 and is flagged as "neither pole fits", not as conflicted', () => {
  const s = scoreAxes(answerAll(() => -2));
  assert.deepEqual(allScores(s), Array(8).fill(0));
  assert.ok(KEYS.every(k => s[k].reject === 1 && s[k].conflict === 0));
});

test('answering neutral to everything is a flat profile: no flags, no archetype', () => {
  const s = scoreAxes(answerAll(() => 0));
  assert.ok(KEYS.every(k => s[k].score === 0 && s[k].conflict === 0 && s[k].reject === 0));
  assert.equal(profile(s).strength, 0);
  assert.equal(similarities(s).length, 0);
});

test('unanswered or unsure items are skipped, not treated as neutral', () => {
  assert.ok(KEYS.every(k => scoreAxes({})[k].score === null));
  const s = scoreAxes({ q0: 2, q1: null });           // q0 is D1 low-pole; q1 is "unsure"
  assert.equal(s.D1.score, -100);
  assert.equal(s.D1.n, 1);
  assert.equal(s.D2.score, null);
});

test('skipping statements on one side does not drag the score toward the middle', () => {
  const resp = {};
  ITEMS.forEach(([ax, key], i) => { if (ax === 'D3' && key === -1) resp['q' + i] = 2; });   // all three low-pole items
  const oneHigh = ITEMS.findIndex(([ax, key]) => ax === 'D3' && key === 1);
  resp['q' + oneHigh] = -2;                                                                    // one of three high-pole items
  assert.equal(scoreAxes(resp).D3.score, -100);
});

test('out-of-range or non-numeric answers cannot push a score past the ends', () => {
  const s = scoreAxes(answerAll(([, key]) => key * 99));
  assert.deepEqual(allScores(s), Array(8).fill(100));
  assert.ok(KEYS.every(k => scoreAxes(answerAll(() => 'agree'))[k].score === null));
});

test('D4 and D5 do not move the compass', () => {
  const base = answerAll(() => 0);
  const moved = { ...base };
  ITEMS.forEach(([ax], i) => { if (ax === 'D4' || ax === 'D5') moved['q' + i] = 2; });
  const get = r => compass(k => scoreAxes(r)[k].score);
  assert.deepEqual(get(moved), get(base));
});

test('the compass is null with no answers and stays inside the chart otherwise', () => {
  assert.deepEqual(plain(compass(k => scoreAxes({})[k].score)), { x: null, y: null });
  for (const f of FACTIONS) {
    const c = compass(k => f.d[KEYS.indexOf(k)]);
    assert.ok(Math.abs(c.x) <= 100 && Math.abs(c.y) <= 100, f.name);
  }
});

// ---------------------------------------------------------------- the statement bank

test('every axis has six statements, three from each pole, with a note for each', () => {
  assert.equal(ITEMS.length, 48);
  for (const k of KEYS) {
    const mine = ITEMS.filter(([ax]) => ax === k);
    assert.equal(mine.length, 6, k);
    assert.equal(mine.filter(([, key]) => key === 1).length, 3, k);
    assert.equal(mine.filter(([, key]) => key === -1).length, 3, k);
    assert.ok(AXES[k].short && AXES[k].q && AXES[k].low.length === 2 && AXES[k].mid.length === 2 && AXES[k].high.length === 2, k);
  }
  assert.ok(ITEMS.every(([, , text, note]) => text.length > 20 && note.length > 20));
  assert.equal(new Set(ITEMS.map(it => it[2])).size, ITEMS.length, 'no statement appears twice');
});

test('the display order shows every statement once and never the same axis twice in a row', () => {
  assert.deepEqual(Array.from(ORDER).sort((a, b) => a - b), Array.from(ITEMS, (_, i) => i));
  for (let n = 1; n < ORDER.length; n++) assert.notEqual(ITEMS[ORDER[n]][0], ITEMS[ORDER[n - 1]][0]);
});

test('the first 16 statements form a balanced short quiz: one from each pole on every axis', () => {
  assert.equal(SHORT_FORM, 16);
  const first = Array.from(ORDER).slice(0, SHORT_FORM).map(i => ITEMS[i]);
  for (const k of KEYS) {
    assert.equal(first.filter(([ax, key]) => ax === k && key === 1).length, 1, k);
    assert.equal(first.filter(([ax, key]) => ax === k && key === -1).length, 1, k);
  }
});

// ---------------------------------------------------------------- camps

test('every camp has a full profile and its copy', () => {
  assert.equal(new Set(FACTIONS.map(f => f.name)).size, FACTIONS.length);
  for (const f of FACTIONS) {
    assert.equal(f.d.length, 8, f.name);
    assert.ok(f.d.every(v => Number.isFinite(v) && Math.abs(v) <= 100), f.name);
    assert.ok(f.tag && f.creed && f.about && f.critics && f.near && /^[rltb]{4}$/.test(f.lp), f.name);
  }
});

test('each archetype, snapped to the achievable 25-point lattice, matches itself', () => {
  for (const f of FACTIONS) {
    const resp = {};
    KEYS.forEach((ax, j) => {
      const d = Math.round(f.d[j] / 25);                // wanted b - a, in -4..4
      const b = Math.max(-2, Math.min(2, d)), a = b - d;
      ITEMS.forEach(([iax, key], i) => { if (iax === ax) resp['q' + i] = key === 1 ? b : a; });
    });
    assert.equal(rank(scoreAxes(resp))[0].name, f.name);
  }
});

test('each archetype still matches itself on the 16-statement short quiz', () => {
  for (const f of FACTIONS) {
    const resp = {};
    Array.from(ORDER).slice(0, SHORT_FORM).forEach(i => {
      const [ax, key] = ITEMS[i];
      const d = Math.round(f.d[KEYS.indexOf(ax)] / 25);
      const b = Math.max(-2, Math.min(2, d)), a = b - d;
      resp['q' + i] = key === 1 ? b : a;
    });
    assert.equal(rank(scoreAxes(resp))[0].name, f.name);
  }
});

test('a mild version of a camp matches the same camp as the strong version', () => {
  for (const f of FACTIONS) {
    const mild = {};
    KEYS.forEach((k, j) => { mild[k] = { score: f.d[j] * 0.4, n: 6, conflict: 0, reject: 0 }; });
    assert.equal(rank(mild)[0].name, f.name);
  }
});

test('similarities lists every camp, best first, and rank keeps only those above MIN_SIM', () => {
  const s = scoreAxes(answerAll(([, key]) => key * 2));
  const all = similarities(s);
  assert.equal(all.length, FACTIONS.length);
  for (let n = 1; n < all.length; n++) assert.ok(all[n - 1].sim >= all[n].sim);
  assert.ok(all.every(r => r.sim >= -1.000001 && r.sim <= 1.000001));
  assert.deepEqual(Array.from(rank(s), r => r.name), Array.from(all).filter(r => r.sim >= MIN_SIM).map(r => r.name));
});

test('random respondents are not funneled to one archetype (largest share under 25%)', () => {
  let seed = 12345;                                      // mulberry32, fixed seed
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const wins = {}; let n = 0;
  for (let r = 0; r < 20000; r++) {
    const top = rank(scoreAxes(answerAll(() => Math.floor(rnd() * 5) - 2)))[0];
    if (top) { wins[top.name] = (wins[top.name] || 0) + 1; n++; }
  }
  assert.ok(Math.max(...Object.values(wins)) / n < 0.25, JSON.stringify(wins));
  assert.equal(Object.keys(wins).length, FACTIONS.length, 'every camp is reachable');
});

test('thresholds are sane', () => {
  assert.ok(MIN_SIM > 0 && MIN_SIM < 1);
  assert.ok(FLAT > 0 && FLAT < 50);
  assert.equal(ZONE, 25);
});

// ---------------------------------------------------------------- comparing friends

test('agreement is 1 for identical profiles, 0 for opposite ones, null with nothing in common', () => {
  const a = scoreAxes(answerAll(([, key]) => key * 2)), b = scoreAxes(answerAll(([, key]) => key * -2));
  assert.equal(agreement(a, a), 1);
  assert.equal(agreement(a, b), 0);
  assert.equal(agreement(a, scoreAxes({})), null);
  const half = scoreAxes(answerAll(([, key]) => key));          // +50 everywhere
  assert.equal(agreement(a, half), 0.5);
});

test('a share code round-trips every answer, skips included, and a name with diacritics', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let r = 0; r < 300; r++) {
    const resp = {};
    ITEMS.forEach((_, i) => { const v = Math.floor(rnd() * 6) - 3; if (v >= -2) resp['q' + i] = v; });   // -3 means skipped
    const code = encodeCode(resp, 'Žiga Č.');
    assert.match(code, /^AIC2(-[0-9A-Z]{6}){4}-[0-9A-Z]{2}-[0-9A-F]+$/);
    const back = decodeCode(code);
    assert.deepEqual(plain(back.resp), resp);
    assert.equal(back.name, 'Žiga Č.');
  }
});

test('a share code survives lowercase, stray spaces, missing hyphens and a link wrapped around it', () => {
  const resp = answerAll(([, key], i) => (i % 5) - 2);
  const code = encodeCode(resp, 'Ana');
  for (const mangled of [code.toLowerCase(), '  ' + code + '\n', code.replace(/-/g, ''), 'https://example.github.io/ai-compass/#r-' + code]) {
    const back = decodeCode(mangled);
    assert.ok(back, mangled);
    assert.deepEqual(plain(back.resp), resp);
    assert.equal(back.name, 'Ana');
  }
  assert.equal(decodeCode(encodeCode(resp, '')).name, '');
});

test('a mistyped or truncated share code is rejected', () => {
  const code = encodeCode(answerAll(() => 1), '');
  const swap = c => (c === 'A' ? 'B' : 'A');
  for (let at = 5; at < code.length; at++) {
    if (code[at] === '-') continue;
    assert.equal(decodeCode(code.slice(0, at) + swap(code[at]) + code.slice(at + 1)), null, 'changed character ' + at);
  }
  assert.equal(decodeCode(code.slice(0, -3)), null);
  assert.equal(decodeCode(''), null);
  assert.equal(decodeCode('hello'), null);
  assert.equal(decodeCode(null), null);
});
