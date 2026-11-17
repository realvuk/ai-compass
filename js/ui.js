'use strict';
// Shared UI plumbing: DOM helpers, saved state, tooltips, the compass chart, the page frame
// (top bar, footer, About) and the router. Loaded after core.js; the views live in quiz.js and result.js.

const $app = document.getElementById('app'), $tip = document.getElementById('tip');
const $about = document.getElementById('about');   // the About text ships as static HTML, so it can be read without JavaScript
const STORE = 'ai-compass-v2', SVGNS = 'http://www.w3.org/2000/svg', MAX_FRIENDS = 8;
const AUTHOR_URL = 'https://vukdinic.com/', PROJECT_URL = 'https://vukdinic.com/projects/ai-compass/';
const REPO_URL = 'https://github.com/realvuk/ai-compass';
const SOURCE_URL = 'https://bigthinkmedia.substack.com/p/10-perspectives-that-divide-the-ai';
const LIKERT = [[-2, 'Strongly disagree'], [-1, 'Disagree'], [0, 'Neutral'], [1, 'Agree'], [2, 'Strongly agree']];
const ANSWER = { '-2': 'Strongly disagree', '-1': 'Disagree', '0': 'Neutral', '1': 'Agree', '2': 'Strongly agree' };
const QUADS = {
  tl: ['Public Guardrails', 'strong rules on AI, with its power and benefits widely spread'],
  tr: ['Guarded Frontier', 'strong rules on AI, with the most powerful systems held by a few accountable institutions'],
  bl: ['Open Acceleration', 'AI built fast and in the open, with models and computing power in many hands'],
  br: ['Industrial Acceleration', 'AI built fast and at scale by the companies and states able to fund it']
};
const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const still = () => motion.matches;   // the visitor asked for reduced motion: no animation, no waiting
let framed = true;
try { framed = window.self !== window.top; } catch (e) { framed = true; }

// ---------- tiny DOM helpers ----------
function add(el, kid) {
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) kid.forEach(k => add(el, k));
  else el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
}
function h(tag, props) {
  const el = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
function sv(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in (attrs || {})) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
const btn = (text, kind, onclick, extra) => h('button', Object.assign({ class: 'btn' + (kind ? ' ' + kind : ''), type: 'button', text: text, onclick: onclick }, extra || {}));
const num = v => (v < 0 ? '−' : '') + Math.abs(Math.round(v));
const pct = v => Math.round(v * 100) + '%';
const possessive = n => n + (/s$/i.test(n) ? '’' : '’s');

// ---------- state ----------
// mode: the route being taken ('quick' = first 16 statements, 'full' = all 48). pick: the route chosen on the
// landing page before starting. viewing: null for your own result, { friend: i } or { demo: i } otherwise.
const st = { view: 'intro', idx: 0, resp: {}, name: '', friends: [], mode: 'full', pick: 'quick', restored: false, viewing: null, from: 'intro', tab: 'dims', note: '' };
let busy = false, afterRender = [], mounted = [], sail = false;
let editOne = null;   // set to an axis id while one answer is being changed from the result page

function sanitize(o) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  if (['intro', 'quiz', 'result'].indexOf(o.view) >= 0) out.view = o.view;
  if (Number.isInteger(o.idx)) out.idx = Math.max(0, Math.min(ORDER.length - 1, o.idx));
  if (o.resp && typeof o.resp === 'object') {
    out.resp = {};
    ITEMS.forEach((it, i) => {
      const v = o.resp['q' + i];
      if (v === null || (Number.isInteger(v) && v >= -2 && v <= 2)) out.resp['q' + i] = v;
    });
  }
  if (typeof o.name === 'string') out.name = cleanName(o.name);
  if (o.mode === 'quick' || o.mode === 'full') out.mode = o.mode;
  if (typeof o.restored === 'boolean') out.restored = o.restored;
  if (Array.isArray(o.friends)) {
    out.friends = o.friends.filter(f => f && typeof f.code === 'string' && decodeCode(f.code))
      .slice(0, MAX_FRIENDS).map(f => ({ code: f.code, name: cleanName(f.name) }));
  }
  return out;
}
const snapshot = () => ({ view: st.view === 'about' ? st.from : st.view, idx: st.idx, resp: st.resp, name: st.name, friends: st.friends, mode: st.mode, restored: st.restored });
function save() { try { localStorage.setItem(STORE, JSON.stringify(snapshot())); } catch (e) { /* storage unavailable: carry on in memory */ } }
function load() { try { Object.assign(st, sanitize(JSON.parse(localStorage.getItem(STORE) || 'null'))); } catch (e) { /* ignore */ } }

const touched = () => ITEMS.reduce((n, it, i) => n + (('q' + i) in st.resp ? 1 : 0), 0);
const answered = r => ITEMS.reduce((n, it, i) => n + (typeof (r || st.resp)['q' + i] === 'number' ? 1 : 0), 0);
const firstOpen = () => { const k = ORDER.findIndex(i => !(('q' + i) in st.resp)); return k < 0 ? ORDER.length - 1 : k; };
// Restored codes omit skipped/unreached questions, so their results cannot use the 16-seen gate.
const canRead = () => st.restored || touched() >= SHORT_FORM;
// How many statements the quiz shows: 16 on the quick route, 48 otherwise or when a later one is being edited.
const quizTotal = () => (st.mode === 'quick' && st.idx < SHORT_FORM ? SHORT_FORM : ORDER.length);
const leftInRoute = () => ORDER.slice(0, st.mode === 'quick' ? SHORT_FORM : ORDER.length).filter(i => !(('q' + i) in st.resp)).length;
const bodyOf = code => code.split('-').slice(1, 5).join('');
function friends() {
  return st.friends.map((f, i) => {
    const d = decodeCode(f.code);
    return { name: f.name || d.name || 'Friend ' + (i + 1), resp: d.resp, sc: scoreAxes(d.resp), i: i };
  });
}
function addFriend(text) {
  const d = decodeCode(text);
  if (!d) return 'That code doesn’t check out. Paste the whole thing, starting with ' + CODE_PREFIX + '.';
  const code = encodeCode(d.resp, d.name);
  if (answered() && bodyOf(code) === bodyOf(encodeCode(st.resp, ''))) return 'That is your own code. Paste one a friend sent you.';
  const at = st.friends.findIndex(f => bodyOf(f.code) === bodyOf(code));
  if (at >= 0) { st.friends[at] = { code: code, name: d.name }; return ''; }
  if (st.friends.length >= MAX_FRIENDS) return 'The chart holds ' + MAX_FRIENDS + ' friends. Remove one to add another.';
  st.friends.push({ code: code, name: d.name });
  return '';
}
// Replaces your own answers with the ones in a code: for moving to another browser, or after the site's address changed.
function importOwn(text) {
  const d = decodeCode(text);
  if (!d) return 'That code doesn’t check out. Paste the whole thing, starting with ' + CODE_PREFIX + '.';
  st.resp = d.resp;
  st.restored = true;
  if (d.name) st.name = d.name;
  st.friends = st.friends.filter(f => bodyOf(f.code) !== bodyOf(encodeCode(d.resp, '')));
  st.mode = touched() > SHORT_FORM ? 'full' : 'quick';
  st.idx = firstOpen(); st.viewing = null;
  save();
  return '';
}
function eraseAll() {
  st.resp = {}; st.idx = 0; st.name = ''; st.friends = []; st.mode = 'full'; st.restored = false; st.viewing = null; st.note = '';
  try { localStorage.removeItem(STORE); } catch (e) { /* nothing was stored */ }
}

// ---------- tooltip ----------
function showTip(target, title, lines) {
  $tip.replaceChildren(h('b', { text: title }), ...lines.filter(Boolean).map(l => h('span', { text: l })));
  $tip.hidden = false;
  const r = target.getBoundingClientRect(), t = $tip.getBoundingClientRect();
  const x = Math.max(8, Math.min(window.innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
  let y = r.top - t.height - 8;
  if (y < 8) y = r.bottom + 8;
  $tip.style.left = x + 'px'; $tip.style.top = y + 'px';
}
function hideTip() { $tip.hidden = true; }
function tip(el, title, lines) {
  const show = () => showTip(el, title, lines);
  el.addEventListener('pointerenter', show);
  el.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
  el.addEventListener('focus', show);
  el.addEventListener('blur', hideTip);
  el.addEventListener('click', e => { show(); e.stopPropagation(); });
  return el;
}
document.addEventListener('click', hideTip);
window.addEventListener('scroll', hideTip, { passive: true });

// ---------- reading helpers ----------
function whereText(c) {
  if (c.x === null || c.y === null) return '';
  const x = Math.round(c.x), y = Math.round(c.y);
  return Math.abs(x) + ' toward ' + (x < 0 ? 'distributed' : 'concentrated') + ', ' + Math.abs(y) + ' toward ' + (y < 0 ? 'speed' : 'caution');
}
function quadrant(c) {
  if (Math.abs(c.x) <= ZONE && Math.abs(c.y) <= ZONE) return null;
  return QUADS[(c.y > 0 ? 't' : 'b') + (c.x < 0 ? 'l' : 'r')];
}

// ---------- the chart ----------
// animate: the marks for you and your friends sail in from the middle of the chart.
function drawCompass(box, data, animate) {
  const movers = [];
  animate = animate && !still();
  const W = Math.max(260, Math.min(620, Math.floor(box.getBoundingClientRect().width)));
  const small = W < 440;
  const m = { l: 32, r: 8, t: 8, b: 26 };
  const P = W - m.l - m.r, H = P + m.t + m.b;
  const X = v => m.l + (v + 100) / 200 * P, Y = v => m.t + (100 - v) / 200 * P;
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'group', 'aria-label': data.label });
  const placed = [];
  const tw = (s, px) => s.length * px * 0.6 + 4;

  svg.append(sv('rect', { class: 'c-sea', x: m.l, y: m.t, width: P, height: P }),
    sv('rect', { class: 'c-island', x: X(-ZONE), y: Y(ZONE), width: P * ZONE / 100, height: P * ZONE / 100, rx: 3 }));
  [-50, 50].forEach(v => svg.append(
    sv('line', { class: 'c-grid', x1: X(v), x2: X(v), y1: m.t, y2: m.t + P }),
    sv('line', { class: 'c-grid', y1: Y(v), y2: Y(v), x1: m.l, x2: m.l + P })));
  svg.append(sv('line', { class: 'c-axis', x1: X(0), x2: X(0), y1: m.t, y2: m.t + P }),
    sv('line', { class: 'c-axis', y1: Y(0), y2: Y(0), x1: m.l, x2: m.l + P }),
    sv('rect', { class: 'c-frame', x: m.l, y: m.t, width: P, height: P }));
  [-100, -50, 0, 50, 100].forEach(v => svg.append(
    sv('text', { class: 'c-tick', x: X(v), y: m.t + P + 17, 'text-anchor': v === -100 ? 'start' : v === 100 ? 'end' : 'middle' }, num(v)),
    sv('text', { class: 'c-tick', x: m.l - 6, y: Y(v) + (v === 100 ? 9 : v === -100 ? -1 : 4), 'text-anchor': 'end' }, num(v))));

  // the four seas, named like water on a chart
  const seaPx = small ? 12.5 : 15;
  [['Public', 'Guardrails', -64, 58], ['Guarded', 'Frontier', 71, 76], ['Open', 'Acceleration', -64, -31], ['Industrial', 'Acceleration', 67, -24]].forEach(q => {
    const t = sv('text', { class: 'c-seaname', 'text-anchor': 'middle', style: 'font-size:' + seaPx + 'px', 'aria-hidden': 'true' },
      sv('tspan', { x: X(q[2]), y: Y(q[3]) }, q[0]), sv('tspan', { x: X(q[2]), dy: seaPx * 1.15 }, q[1]));
    svg.append(t);
    const w = Math.max(q[0].length, q[1].length) * seaPx * 0.74;
    placed.push({ x0: X(q[2]) - w / 2, x1: X(q[2]) + w / 2, y0: Y(q[3]) - seaPx, y1: Y(q[3]) + seaPx * 1.5 });
  });
  // axis ends
  [['Caution', X(0) + 7, m.t + 17, 'start'], ['Speed', X(0) + 7, m.t + P - 9, 'start'],
    ['Distributed', m.l + 7, Y(0) + 16, 'start'], ['Concentrated', m.l + P - 7, Y(0) + 16, 'end']].forEach(e => {
    svg.append(sv('text', { class: 'c-end', x: e[1], y: e[2], 'text-anchor': e[3] }, e[0]));
    const w = tw(e[0], 13);
    placed.push({ x0: e[3] === 'end' ? e[1] - w : e[1], x1: e[3] === 'end' ? e[1] : e[1] + w, y0: e[2] - 12, y1: e[2] + 3 });
  });

  const pts = [];
  data.camps.forEach((c, i) => pts.push({ kind: 'camp', x: c.x, y: c.y, r: 5, label: c.tag, prefs: c.lp, top: c.top,
    wantLabel: i < (small ? (data.you ? 3 : 5) : 99), title: c.name, lines: [c.creed, whereText(c)] }));
  (data.friends || []).forEach(f => pts.push({ kind: 'friend', x: f.x, y: f.y, r: 8, label: f.name, prefs: 'rltb', wantLabel: true,
    title: f.name, lines: [whereText(f), f.camp ? 'Closest camp: ' + f.camp : ''] }));
  if (data.you) pts.push({ kind: 'you', x: data.you.x, y: data.you.y, r: 10, label: data.you.name, prefs: 'rltb', wantLabel: true,
    title: data.you.name, lines: [whereText(data.you), data.you.camp ? 'Closest camp: ' + data.you.camp : ''] });
  pts.forEach(p => { p.px = X(p.x); p.py = Y(p.y); placed.push({ x0: p.px - p.r - 2, x1: p.px + p.r + 2, y0: p.py - p.r - 2, y1: p.py + p.r + 2 }); });

  const hits = b => placed.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
  function place(p) {
    const px = p.kind === 'camp' && !p.top ? 11.5 : 13, w = tw(p.label, px), hgt = px + 3, r = p.r;
    const inY = y => Math.max(m.t + 4, Math.min(m.t + P - 4 - hgt, y)), inX = x => Math.max(m.l + 4, Math.min(m.l + P - 4 - w, x));
    const opts = {
      r: [p.px + r + 4, inY(p.py - hgt / 2)], l: [p.px - r - 4 - w, inY(p.py - hgt / 2)],
      b: [inX(p.px - w / 2), p.py + r + 3], t: [inX(p.px - w / 2), p.py - r - 3 - hgt]
    };
    for (const k of p.prefs) {
      const b = { x0: opts[k][0], y0: opts[k][1], x1: opts[k][0] + w, y1: opts[k][1] + hgt };
      if (b.x0 < m.l + 3 || b.x1 > m.l + P - 3 || b.y0 < m.t + 3 || b.y1 > m.t + P - 3 || hits(b)) continue;
      placed.push(b);
      return { x: k === 'r' ? b.x0 + 2 : k === 'l' ? b.x1 - 2 : b.x0 + w / 2, y: b.y1 - 4.5, anchor: k === 'r' ? 'start' : k === 'l' ? 'end' : 'middle' };
    }
    return null;
  }
  // labels: you first, then friends, then camps in the order given (best match first)
  ['you', 'friend', 'camp'].forEach(kind => pts.filter(p => p.kind === kind && p.wantLabel).forEach(p => { p.lab = place(p); }));

  if (data.you && data.bearing) {
    svg.append(sv('line', { class: 'c-bearing' + (animate ? ' late' : ''), x1: X(data.you.x), y1: Y(data.you.y), x2: X(data.bearing.x), y2: Y(data.bearing.y) }));
  }
  ['camp', 'friend', 'you'].forEach(kind => pts.filter(p => p.kind === kind).forEach(p => {
    const g = sv('g', { class: 'c-pt c-' + p.kind + (p.top ? ' is-top' : ''), tabindex: 0, role: 'img',
      'aria-label': p.title + ': ' + p.lines.filter(Boolean).join('. ') });
    if (p.kind === 'camp') g.append(sv('rect', { x: p.px - 4.5, y: p.py - 4.5, width: 9, height: 9 }));
    if (p.kind === 'friend') g.append(
      sv('rect', { class: 'c-ring', x: p.px - 7.5, y: p.py - 7.5, width: 15, height: 15, transform: 'rotate(45 ' + p.px + ' ' + p.py + ')' }),
      sv('rect', { class: 'c-friend', x: p.px - 5.5, y: p.py - 5.5, width: 11, height: 11, transform: 'rotate(45 ' + p.px + ' ' + p.py + ')' }));
    if (p.kind === 'you') g.append(sv('circle', { class: 'c-ring', cx: p.px, cy: p.py, r: 11.5 }),
      sv('circle', { class: 'c-you-o', cx: p.px, cy: p.py, r: 8 }), sv('circle', { class: 'c-you-i', cx: p.px, cy: p.py, r: 3.4 }));
    if (p.lab) g.append(sv('text', { class: 'c-label' + (p.kind !== 'camp' || p.top ? ' strong' : ''), x: p.lab.x, y: p.lab.y, 'text-anchor': p.lab.anchor }, p.label));
    g.append(sv('circle', { class: 'c-hit', cx: p.px, cy: p.py, r: 13 }));
    if (animate && p.kind !== 'camp') { g.style.transform = 'translate(' + (X(0) - p.px) + 'px,' + (Y(0) - p.py) + 'px)'; g.style.opacity = '0'; movers.push(g); }
    tip(g, p.title, p.lines);
    svg.append(g);
  }));
  box.replaceChildren(svg);
  if (movers.length) requestAnimationFrame(() => requestAnimationFrame(() => movers.forEach(g => {
    g.style.transition = 'transform .6s cubic-bezier(.2, .8, .2, 1), opacity .25s ease';
    g.style.transform = ''; g.style.opacity = '';
  })));
}
function compassBox(data) {
  const box = h('div', { class: 'compass' });
  afterRender.push(() => { mounted.push([box, data]); drawCompass(box, data, sail); });
  return box;
}
function campPoints(order) {
  const list = order || FACTIONS;
  return list.map((f, i) => Object.assign(compass(k => f.d[KEYS.indexOf(k)]), { name: f.name, tag: f.tag, lp: f.lp, creed: f.creed, top: !!order && i === 0 && f.sim >= MIN_SIM }));
}
let redraw = 0;
function redrawAll() { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => mounted.forEach(m => { if (m[0].isConnected) drawCompass(m[0], m[1]); })); }
window.addEventListener('resize', redrawAll);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAll);

function legend(hasYou, youLabel, hasFriends) {
  const sw = kid => sv('svg', { width: 22, height: 22, viewBox: '0 0 22 22', 'aria-hidden': 'true' }, kid);
  return h('ul', { class: 'legend' },
    hasYou && h('li', null, sw([sv('circle', { class: 'c-you-o', cx: 11, cy: 11, r: 8 }), sv('circle', { class: 'c-you-i', cx: 11, cy: 11, r: 3.4 })]), youLabel),
    hasFriends && h('li', null, sw(sv('rect', { class: 'c-friend', x: 5.5, y: 5.5, width: 11, height: 11, transform: 'rotate(45 11 11)' })), 'Friends'),
    h('li', { class: 'c-camp' }, sw(sv('rect', { x: 6.5, y: 6.5, width: 9, height: 9 })), 'Reference camps'),
    h('li', null, sw(sv('rect', { class: 'c-island', x: 3, y: 5, width: 16, height: 12, rx: 2 })), 'Middle ground'));
}

// ---------- the page frame ----------
function logo(size) {
  return sv('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    sv('circle', { class: 'c-you-o', cx: 12, cy: 12, r: 9 }), sv('circle', { class: 'c-you-i', cx: 12, cy: 12, r: 3.6 }));
}
const link = (href, text, outside) => h('a', outside ? { href: href, text: text, target: '_blank', rel: 'noopener noreferrer' } : { href: href, text: text });
const home = () => { st.viewing = null; go('intro'); };

function topBar() {
  const right = [];
  if (st.view === 'quiz') right.push(h('span', { class: 'saved', text: 'Your answers save as you go' }));
  if (st.view === 'about') right.push(btn(st.from === 'quiz' ? 'Back to the quiz' : st.from === 'result' ? 'Back to the result' : 'Home', 'quiet', () => go(st.from)));
  else {
    right.push(btn('About', 'quiet', () => go('about')));
    if (st.view !== 'intro') right.push(btn(st.view === 'quiz' ? 'Exit' : 'Home', 'quiet', home));
  }
  return h('header', { class: 'top' },
    h('div', { class: 'brand-wrap' },
      h('button', { class: 'brand', type: 'button', title: 'Back to the start', onclick: home }, logo(24), h('span', { text: 'AI Compass' })),
      h('a', { class: 'by', href: AUTHOR_URL, text: 'by Vuk Dinić' })),
    h('nav', { class: 'top-right', 'aria-label': 'Pages' }, right));
}

// A button that has to be pressed twice, so answers are not erased by accident.
function armed(label, warning, act) {
  let timer = 0;
  const b = btn(label, 'quiet', () => {
    if (!timer) { b.textContent = warning; timer = setTimeout(() => { timer = 0; b.textContent = label; }, 4000); return; }
    clearTimeout(timer); timer = 0;
    act();
  });
  return b;
}
const eraseBtn = label => armed(label, 'Press again to erase your answers', () => { st.resp = {}; st.idx = 0; st.viewing = null; st.restored = false; st.mode = st.pick; go('quiz'); });

function footer() {
  const issue = t => REPO_URL + '/issues/new?template=' + t;
  return h('footer', null,
    h('p', { class: 'foot-id' }, h('b', { text: 'AI Compass' }), ' · Eight debates shaping the future of AI · By ', link(AUTHOR_URL, 'Vuk Dinić')),
    h('nav', { class: 'foot-links', 'aria-label': 'More about AI Compass' },
      st.view !== 'about' && h('a', { href: '#about', text: 'About, methodology and privacy', onclick: e => { e.preventDefault(); go('about'); } }),
      link(PROJECT_URL, 'Project page'), link(REPO_URL, 'Source code'),
      link(issue('improvement.yml'), 'Suggest an improvement'), link(issue('bug.yml'), 'Report a problem')),
    h('p', null, 'Eight dimensions, 48 statements, eleven illustrative reference camps. An independent interpretation inspired by Kristin Houser’s ',
      link(SOURCE_URL, '“10 perspectives that divide the AI world”', true),
      ' in Big Think, reworked from ten tribes into eight independent dimensions.'),
    h('p', { text: 'This is an exploratory educational tool, not a scientifically validated psychological or political test. Nothing you enter is sent anywhere: answers are kept in this browser, and a code only travels when you send it yourself.' }),
    h('div', { class: 'footer-contact-row' },
      h('div', { class: 'footer-logos' },
        h('img', { src: 'Datavysts_Icon_Burple_RGB.svg', alt: 'Datavysts', width: '48', height: '48' }),
        h('div', { class: 'footer-institute' },
          h('img', { class: 'ijs-logo', src: 'IJSbrezBesedila.svg', alt: 'IJS', width: '36', height: '48' }),
          h('span', null, 'Jožef Stefan', h('br'), 'Institute'))),
      h('address', { class: 'footer-contact' },
        h('span', { text: 'Contact' }),
        h('a', { href: 'mailto:vuk.dinic@ijs.si', text: 'vuk.dinic@ijs.si' }))));
}

// ---------- About, methodology and privacy ----------
function campTable() {
  return h('details', null, h('summary', { text: 'The eleven camp profiles, as numbers' }),
    h('div', { class: 'tbl' }, h('table', null,
      h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Camp' }), KEYS.map(k => h('th', { scope: 'col', text: AXES[k].short })))),
      h('tbody', null, FACTIONS.map(f => h('tr', null, h('td', { text: f.name }), f.d.map(v => h('td', { text: num(v) }))))))));
}
function dimensionList() {
  return h('ul', { class: 'answers dims' }, KEYS.map(k => {
    const A = AXES[k];
    return h('li', null, h('h3', { text: A.short + ': ' + A.name.toLowerCase() }), h('p', { class: 'st', text: A.q }),
      h('div', { class: 'defs' }, [A.low, A.mid, A.high].map(d => h('div', null, h('h4', { text: d[0] }), h('p', { text: d[1] })))));
  }));
}
function dataControls() {
  const msg = h('p', { class: 'err', role: 'status' });
  const code = h('input', { type: 'text', id: 'restore-code', autocomplete: 'off', spellcheck: 'false', placeholder: CODE_PREFIX + '-…' });
  const restore = e => {
    e.preventDefault();
    if (!code.value.trim()) { msg.textContent = 'Paste your code first.'; return; }
    if (touched() && code.dataset.sure !== code.value) { code.dataset.sure = code.value; msg.textContent = 'This replaces the ' + touched() + ' answers saved here. Press Restore again to confirm.'; return; }
    const problem = importOwn(code.value);
    if (problem) { msg.textContent = problem; return; }
    if (canRead()) go('result'); else go('quiz');
  };
  const stored = touched() || st.friends.length || st.name;
  return [
    h('p', { class: 'hint', text: stored ? 'Stored in this browser now: ' + touched() + ' of your answers' + (st.name ? ', the name “' + st.name + '”' : '') + ' and ' + st.friends.length + ' code' + (st.friends.length === 1 ? '' : 's') + ' from friends.' : 'Nothing is stored in this browser at the moment.' }),
    h('div', { class: 'row' }, armed('Erase everything stored here', 'Press again to erase your answers, name and friends’ codes', () => { eraseAll(); go('intro'); })),
    h('form', { class: 'field', onsubmit: restore, style: 'margin-top:14px' },
      h('label', { for: 'restore-code', text: 'Restore your answers from a code you saved' }),
      h('div', { class: 'row' }, code, h('button', { class: 'btn small', type: 'submit', text: 'Restore' })), msg)
  ];
}
function aboutView() {
  const fill = (name, kids) => { const slot = $about && $about.querySelector('[data-slot="' + name + '"]'); if (slot) slot.replaceChildren(...[].concat(kids)); };
  fill('dimensions', dimensionList()); fill('camps', campTable()); fill('data', dataControls());
  return h('main', { class: 'about-view' },
    h('h1', { class: 'about-title', tabindex: -1, 'data-focus': true, text: 'About AI Compass' }),
    $about || h('p', { text: 'The About text is part of the page’s HTML and is missing here. See ' + PROJECT_URL }));
}

// ---------- router ----------
// kind: 'view' animates the whole page in, 'chart' only lets the chart marks move.
function render(focus, kind) {
  cancelQuizTransition();
  afterRender = []; mounted = []; sail = !!kind;
  if (typeof nameWatchers !== 'undefined') nameWatchers = [];
  if (st.view === 'result' && !st.viewing && !canRead()) st.view = 'intro';
  if (st.viewing && st.viewing.friend != null && !st.friends[st.viewing.friend]) st.viewing = null;
  const view = st.view === 'quiz' ? quizView() : st.view === 'result' ? resultView() : st.view === 'about' ? aboutView() : introView();
  if (kind === 'view' && !still()) view.classList.add('enter');
  document.body.setAttribute('data-view', st.view);
  $app.replaceChildren(...[topBar(), view, st.view !== 'quiz' && footer()].filter(Boolean));
  afterRender.forEach(f => f());
  sail = false;
  save();
  if (focus) { const el = $app.querySelector('[data-focus]'); if (el) el.focus({ preventScroll: true }); }
}
// Every change of view goes through here, and into the browser history, so the back button works.
function go(view, opts) {
  if (view === 'about' && st.view !== 'about') st.from = st.view;
  editOne = null; st.view = view; hideTip();
  if (!(opts && opts.pop)) {
    const clean = /^#(demo|about)/i.test(location.hash) ? location.pathname + location.search : undefined;   // leave those addresses behind
    try { history.pushState({ v: view, w: st.viewing }, '', clean); } catch (e) { /* sandboxed frame: no history */ }
  }
  render(true, 'view');
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', e => {
  const s = e.state;
  if (!s || !s.v) return;                    // a plain hash change: readHash handles it
  st.viewing = s.w || null;
  go(s.v, { pop: true });
});

// A link can carry a friend's result as #r-CODE, open the About page as #about,
// or open an example result as #demo or #demo-2 (for teaching and presentations).
function readHash() {
  const hash = location.hash || '';
  const demo = /^#demo(?:-([12]))?$/i.exec(hash);
  if (demo) { st.viewing = { demo: demo[1] === '2' ? 1 : 0 }; st.view = 'result'; st.tab = 'dims'; return; }
  if (/^#about$/i.test(hash)) { if (st.view !== 'about') st.from = st.view; st.view = 'about'; return; }
  const m = /^#r-(.+)$/i.exec(hash);
  if (!m) return;
  const d = decodeCode(m[1]);
  if (!d) { st.note = 'That link’s result code is damaged or incomplete, so nothing was added. Ask your friend to copy the link again.'; return; }
  if (answered() && bodyOf(encodeCode(d.resp, '')) === bodyOf(encodeCode(st.resp, ''))) return;
  if (addFriend(m[1])) return;
  const who = d.name || 'A friend';
  if (canRead()) { st.view = 'result'; st.viewing = null; st.tab = 'compare'; }
  else { st.view = 'intro'; st.note = who + ' sent you their result. Take the quiz and you will both be on the chart.'; }
}
window.addEventListener('hashchange', () => { readHash(); render(); });

function start(data) {
  if ($about) $about.remove();
  $app.setAttribute('data-ready', '');
  load();
  Object.assign(st, sanitize(data));
  readHash();
  try { history.replaceState({ v: st.view, w: st.viewing }, ''); } catch (e) { /* sandboxed frame */ }
  render();
}
// Boot once every script has loaded. window.claude.hot is an optional host hook for live previews.
document.addEventListener('DOMContentLoaded', () => {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(snapshot);
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
});
