// Run with: node --test   (Node 18+, no dependencies).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

// Load the pure logic (js/core.js has no DOM in it) into a fresh context.
const core = fs.readFileSync(__dirname + '/js/core.js', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(core + ';this.API = { KEYS, AXES, ITEMS, ORDER, SHORT_FORM, FACTIONS, MIN_SIM, FLAT, ZONE, TALK, DEMOS, ' +
  'scoreAxes, compass, profile, similarities, rank, agreement, encodeCode, decodeCode, cleanName, ' +
  'axisRead, verdict, contrast, summarize, summaryLines, compare, alignWord, answersFor };', ctx);
const { KEYS, AXES, ITEMS, ORDER, SHORT_FORM, FACTIONS, MIN_SIM, FLAT, ZONE, TALK, DEMOS,
  scoreAxes, compass, profile, similarities, rank, agreement, encodeCode, decodeCode,
  axisRead, verdict, contrast, summarize, summaryLines, compare, alignWord, answersFor } = ctx.API;

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

// ---------------------------------------------------------------- compatibility with v0.1

// Codes, scores and closest camps produced by the single-file v0.1 (commit c4e00ba), before any refactoring.
// Codes people already sent each other must keep decoding to the same answers and the same result.
const V01 = {
  full: { code: 'AIC2-PNG9WP-NG9WPN-G9WPNG-9WPNG9-NX-C5BD696761', name: 'Žiga',
    scores: [8.33, -33.33, 50, -33.33, 8.33, 8.33, -33.33, 50], x: 36.11, y: -12.5, top: null },
  quick: { code: 'AIC2-700Z00-T00S00-L00K00-E00700-9S', name: '',
    scores: [0, 0, 25, 0, 0, -25, 0, 0], x: 0, y: 0, top: null },
  skips: { code: 'AIC2-3Q4F2M-3Q4F2M-3Q4F2M-3Q4F2M-U6', name: '',
    scores: [-25, 12.5, -25, 12.5, -25, 12.5, -25, 12.5], x: 0, y: -6.25, top: 'Open-Science Architect' }
};
const r2 = v => (v === null ? null : Math.round(v * 100) / 100);

test('share codes issued by v0.1 still decode, re-encode and score identically', () => {
  for (const [label, want] of Object.entries(V01)) {
    const back = decodeCode(want.code);
    assert.ok(back, label);
    assert.equal(back.name, want.name, label);
    assert.equal(encodeCode(back.resp, back.name), want.code, label);
    const s = scoreAxes(back.resp), c = compass(k => s[k].score), top = rank(s)[0];
    assert.deepEqual(allScores(s).map(r2), want.scores, label);
    assert.deepEqual([r2(c.x), r2(c.y)], [want.x, want.y], label);
    assert.equal(top ? top.name : null, want.top, label);
  }
});

// ---------------------------------------------------------------- readings and summaries

const scoresOf = d => scoreAxes(answersFor(d));

test('answersFor lands every axis on its target, in 25-point steps', () => {
  const d = [50, 75, -75, -50, 0, -50, -25, 100];
  assert.deepEqual(allScores(scoresOf(d)), d);
  assert.deepEqual(allScores(scoresOf([60, -60, 10, -10, 90, -90, 37, -38])), [50, -50, 0, 0, 100, -100, 25, -50]);
});

test('an axis reads as firm, leaning, middle or not scored', () => {
  const s = scoresOf([100, 50, 25, -25, 0, -50, -75, 0]);
  assert.match(axisRead('D1', s.D1).title, /^Firmly AI Doomer$/);
  assert.match(axisRead('D2', s.D2).title, /^Leans Safety-First Advocate$/);
  assert.equal(axisRead('D3', s.D3).title, AXES.D3.mid[0]);
  assert.equal(axisRead('D5', s.D5).num, 'middle ground, dead center');
  assert.match(axisRead('D7', s.D7).title, /^Firmly World-Model Architect$/);
  assert.equal(axisRead('D1', scoreAxes({}).D1).title, 'Not scored');
});

test('the summary names the truly strongest and most balanced axes', () => {
  const s = scoresOf([50, 100, -75, -50, 0, -50, 25, -50]), sum = summarize(s);
  assert.equal(sum.strongest, 'D2');
  assert.equal(sum.balanced, 'D5');
  assert.deepEqual(plain(sum.firm), ['D2', 'D3']);
  assert.deepEqual(plain(sum.lean), ['D1', 'D4', 'D6', 'D8']);
  assert.deepEqual(plain(sum.mid), ['D5', 'D7']);
});

test('the unusual pairing is one that at most two camps really hold, and is absent for a camp\'s own profile', () => {
  const side = v => (v > ZONE ? 1 : v < -ZONE ? -1 : 0);
  const s = scoresOf([75, 75, -100, 0, 0, 0, 0, 0]), c = summarize(s).combo;      // worried about risk, yet for open access
  assert.ok(c);
  const holders = FACTIONS.filter(f => [c.a, c.b].every(k => side(f.d[KEYS.indexOf(k)]) === side(s[k].score)));
  assert.equal(holders.length, c.shared.length);
  assert.ok(holders.length <= 2);
  for (const f of FACTIONS) {
    const combo = summarize(scoresOf(f.d)).combo;
    assert.ok(!combo || combo.shared.some(x => x.name === f.name), f.name);   // a camp always shares its own pairings
  }
});

test('summary lines only speak about what was answered', () => {
  assert.deepEqual(plain(summaryLines({})), [
    { label: 'Closest reference camp', text: 'Not enough answers yet to compare with the reference camps.' },
    { label: 'Coverage', text: 'Provisional: based on 0 of 48 statements.' }]);
  const quick = {};
  Array.from(ORDER).slice(0, SHORT_FORM).forEach(i => { quick['q' + i] = ITEMS[i][1] * 2; });
  const labels = Array.from(summaryLines(quick), l => l.label);
  assert.ok(labels.includes('Coverage'));
  assert.match(summaryLines(quick).find(l => l.label === 'Coverage').text, /16 of 48/);
  const full = summaryLines(answersFor(FACTIONS[0].d));
  assert.ok(!full.some(l => l.label === 'Coverage'));
  assert.match(full.find(l => l.label === 'Closest reference camp').text, new RegExp('^' + FACTIONS[0].name));
  assert.ok(full.every(l => l.label && l.text && !/undefined|null|NaN/.test(l.text)));
});

test('summary lines never break, whatever the answers', () => {
  let seed = 99;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let r = 0; r < 2000; r++) {
    const resp = {};
    ITEMS.forEach((_, i) => { const v = Math.floor(rnd() * 7) - 3; if (v >= -2 && v <= 2) resp['q' + i] = v; else if (v === 3) resp['q' + i] = null; });
    for (const l of summaryLines(resp)) assert.ok(l.label && l.text && !/undefined|NaN/.test(l.text), JSON.stringify(l));
  }
});

test('contrast with a camp lists same-side and opposite-side axes, and ignores unscored ones', () => {
  const f = FACTIONS.find(x => x.name === 'Existential Hardliner');
  const own = contrast(scoresOf(f.d), f.d);
  assert.equal(own.same.length, 8);
  assert.equal(own.opposite.length, 0);
  const c = contrast(scoresOf([-100, -100, -100, 0, 0, 0, 0, 0]), f.d);
  assert.deepEqual(plain(c.opposite), ['D1', 'D2', 'D3']);
  assert.ok(c.same.includes('D8'));                    // both in the middle ground
  assert.deepEqual(plain(contrast(scoreAxes({}), f.d)), { same: [], opposite: [] });
});

test('compare reports the gap on each axis, the closest, the furthest and what to talk about', () => {
  const a = scoresOf([100, 50, 0, 0, 0, 0, 0, -50]), b = scoresOf([-100, 50, 25, 0, 0, 0, 0, 50]);
  const c = compare(a, b);
  assert.equal(c.far, 'D1');
  assert.equal(c.near, 'D2');
  assert.equal(c.gap.D1, 200);
  assert.deepEqual(plain(c.talk), ['D1', 'D8']);
  assert.equal(c.agreement, agreement(a, b));
  assert.deepEqual(plain(compare(a, a).talk), []);
  assert.equal(compare(a, scoreAxes({})).near, null);
  assert.equal(alignWord(1), 'Nearly the same outlook');
  assert.equal(alignWord(0), 'Far apart');
  assert.ok(KEYS.every(k => TALK[k].length > 40 && /\?$/.test(TALK[k])));
});

test('the demo profiles are complete, distinct from each other and from every camp profile', () => {
  assert.equal(DEMOS.length, 2);
  for (const d of DEMOS) {
    assert.ok(d.name && d.blurb);
    assert.equal(Object.keys(d.resp).length, ITEMS.length);
    assert.ok(Object.values(d.resp).every(v => Number.isInteger(v) && v >= -2 && v <= 2));
    const sc = allScores(scoreAxes(d.resp));
    assert.ok(FACTIONS.every(f => f.d.some((v, i) => Math.abs(v - sc[i]) > 25)), d.name);
    assert.ok(summaryLines(d.resp).length >= 4);
  }
  assert.ok(agreement(scoreAxes(DEMOS[0].resp), scoreAxes(DEMOS[1].resp)) < 0.6);
});

// ---------------------------------------------------------------- the static page

const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
const meta = name => (page.match(new RegExp('<meta (?:name|property)="' + name + '" content="([^"]*)"')) || [])[1];

test('the static page describes every dimension exactly as the app does', () => {
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  for (const k of KEYS) for (const t of [AXES[k].short, AXES[k].q, AXES[k].low[0], AXES[k].high[0]]) assert.ok(page.includes(esc(t)), k + ': ' + t);
});

test('the static page says what this is, who made it and what it is not, without JavaScript', () => {
  const body = page.slice(page.indexOf('<body'), page.indexOf('<script src='));
  for (const t of ['Where do you stand on AI?', 'AI isn’t one debate. It’s eight.', 'Created by <a href="https://vukdinic.com/">Vuk Dinić</a>',
    'This is an exploratory educational tool, not a scientifically validated psychological or political test.',
    'https://bigthinkmedia.substack.com/p/10-perspectives-that-divide-the-ai', 'independent interpretation', '<noscript>', 'id="privacy"']) assert.ok(body.includes(t), t);
  assert.equal((body.match(/<h1[ >]/g) || []).length, 1);
  for (const slot of ['dimensions', 'camps', 'data']) assert.ok(body.includes('data-slot="' + slot + '"'), slot);
});

test('link-preview and search metadata is complete, with absolute image addresses', () => {
  assert.equal((page.match(/<title>([^<]*)<\/title>/) || [])[1], 'AI Compass — Eight Debates Shaping AI | Vuk Dinić');
  for (const name of ['description', 'og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'twitter:card', 'twitter:image', 'theme-color']) assert.ok(meta(name), name);
  const canonical = (page.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  assert.match(canonical, /^https:\/\/[^/]+\/(?:[^/]+\/)?$/);
  assert.equal(meta('og:url'), canonical);
  assert.equal(meta('og:image'), canonical + 'assets/og-image.png');
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.ok(meta('description').length >= 110 && meta('description').length <= 220);
  const png = fs.readFileSync(__dirname + '/assets/og-image.png');
  assert.equal(png.readUInt32BE(16) + 'x' + png.readUInt32BE(20), meta('og:image:width') + 'x' + meta('og:image:height'));
  assert.equal(meta('og:image:width') + 'x' + meta('og:image:height'), '1200x630');
  assert.ok(png.length < 300 * 1024, 'preview image stays small');
});

test('structured data is valid JSON-LD naming the app, its creator and its source', () => {
  const ld = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const app = ld['@graph'].find(n => n['@type'] === 'WebApplication'), person = ld['@graph'].find(n => n['@type'] === 'Person');
  assert.equal(app.name, 'AI Compass');
  assert.equal(app.url, (page.match(/<link rel="canonical" href="([^"]*)"/) || [])[1]);
  assert.equal(app.author['@id'], person['@id']);
  assert.equal(person.name, 'Vuk Dinić');
  assert.equal(person.url, 'https://vukdinic.com/');
  assert.match(app.citation.url, /bigthinkmedia\.substack\.com/);
  assert.ok(!('aggregateRating' in app) && !('review' in app));
});

test('every local file the page refers to exists', () => {
  const refs = Array.from(page.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"]+)"/g), m => m[1]);
  assert.ok(refs.length >= 9);
  for (const r of refs) assert.ok(fs.existsSync(__dirname + '/' + r), r);
});
