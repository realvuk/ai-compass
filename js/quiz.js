'use strict';
// The landing page and the quiz. Uses the helpers and state in ui.js.

const ROUTES = {
  quick: { name: 'Quick exploration', meta: SHORT_FORM + ' questions · about 3 minutes' },
  full: { name: 'Full exploration', meta: ITEMS.length + ' questions · about 8 minutes' }
};

function beginQuiz(mode) { st.mode = mode; st.idx = 0; st.viewing = null; st.restored = false; go('quiz'); }
function resumeQuiz(mode) { if (mode) st.mode = mode; st.idx = firstOpen(); st.viewing = null; go('quiz'); }
function seeResult() { st.viewing = null; go('result'); }
function seeDemo() { st.viewing = { demo: 0 }; st.tab = 'dims'; go('result'); }

function introView() {
  const some = touched() > 0, left = leftInRoute(), fr = friends();
  const sc = scoreAxes(st.resp), me = canRead() ? compass(k => sc[k].score) : null;
  const cta = [];
  let fine;
  if (!some) {
    cta.push(btn('Discover your AI worldview', 'primary', () => beginQuiz(st.pick), { 'data-focus': true }));
    cta.push(btn('See an example result', '', seeDemo));
    fine = 'The quick route gives a provisional result from two statements per dimension. You can carry on to all 48 afterwards without losing an answer.';
  } else if (left > 0) {
    cta.push(btn('Continue at question ' + (firstOpen() + 1), 'primary', () => resumeQuiz(), { 'data-focus': true }));
    if (canRead()) cta.push(btn('See your result so far', '', seeResult));
    cta.push(eraseBtn('Start over'));
    fine = 'Your answers are saved in this browser only.';
  } else {
    const quick = st.mode === 'quick' && touched() < ITEMS.length;
    cta.push(btn(quick ? 'See your provisional result' : 'See your result', 'primary', seeResult, { 'data-focus': true }));
    if (quick) cta.push(btn('Continue to all ' + ITEMS.length + ' questions', '', () => resumeQuiz('full')));
    cta.push(eraseBtn('Retake the quiz'));
    fine = 'Your answers are saved in this browser only.';
  }
  const routes = !some && h('fieldset', { class: 'modes' },
    h('legend', { text: 'Choose a route' }),
    Object.keys(ROUTES).map(m => h('label', { class: 'mode' },
      h('input', { type: 'radio', name: 'route', value: m, checked: st.pick === m, onchange: () => { st.pick = m; } }),
      h('b', { text: ROUTES[m].name }), h('span', { text: ROUTES[m].meta }))));

  const top = me ? rank(sc)[0] : null;
  const chart = h('figure', { class: 'chart' },
    compassBox({
      label: 'Chart of eleven reference camps by caution and concentration',
      camps: campPoints(),
      you: me && me.x !== null && me.y !== null && { x: me.x, y: me.y, name: 'You', camp: top && top.name },
      friends: fr.map(f => Object.assign(compass(k => f.sc[k].score), { name: f.name })).filter(f => f.x !== null && f.y !== null)
    }),
    h('figcaption', { text: 'A preview of the 2D compass with its eleven illustrative reference camps. Left to right: how concentrated control of AI should be. Bottom to top: how much caution it calls for. Your full result covers all eight dimensions.' }));

  return h('main', null,
    h('div', { class: 'hero' },
      h('div', null,
        h('p', { class: 'eyebrow', text: 'Eight debates shaping the future of AI' }),
        h('h1', { text: 'Where do you stand on AI?' }),
        h('p', { class: 'tagline', text: 'AI isn’t one debate. It’s eight.' }),
        h('p', { class: 'lede', text: 'Explore your views on AI safety, openness, technological progress, economic power, and the future of artificial intelligence. Discover which perspectives you align with—and where you disagree.' }),
        st.note && h('p', { class: 'notice', role: 'status', text: st.note }),
        routes,
        h('div', { class: 'row' }, cta),
        h('p', { class: 'fine', text: fine }),
        h('ul', { class: 'assure', 'aria-label': 'Good to know' },
          ['8 dimensions', 'No account needed', 'No tracking', 'Answers stay in your browser'].map(t => h('li', { text: t }))),
        h('p', { class: 'credit' }, 'Created by ', link(AUTHOR_URL, 'Vuk Dinić'), ', computational sociologist and data scientist.'),
        fr.length > 0 && !canRead() && h('div', { class: 'row' }, fr.map(f => btn('See ' + possessive(f.name) + ' result', 'small', () => { st.viewing = { friend: f.i }; go('result'); })))),
      chart),
    h('section', null,
      h('h2', { text: 'How it works' }),
      h('ol', { class: 'steps' },
        h('li', null, h('h3', { text: 'Rate statements' }), h('p', { text: 'Agree or disagree with short statements about AI. Each has a plain-language note, and you can skip any you are unsure about.' })),
        h('li', null, h('h3', { text: 'See all eight dimensions' }), h('p', { text: 'Your result shows where you fall on each of the eight debates, what you hold most firmly, and which reference camp sits closest.' })),
        h('li', null, h('h3', { text: 'Compare and discuss' }), h('p', { text: 'Send a friend your link to see where you agree and where you differ, or save your result as an image.' }))),
      h('div', { class: 'row', style: 'margin-top:20px' }, btn('See an example result', 'small', seeDemo),
        h('span', { class: 'hint', text: 'Two made-up profiles, clearly labelled, for a look around before you start.' }))),
    h('section', null,
      h('h2', { text: 'The eight debates' }),
      h('ul', { class: 'axes-list' }, KEYS.map(k => h('li', null,
        h('h3', { text: AXES[k].short }),
        h('p', { text: AXES[k].q }),
        h('div', { class: 'versus' }, h('span', { text: AXES[k].low[0] }), h('i'), h('span', { text: AXES[k].high[0] })))))),
    h('section', { class: 'creator' },
      h('h2', { text: 'Who made this' }),
      h('p', null, 'AI Compass was created by ', link(AUTHOR_URL, 'Vuk Dinić'), ', a computational sociologist and data scientist working at the intersection of artificial intelligence, social science, and technology’s impact on society. It is an independent interpretation inspired by Kristin Houser’s ',
        link(SOURCE_URL, '“10 perspectives that divide the AI world”', true), ' for Big Think.'),
      h('div', { class: 'row' }, btn('About, methodology and privacy', 'small', () => go('about')), h('a', { class: 'btn small', href: PROJECT_URL, text: 'Project page on vukdinic.com' }))));
}

// ---------- the quiz ----------
// The quiz view is built once; moving between questions only repaints the parts kept in quizEls,
// so the progress marks can animate and nothing else on the page jumps.
let quizEls = null, quizTimer = 0;

function cancelQuizTransition() {
  clearTimeout(quizTimer); quizTimer = 0; busy = false;
}

function quizView() {
  const total = quizTotal();
  const ticks = h('div', { class: 'ticks', 'aria-hidden': 'true' }, ORDER.slice(0, total).map(() => h('i')));
  const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Quiz progress', 'aria-valuemin': 0, 'aria-valuemax': total }, ticks);
  const count = h('span', { id: 'q-count' }), about = h('span');
  const back = btn('Back', 'small', () => step(-1)), next = btn('Next', 'small', () => step(1));
  const stop = btn('', 'small', () => { if (editOne) backToAxis(); else seeResult(); });
  quizEls = { total: total, ticks: Array.from(ticks.children), bar: bar, count: count, about: about, card: h('div', { class: 'q-card' }), back: back, next: next, stop: stop };
  const main = h('main', { class: 'quiz' }, bar,
    h('div', { class: 'count' }, count, about),
    quizEls.card,
    h('div', { class: 'quiz-nav' }, back, stop, next),
    h('p', { class: 'keys', text: 'Keyboard: 1 to 5 to answer, 0 to skip, arrow keys to move.' }));
  paintQuiz();
  return main;
}

// Fills in the current question and brings the progress marks and the navigation up to date.
function paintQuiz() {
  const q = quizEls, i = ORDER[st.idx], it = ITEMS[i], cur = st.resp['q' + i], has = ('q' + i) in st.resp;
  let done = 0;
  q.ticks.forEach((el, n) => {
    const key = 'q' + ORDER[n], seen = key in st.resp;
    if (seen) done++;
    el.className = (n === st.idx ? 'now' : seen ? (st.resp[key] === null ? 'skip' : 'done') : '') + (q.total > SHORT_FORM && n === SHORT_FORM - 1 ? ' gate' : '');
  });
  q.bar.setAttribute('aria-valuenow', done);
  q.bar.setAttribute('aria-valuetext', done + ' of ' + q.total + ' answered or skipped');
  q.count.textContent = 'Question ' + (st.idx + 1) + ' of ' + q.total;
  q.about.textContent = 'About: ' + AXES[it[0]].short.toLowerCase();
  const status = !has ? 'Not answered yet. Neutral counts as a middle answer; skipping leaves the statement out of your score.'
    : cur === null ? 'Skipped. It is left out of your score, not counted as neutral. Saved.'
      : 'Your answer: ' + ANSWER[cur] + '. Saved.';
  q.card.replaceChildren(
    h('h1', { class: 'statement', tabindex: -1, 'data-focus': true, 'aria-describedby': 'q-count', text: it[2] }),
    h('div', { class: 'likert', role: 'group', 'aria-label': 'Your answer' }, LIKERT.map((l, n) =>
      h('button', { type: 'button', 'data-v': l[0], 'aria-pressed': String(cur === l[0]), onclick: () => answer(l[0]) },
        h('span', { text: l[1] }), h('kbd', { text: n + 1 })))),
    h('div', { class: 'under' },
      h('details', { class: 'note' }, h('summary', { text: 'What does this mean?' }), h('p', { text: it[3] })),
      h('button', { class: 'btn quiet', type: 'button', 'data-v': 'null', 'aria-pressed': String(has && cur === null), text: 'Not sure, skip this one', onclick: () => answer(null) })),
    h('p', { class: 'q-status', text: status }));
  const last = st.idx >= q.total - 1, left = leftInRoute();
  q.back.disabled = st.idx === 0 || !!editOne;
  q.next.disabled = !has || !!editOne || (last && !canRead());
  q.next.textContent = last ? 'See result' : 'Next';
  q.stop.hidden = !editOne && (!canRead() || last);
  q.stop.textContent = editOne ? 'Cancel and go back to the result' : left ? 'Stop here and see a provisional result' : 'See your result';
}

function backToAxis() {
  const k = editOne;
  st.viewing = null; st.tab = 'dims'; go('result');
  const el = document.getElementById('axis-' + k);
  if (el) el.scrollIntoView({ block: 'center' });
}

// Slides the current question out, swaps it, and slides the next one in. While `busy` is set, further
// answers and key presses are ignored, so fast clicking can neither skip a question nor overlap two.
function turn(d) {
  const card = quizEls.card;
  const swap = () => {
    st.idx += d; paintQuiz(); save(); busy = false;
    const head = card.querySelector('.statement');
    if (head) head.focus({ preventScroll: true });
    if (still()) return;
    card.classList.remove('out', 'in'); void card.offsetWidth; card.classList.add('in');
  };
  busy = true;
  if (still()) { swap(); return; }
  card.style.setProperty('--dir', d);
  card.classList.remove('in'); card.classList.add('out');
  quizTimer = setTimeout(swap, 80);
}

function answer(v) {
  if (busy || st.view !== 'quiz') return;
  st.resp['q' + ORDER[st.idx]] = v;
  save();
  quizEls.card.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(v))));
  busy = true;
  quizTimer = setTimeout(() => {             // long enough to see the pressed answer
    busy = false;
    if (editOne) backToAxis();               // came here to change one answer: go straight back to that dimension
    else if (st.idx >= quizEls.total - 1) seeResult();
    else turn(1);
  }, still() ? 0 : 110);
}
function step(d) {
  const n = st.idx + d;
  if (busy || editOne || n < 0 || st.view !== 'quiz') return;
  if (d > 0 && !(('q' + ORDER[st.idx]) in st.resp)) return;
  if (n >= quizEls.total) { if (canRead()) seeResult(); return; }
  turn(d);
}
document.addEventListener('keydown', e => {
  if (st.view !== 'quiz' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key >= '1' && e.key <= '5') { answer(LIKERT[+e.key - 1][0]); e.preventDefault(); }
  else if (e.key === '0') { answer(null); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
});
