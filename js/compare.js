'use strict';
// The Compare view of the result page: your code and link, friends' codes, and what each comparison shows.
// Everything is worked out in the browser from the codes; nothing about anyone's answers is stored elsewhere.

// Copies text and reports on the button. `field` is an input holding the same text, used when the clipboard is blocked.
function copyText(text, b, label, field) {
  const done = ok => { b.textContent = ok ? 'Copied' : 'Select the text and copy it'; setTimeout(() => { b.textContent = label; }, 2200); };
  const fallback = () => {
    const row = b.parentElement;
    let target = field || row.querySelector('.copy-fallback');
    if (!target) {
      target = h('textarea', { class: 'copy-fallback', readonly: true, rows: 4 });
      row.append(target);
    }
    target.value = text;
    if (target !== field) target.setAttribute('aria-label', label + ': select and copy this text');   // `field` keeps its own label
    target.focus(); target.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    done(ok);
  };
  try { navigator.clipboard.writeText(text).then(() => done(true), fallback); } catch (e) { fallback(); }
}
// The address a comparison link points at: this page when it is served over http(s), outside a frame.
const shareBase = () => (!framed && /^https?:$/.test(location.protocol) ? location.href.split('#')[0] : null);
const myCode = () => encodeCode(st.resp, st.name);
const myLink = () => (shareBase() ? shareBase() + '#r-' + myCode() : null);

// Fields that show your name or code register here, so typing a name in one place updates the others.
let nameWatchers = [];
function setName(value, from) {
  st.name = cleanName(value);
  save();
  nameWatchers.forEach(f => f(from));
}

// One dimension, two people: both positions on the same scale, with the distance between them shaded.
function pairRow(k, a, b, gap) {
  const A = AXES[k], sa = a.sc[k].score, sb = b.sc[k].score, both = sa !== null && sb !== null;
  const ra = axisRead(k, a.sc[k]), rb = axisRead(k, b.sc[k]);
  return h('div', { class: 'pair' },
    h('div', { class: 'pair-head' }, h('b', { text: A.short }), h('span', { class: 'num', text: both ? Math.round(gap) + ' apart' : 'not scored for both' })),
    h('div', { class: 'scale' },
      h('span', { class: 'pole a', text: A.low[0] }),
      h('div', { class: 'track', role: 'img', 'aria-label': A.short + '. ' + a.name + ': ' + ra.title + '. ' + b.name + ': ' + rb.title + '.' + (both ? ' ' + Math.round(gap) + ' apart.' : '') },
        h('span', { class: 'zone' }), h('span', { class: 'line' }),
        h('span', { class: 'end', style: 'left:0' }), h('span', { class: 'end', style: 'right:0' }), h('span', { class: 'mid' }),
        both && gap > 0 && h('span', { class: 'gap', style: 'left:' + (50 + Math.min(sa, sb) / 2) + '%;width:' + gap / 2 + '%' }),
        sa !== null && h('span', { class: 'dot', style: 'left:' + (50 + sa / 2) + '%' }),
        sb !== null && tip(h('button', { class: 'fr', type: 'button', style: 'left:' + (50 + sb / 2) + '%', 'aria-label': b.name + ': ' + rb.title }), b.name, [rb.title, rb.num])),
      h('span', { class: 'pole b', text: A.high[0] })));
}

// The comparison between a (the result on screen) and b (a friend, or the other example).
function pairBlock(a, b) {
  const c = compare(a.sc, b.sc);
  if (c.agreement === null) return h('p', { class: 'hint', text: 'No dimension has a score for both of you yet.' });
  const on = k => AXES[k].short + '. ' + a.name + ': ' + axisRead(k, a.sc[k]).title + '. ' + b.name + ': ' + axisRead(k, b.sc[k]).title + '. ' + Math.round(c.gap[k]) + ' apart.';
  const sw = kid => sv('svg', { width: 22, height: 22, viewBox: '0 0 22 22', 'aria-hidden': 'true' }, kid);
  const apart = k => c.gap[k] >= 40;   // the same line "Worth talking about" draws: closer is agreement, further is disagreement
  return [
    h('dl', { class: 'facts' },
      h('dt', { text: 'Overall' }), h('dd', null, h('b', { text: alignWord(c.agreement) }), ', alignment ' + Math.round(c.agreement * 100) + ' of 100.'),
      h('dt', { text: apart(c.near) ? 'Smallest difference' : 'Strongest agreement' }), h('dd', { text: on(c.near) }),
      c.far && c.gap[c.far] > 0 && [h('dt', { text: apart(c.far) ? 'Strongest disagreement' : 'Largest difference' }), h('dd', { text: on(c.far) })]),
    h('ul', { class: 'legend' },
      h('li', null, sw(sv('circle', { class: 'c-you-o', cx: 11, cy: 11, r: 6 })), a.name),
      h('li', null, sw(sv('rect', { class: 'c-friend', x: 5.5, y: 5.5, width: 11, height: 11, transform: 'rotate(45 11 11)' })), b.name),
      h('li', null, sw(sv('rect', { class: 'c-gap', x: 2, y: 8, width: 18, height: 6, rx: 3 })), 'Distance between you')),
    h('div', { class: 'pairs' }, KEYS.map(k => pairRow(k, a, b, c.gap[k]))),
    h('div', { class: 'talk' },
      h('h4', { text: 'Worth talking about' }),
      c.talk.length ? h('ul', null, c.talk.map(k => h('li', null, h('b', { text: AXES[k].short + ', ' + Math.round(c.gap[k]) + ' apart' }), TALK[k])))
        : h('p', { text: 'You are within 40 points of each other on every dimension. Ask each other which position you hold most firmly, and what would change it.' }))
  ];
}

function comparePanel(who, sc, fr) {
  const self = who.kind === 'self', me = { name: self ? 'You' : who.name, sc: sc };
  const out = [];

  if (self) {
    const code = h('input', { type: 'text', id: 'your-code', readonly: true, value: myCode(), 'aria-describedby': 'code-hint', onfocus: e => e.target.select() });
    const name = h('input', { type: 'text', id: 'your-name', maxlength: 20, value: st.name, autocomplete: 'off', oninput: e => setName(e.target.value, name) });
    nameWatchers.push(from => { code.value = myCode(); if (from !== name) name.value = st.name; });
    const err = h('p', { class: 'err', role: 'alert' });
    const copyCode = btn('Copy code', 'small', () => copyText(myCode(), copyCode, 'Copy code', code));
    const copyLink = myLink() && btn('Copy comparison link', 'small', () => copyText(myLink(), copyLink, 'Copy comparison link'));
    const theirs = h('input', { type: 'text', id: 'friend-code', autocomplete: 'off', spellcheck: 'false', placeholder: CODE_PREFIX + '-… or a link' });
    const addIt = e => {
      e.preventDefault();
      if (!theirs.value.trim()) { err.textContent = 'Paste a friend’s code or link first.'; return; }
      const msg = addFriend(theirs.value);
      if (msg) { err.textContent = msg; return; }
      render(false, 'chart');
      const el = document.querySelector('details.friend:last-of-type');
      if (el) { el.open = true; el.scrollIntoView({ block: 'nearest' }); }
    };
    out.push(h('div', { class: 'share' },
      h('div', null,
        h('div', { class: 'field' }, h('label', { for: 'your-name', text: 'Your name, to show beside your mark (optional)' }), name),
        h('div', { class: 'field' }, h('label', { for: 'your-code', text: 'Your code' }),
          code, h('div', { class: 'row' }, copyLink, copyCode),
          h('p', { class: 'hint', id: 'code-hint', text: 'Send the link or the code to a friend. It holds your answer to every statement, so share it with people you are happy to show them to.' }))),
      h('form', { onsubmit: addIt },
        h('div', { class: 'field' }, h('label', { for: 'friend-code', text: 'A friend’s code or link' }),
          h('div', { class: 'row' }, theirs, h('button', { class: 'btn small', type: 'submit', text: 'Compare' })), err),
        fr.length === 0 && h('p', { class: 'hint', text: 'Paste what a friend sent you. You will see how closely you line up, where you agree most, where you differ most, and a couple of questions to talk over. Up to ' + MAX_FRIENDS + ' friends fit.' }))));
  } else if (who.kind === 'demo') {
    out.push(h('p', { class: 'hint', text: 'Both profiles here are made up. On your own result, this view compares you with friends who send you their link.' }));
  } else if (!fr.length) {
    out.push(h('p', { class: 'hint', text: 'Take the quiz yourself to see how you and ' + who.name + ' compare.' }));
  }

  fr.forEach((f, n) => out.push(h('details', { class: 'friend', open: n === 0 },
    h('summary', null, h('b', { text: (self ? 'You' : who.name) + ' and ' + f.name }),
      (() => { const ag = agreement(sc, f.sc); return h('span', { text: ag === null ? 'nothing in common yet' : alignWord(ag) + ', ' + Math.round(ag * 100) + ' of 100' }); })()),
    pairBlock(me, f),
    self && h('div', { class: 'row', style: 'margin-top:16px' },
      btn('See ' + possessive(f.name) + ' full result', 'small', () => { st.viewing = { friend: f.i }; st.tab = 'dims'; go('result'); }),
      btn('Remove', 'quiet', () => { st.friends.splice(f.i, 1); render(); })))));

  if (fr.length) {
    const pos = compass(k => sc[k].score), theirs = fr.map(f => compass(k => f.sc[k].score));
    const rows = KEYS.map(k => [AXES[k].short + ': ' + AXES[k].low[0] + ' (−) to ' + AXES[k].high[0] + ' (+)', sc[k].score, fr.map(f => f.sc[k].score)]);
    rows.push(['Compass, left to right: distributed (−) to concentrated (+)', pos.x, theirs.map(c => c.x)]);
    rows.push(['Compass, bottom to top: speed (−) to caution (+)', pos.y, theirs.map(c => c.y)]);
    const cell = v => h('td', { text: v === null ? '–' : num(v) });
    out.push(
      h('p', { class: 'hint how', text: 'How alignment is worked out: on each dimension you both have a score for, take the distance between the two scores (0 to 200). Alignment is 100 minus the average distance, and 0 once the average reaches 100. It describes these two sets of answers and nothing more.' }),
      h('details', null, h('summary', { text: 'Scores as a table' }),
        h('div', { class: 'tbl' }, h('table', null,
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Dimension' }), h('th', { scope: 'col', text: me.name }), fr.map(f => h('th', { scope: 'col', text: f.name })))),
          h('tbody', null, rows.map(r => h('tr', null, h('td', { text: r[0] }), cell(r[1]), r[2].map(cell))))))));
  }
  return out;
}
