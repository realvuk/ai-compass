'use strict';
// The result page: headline, summary, three views of the same result (eight dimensions, 2D compass,
// compare) and the closest reference camps. The Compare view is in compare.js, the image export in card.js.

const TABS = [['dims', 'Eight dimensions'], ['map', '2D compass'], ['compare', 'Compare']];

// Whose result is on screen: your own, one a friend shared, or a synthetic example.
function subject() {
  const w = st.viewing;
  if (w && w.demo != null && DEMOS[w.demo]) return { kind: 'demo', name: DEMOS[w.demo].name, resp: DEMOS[w.demo].resp, blurb: DEMOS[w.demo].blurb, i: w.demo };
  if (w && w.friend != null) { const f = friends()[w.friend]; if (f) return { kind: 'friend', name: f.name, resp: f.resp }; }
  return { kind: 'self', name: 'You', resp: st.resp };
}
const axisNames = ks => ks.map(k => AXES[k].short).join(', ');

function axisBlock(k, a, self, resp, fr) {
  const A = AXES[k], rd = axisRead(k, a), s = a.score, none = s === null;
  const mine = ORDER.filter(i => ITEMS[i][0] === k);
  const track = h('div', { class: 'track', role: 'img',
    'aria-label': A.short + ': ' + rd.title + ', ' + rd.num + '. The scale runs from ' + A.low[0] + ' on the left to ' + A.high[0] + ' on the right.' },
    h('span', { class: 'zone' }), h('span', { class: 'line' }),
    h('span', { class: 'end', style: 'left:0' }), h('span', { class: 'end', style: 'right:0' }), h('span', { class: 'mid' }),
    !none && Math.round(s) !== 0 && h('span', { class: 'fill ' + (s < 0 ? 'neg' : 'pos'), style: s < 0 ? 'left:' + (50 + s / 2) + '%;width:' + (-s / 2) + '%' : 'left:50%;width:' + (s / 2) + '%' }),
    !none && h('span', { class: 'dot', style: 'left:' + (50 + s / 2) + '%' }),
    fr.filter(f => f.sc[k].score !== null).map(f => {
      const r = axisRead(k, f.sc[k]);
      return tip(h('button', { class: 'fr', type: 'button', style: 'left:' + (50 + f.sc[k].score / 2) + '%', 'aria-label': f.name + ': ' + r.title }), f.name, [r.title, r.num]);
    }));
  const chips = [];
  if (a.conflict >= 0.5) chips.push(tip(h('span', { class: 'chip', tabindex: 0, text: 'Pulled both ways' }), 'Pulled both ways',
    ['Statements from both poles got agreement, so they cancel out. This is different from having no view.']));
  if (a.reject >= 0.5) chips.push(tip(h('span', { class: 'chip', tabindex: 0, text: 'Neither pole fits' }), 'Neither pole fits',
    ['Statements from both poles got disagreement, so they cancel out.']));
  return h('div', { class: 'axis' + (none ? ' none' : ''), id: 'axis-' + k },
    h('div', { class: 'axis-head' }, h('h3', { text: A.short }), h('p', { text: A.q })),
    h('div', { class: 'scale' },
      h('span', { class: 'pole a' + (rd.side < 0 ? ' on' : ''), text: A.low[0] }), track,
      h('span', { class: 'pole b' + (rd.side > 0 ? ' on' : ''), text: A.high[0] })),
    h('div', { class: 'read' }, h('b', { text: rd.title }), h('span', { class: 'num', text: rd.num }),
      !none && a.n < mine.length && h('span', { class: 'num', text: 'from ' + a.n + ' of ' + mine.length + ' statements' }), chips),
    none && h('p', { class: 'hint', text: 'Left out of the result. A dimension without answers is not treated as neutral.' }),
    h('details', null,
      h('summary', { text: 'The positions, and the answers behind this score' }),
      h('div', { class: 'defs' }, [A.low, A.mid, A.high].map(d => h('div', null, h('h4', { text: d[0] }), h('p', { text: d[1] })))),
      h('ul', { class: 'answers' }, mine.map(i => {
        const v = resp['q' + i], it = ITEMS[i], given = typeof v === 'number';
        const toward = it[1] === 1 ? A.high[0] : A.low[0];
        return h('li', null,
          h('p', { class: 'st', text: it[2] }),
          h('div', { class: 'an' },
            h('span', null, h('b', { text: given ? ANSWER[v] : ('q' + i) in resp ? 'Skipped' : 'Not answered yet' }), '. Agreeing points toward ' + toward + '.'),
            self && btn(given ? 'Change' : 'Answer', 'quiet', () => { st.idx = ORDER.indexOf(i); go('quiz'); editOne = k; paintQuiz(); })));
      }))));
}

// The 2D compass: a projection of five of the eight dimensions onto two directions.
function mapPanel(who, sc, sims, v, fr) {
  const self = who.kind === 'self', pos = compass(k => sc[k].score);
  const camps = campPoints(sims.length ? sims : null), topCamp = v.kind === 'camp' ? camps[0] : null;
  const havePos = pos.x !== null && pos.y !== null, quad = havePos ? quadrant(pos) : null;
  const is = self ? 'You are' : who.name + ' is';
  const friendPts = fr.map(f => {
    const c = compass(k => f.sc[k].score), t = rank(f.sc)[0];
    return Object.assign(c, { name: f.name, camp: t && t.name });
  }).filter(f => f.x !== null && f.y !== null);
  return h('div', { class: 'position' },
    h('figure', { class: 'chart' },
      compassBox({
        label: 'Chart of ' + (self ? 'your' : possessive(who.name)) + ' position among eleven reference camps',
        camps: camps, friends: friendPts,
        you: havePos && { x: pos.x, y: pos.y, name: who.name, camp: topCamp && topCamp.name },
        bearing: topCamp
      }),
      legend(havePos, who.name, friendPts.length > 0)),
    h('div', { class: 'reading' },
      h('p', { class: 'projection' }, h('b', { text: 'A simplified projection. ' }),
        'This chart folds five of the eight dimensions into two directions. War, labor and architecture are not on it at all, so it cannot stand in for the eight-dimension view.'),
      havePos ? [
        h('p', { class: 'big', text: quad ? is + ' in ' + quad[0] + ' waters: ' + quad[1] + '.' : is + ' on the island, the middle ground where neither direction dominates.' }),
        h('p', { text: 'Position: ' + whereText(pos) + ', on a scale of 100 each way.' }),
        topCamp && h('p', { text: 'The line points to ' + topCamp.name + ', the closest camp across all eight dimensions. It need not be the nearest mark on the chart, because the chart shows only five of them.' })
      ] : h('p', { text: 'Answer statements on risk, pace, access, compute or wealth to get a position.' }),
      h('p', { text: 'Left to right averages access, compute and wealth. Bottom to top averages risk and pace.' })));
}

function dimsPanel(who, sc, fr) {
  const self = who.kind === 'self', sw = kid => sv('svg', { width: 22, height: 22, viewBox: '0 0 22 22', 'aria-hidden': 'true' }, kid);
  return [
    h('ul', { class: 'legend dims-legend' },
      h('li', null, sw(sv('circle', { class: 'c-you-o', cx: 11, cy: 11, r: 6 })), self ? 'Your position' : possessive(who.name) + ' position'),
      fr.length > 0 && h('li', null, sw(sv('rect', { class: 'c-friend', x: 5.5, y: 5.5, width: 11, height: 11, transform: 'rotate(45 11 11)' })), fr.length === 1 ? fr[0].name : 'Friends'),
      h('li', null, sw(sv('rect', { class: 'c-island', x: 3, y: 5, width: 16, height: 12, rx: 2 })), 'Middle ground, within 25 of the center'),
      h('li', null, 'Scores run from 100 toward one pole to 100 toward the other')),
    KEYS.map(k => axisBlock(k, sc[k], self, who.resp, fr))
  ];
}

// The three closest camps, why they are close, and how the number is worked out.
function campsSection(who, sc, sims, n) {
  const self = who.kind === 'self';
  const more = btn('More about the reference camps', 'quiet', () => { go('about'); const el = document.getElementById('camps'); if (el) el.scrollIntoView(); });
  if (!sims.length) {
    return h('section', { class: 'camps' },
      h('h2', { text: 'Reference camps' }),
      h('p', { class: 'hint', text: 'No comparison with the eleven reference camps yet. It needs a score on at least five dimensions and a profile that is not flat: when nearly every score sits at the center, there is no direction to compare.' }),
      more);
  }
  return h('section', { class: 'camps' },
    h('h2', { text: 'Closest reference camps' }),
    h('p', { class: 'hint', text: 'The camps are illustrative models written for this project, not groups anyone belongs to. Here are the three whose profiles point most nearly the same way as ' + (self ? 'yours' : possessive(who.name)) + ', with the dimensions that explain why.' }),
    h('ol', { class: 'camp-cards' }, sims.slice(0, 3).map(r => {
      const c = contrast(sc, r.d), near = r.sim >= MIN_SIM;
      return h('li', null,
        h('div', { class: 'camp-top' }, h('h3', { text: r.name }), h('span', { class: 'sim', text: num(r.sim * 100) + ' of 100' })),
        h('span', { class: 'simbar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.max(0, Math.round(r.sim * 100)) + '%' })),
        !near && h('p', { class: 'chip', text: 'Too far to name as a match' }),
        h('p', { class: 'creed-s', text: r.creed }),
        h('dl', { class: 'facts' },
          h('dt', { text: 'Same side on' }), h('dd', { text: axisNames(c.same) || 'no dimension' }),
          h('dt', { text: 'Opposite side on' }), h('dd', { text: axisNames(c.opposite) || 'no dimension' })));
    })),
    h('div', { class: 'method' },
      h('p', { text: 'Similarity compares the direction of the eight scores with each camp’s profile (cosine similarity). 100 means the same direction on every dimension, 0 means unrelated, and below 0 means the opposite direction. It describes how alike two patterns are. It is not a probability of belonging to a camp, and it ignores how strongly the views are held. A camp is named as the closest only at 45 or more.' }),
      n < ITEMS.length && h('p', { text: 'This ranking rests on ' + n + ' of ' + ITEMS.length + ' statements. The order of the camps can change as more are answered.' }),
      h('p', { text: 'Public figures named beside a camp are rough signposts, based on positions they have argued in public. None of them took this quiz, and being named does not mean they endorse the profile.' })),
    h('details', null, h('summary', { text: 'All eleven camps, closest first' }),
      h('ol', { class: 'ranked' }, sims.map(r => tip(h('li', { tabindex: 0 }, h('span', { text: r.name }), h('span', { text: num(r.sim * 100) })), r.name, [r.creed])))),
    more);
}

// Tabs over one panel. Only the open view is in the page, and switching does not rebuild anything else.
function tabbed(panels) {
  const list = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Views of this result' });
  const panel = h('div', { class: 'panel', role: 'tabpanel', id: 'panel', tabindex: 0 });
  const mark = name => Array.from(list.children).forEach(b => {
    const on = b.getAttribute('data-tab') === name;
    b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
  });
  const show = (name, focus) => {
    st.tab = name; mark(name); hideTip();
    panel.setAttribute('aria-labelledby', 'tab-' + name);
    afterRender = []; sail = true;
    panel.replaceChildren(); add(panel, panels[name]());
    afterRender.forEach(f => f()); afterRender = []; sail = false;
    if (!still()) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); }
    if (focus) document.getElementById('tab-' + name).focus();
  };
  TABS.forEach(t => list.append(h('button', { type: 'button', role: 'tab', id: 'tab-' + t[0], 'data-tab': t[0], 'aria-controls': 'panel', text: t[1], onclick: () => show(t[0]) })));
  list.addEventListener('keydown', e => {
    const at = TABS.findIndex(t => t[0] === st.tab);
    const to = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (to < 0 && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    show(TABS[(to + TABS.length) % TABS.length][0], true);
  });
  if (!panels[st.tab]) st.tab = TABS[0][0];
  mark(st.tab);
  panel.setAttribute('aria-labelledby', 'tab-' + st.tab);
  add(panel, panels[st.tab]());
  return [list, panel];
}

function resultView() {
  const who = subject(), self = who.kind === 'self';
  const resp = who.resp, sc = scoreAxes(resp), v = verdict(sc), sims = similarities(sc);
  const n = answered(resp), left = ITEMS.length - touched();
  const whose = self ? 'Your' : possessive(who.name);
  // marks shown beside the subject's own: your friends, or the other example in the demo
  const fr = self ? friends() : who.kind === 'demo'
    ? DEMOS.filter((d, i) => i !== who.i).map(d => ({ name: d.name, resp: d.resp, sc: scoreAxes(d.resp), i: -1 }))
    : canRead() ? [{ name: 'You', resp: st.resp, sc: scoreAxes(st.resp), i: -1 }] : [];
  const mine = () => canRead() ? btn('Back to your result', 'small', seeResult)
    : btn(touched() ? 'Continue your own quiz' : 'Take the quiz yourself', 'small', () => (touched() ? resumeQuiz() : beginQuiz(st.pick)));

  const head = [];
  if (who.kind === 'demo') head.push(h('div', { class: 'partial demo', role: 'note' },
    h('span', null, h('b', { text: 'Illustrative example. ' }), who.name + ' is a made-up profile: ' + who.blurb + '. Nobody took the quiz to produce it, and your own answers are not touched.'),
    btn('See the other example', 'small', () => { st.viewing = { demo: (who.i + 1) % DEMOS.length }; render(true, 'view'); }), mine()));
  if (who.kind === 'friend') head.push(h('div', { class: 'partial' }, h('span', { text: 'You are looking at the result ' + who.name + ' shared.' }), mine()));
  if (self && st.note) head.push(h('p', { class: 'notice', role: 'status', text: st.note }));

  if (v.kind === 'camp') {
    head.push(
      h('p', { class: 'kicker' }, whose + ' closest reference camp ', h('span', { class: 'chip', text: 'illustrative model' })),
      h('h1', { class: 'camp-name', tabindex: -1, 'data-focus': true, text: v.top.name }),
      h('p', { class: 'match' }, 'Similarity ' + Math.round(v.top.sim * 100) + ' of 100', h('span', { text: ', ' + fitWord(v.top.sim) + '. A measure of direction, not a probability.' })),
      h('p', { class: 'creed', text: v.top.creed }),
      h('p', { class: 'about', text: v.top.about }),
      h('dl', { class: 'facts' },
        h('dt', { text: 'Critics say' }), h('dd', { text: v.top.critics }),
        h('dt', { text: 'Signposts' }), h('dd', { text: v.top.near })));
  } else {
    const copy = {
      thin: ['Not enough answers yet', 'A reading needs answers on at least five of the eight dimensions.'],
      middle: ['The middle ground', 'On most dimensions the answers sit near the center. On the compass that is the island: conditional, case-by-case positions instead of one camp’s whole package.'],
      torn: ['Pulled both ways', 'Statements from opposite sides both got agreement on most dimensions, so they cancel out. People who see force in both arguments land here, and no single camp matches that.'],
      uncharted: ['Uncharted waters', 'These are clear views in a combination none of the eleven reference camps shares. The eight dimensions below show where they fall.']
    }[v.kind];
    head.push(
      h('p', { class: 'kicker', text: whose + ' result' }),
      h('h1', { class: 'camp-name', tabindex: -1, 'data-focus': true, text: copy[0] }),
      h('p', { class: 'about', style: 'margin-top:20px', text: copy[1] }));
  }
  if (self && left > 0) head.push(h('div', { class: 'partial' },
    h('span', null, h('b', { text: 'Provisional result. ' }), 'It rests on ' + n + ' of ' + ITEMS.length + ' statements. Scores and the closest camp can still shift.'),
    btn('Answer the remaining ' + left, 'small', () => resumeQuiz('full'))));

  const brief = h('section', { class: 'brief' },
    h('h2', { text: self ? 'Your worldview in brief' : possessive(who.name) + ' worldview in brief' }),
    h('dl', { class: 'facts' }, summaryLines(resp).map(l => [h('dt', { text: l.label }), h('dd', { text: l.text })])),
    h('p', { class: 'hint', text: 'Written by fixed rules from the scores below. The same answers always give the same summary.' }));

  const views = h('section', { class: 'views' },
    h('h2', { class: 'sr', text: 'Three views of this result' }),
    tabbed({
      dims: () => dimsPanel(who, sc, fr),
      map: () => mapPanel(who, sc, sims, v, fr),
      compare: () => comparePanel(who, sc, fr)
    }));

  return h('main', { class: 'result' }, h('div', { class: 'result-head' }, head), brief, views,
    campsSection(who, sc, sims, n),
    shareSection(who),
    h('section', { class: 'method' },
      h('h2', { text: 'What this is, and is not' }),
      h('p', { text: 'This is an exploratory educational tool, not a scientifically validated psychological or political test. It shows where these answers fall on eight questions and is meant to start a conversation.' }),
      h('div', { class: 'row', style: 'margin-top:14px' }, btn('How the scoring works: About, methodology and privacy', 'small', () => go('about')))));
}
