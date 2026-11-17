'use strict';
// Result images and the "Share your result" section. The image is drawn on a canvas in the browser:
// nothing is uploaded and no outside service is involved.

const CARDS = { square: { w: 1080, h: 1080, label: 'Square' }, portrait: { w: 1080, h: 1350, label: 'Portrait' } };
// The light chart-paper colors, fixed so an image looks the same whichever theme the page is in.
const INK = '#12243A', INK2 = '#44566A', MUTED = '#627080', PAPER = '#F2F5F4', SURFACE = '#FBFCFC', ISLAND = '#EFE3B9', ACCENT = '#B3206F', RULE = '#C4CFD4';
const CARD_FONT = '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';

// Where the app lives, for the footer of an image and the end of a copied summary. No answers in it.
// Opened from a file, in a frame or on a development host, it is the published address from <link rel="canonical">.
function siteUrl() {
  const canon = document.querySelector('link[rel="canonical"]');
  const local = !shareBase() || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  return (local && canon && canon.href) || location.origin + location.pathname;
}

// Draws one result image. o: { w, h, title, resp, site, demo }
function drawCard(canvas, o) {
  const W = o.w, H = o.h, tall = H > W, ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const sc = scoreAxes(o.resp), lines = summaryLines(o.resp);
  const n = ITEMS.reduce((t, it, i) => t + (typeof o.resp['q' + i] === 'number' ? 1 : 0), 0);
  const font = (weight, px) => { ctx.font = weight + ' ' + px + 'px ' + CARD_FONT; };
  const put = (s, x, y, color, align) => { ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); };
  const wrap = (s, max) => {
    const out = []; let cur = '';
    s.split(' ').forEach(word => {
      const next = cur ? cur + ' ' + word : word;
      if (cur && ctx.measureText(next).width > max) { out.push(cur); cur = word; } else cur = next;
    });
    if (cur) out.push(cur);
    return out;
  };
  const rule = (y, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); };
  const L = 84, R = W - 84, CW = R - L;

  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(36, 36, W - 72, H - 72);

  // identity
  let y = 114;
  ctx.fillStyle = SURFACE; ctx.strokeStyle = ACCENT; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(L + 16, y - 12, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(L + 16, y - 12, 5.5, 0, Math.PI * 2); ctx.fill();
  font(700, 34); put('AI Compass', L + 46, y, INK);
  font(500, 19); put('Eight debates shaping the future of AI', R, y - 3, INK2, 'right');
  rule(y + 24, INK, 2);

  // whose result, and the closest camp
  // a made-up or provisional result says so beside the title
  const flag = o.demo ? 'Made-up example' : n < ITEMS.length ? 'Provisional · ' + n + ' of ' + ITEMS.length + ' statements' : '';
  font(600, 18);
  const flagW = flag ? ctx.measureText(flag).width + 28 : 0;
  let size = tall ? 54 : 42;
  font(700, size);
  while (size > 26 && ctx.measureText(o.title).width > CW - flagW) { size -= 2; font(700, size); }
  y += 24 + (tall ? 78 : 56);
  put(o.title, L, y, INK);
  if (flag) { font(600, 18); put(flag, R, y - 2, ACCENT, 'right'); }
  const v = verdict(sc);
  font(500, 20);
  y += 29;
  put(v.kind === 'camp' ? 'Closest reference camp: ' + v.top.name + ' · ' + Math.round(v.top.sim * 100) + ' of 100'
    : v.kind === 'thin' ? 'Not enough answers yet to compare with the reference camps'
      : v.kind === 'uncharted' ? 'No reference camp is close enough to name' : 'Near the center, so no reference camp is named', L, y, INK2);

  // the summary and the footer are laid out from the bottom up, and the eight rows take what is left
  const footY = H - 74;
  // the square has room for one line of summary, the portrait for three
  const picks = lines.filter(l => l.label === 'Firmest position' || (tall && /^(Most balanced|Most torn|Least settled|Unusual pairing)$/.test(l.label)));
  font(500, 20);
  const notes = picks.map(l => wrap(l.label + ': ' + l.text, CW));
  const notesH = notes.reduce((t, w) => t + w.length * 27 + 8, 0);
  const notesTop = footY - 44 - notesH;
  const top = y + (tall ? 44 : 24), rowH = (notesTop - 18 - top) / KEYS.length;

  KEYS.forEach((k, i) => {
    const A = AXES[k], a = sc[k], rd = axisRead(k, a), y0 = top + i * rowH, ty = y0 + (tall ? 47 : 44), mid = L + CW / 2;
    const X = v => L + (v + 100) / 200 * CW;
    font(700, 23); put(A.short, L, y0 + 24, INK);
    font(500, 19); put(rd.title + (rd.side ? ', ' + rd.num : ''), R, y0 + 24, a.score === null ? MUTED : INK2, 'right');
    if (a.score === null) {
      ctx.setLineDash([8, 8]); rule(ty, MUTED, 2); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = ISLAND; ctx.fillRect(X(-ZONE), ty - 10, X(ZONE) - X(-ZONE), 20);
      rule(ty, INK2, 1.5);
      ctx.strokeStyle = INK2; ctx.lineWidth = 1.5;
      [L, R].forEach(x => { ctx.beginPath(); ctx.moveTo(x, ty - 8); ctx.lineTo(x, ty + 8); ctx.stroke(); });
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mid, ty - 15); ctx.lineTo(mid, ty + 15); ctx.stroke();
      ctx.fillStyle = ACCENT; ctx.fillRect(Math.min(mid, X(a.score)), ty - 6, Math.abs(X(a.score) - mid), 12);
      ctx.fillStyle = SURFACE; ctx.strokeStyle = ACCENT; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(X(a.score), ty, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    font(rd.side < 0 ? 700 : 500, 16); put(A.low[0], L, ty + 28, rd.side < 0 ? INK : MUTED);
    font(rd.side > 0 ? 700 : 500, 16); put(A.high[0], R, ty + 28, rd.side > 0 ? INK : MUTED, 'right');
  });

  y = notesTop;
  rule(y - 8, RULE, 1.5);
  font(500, 20);
  notes.forEach(w => { w.forEach(t => { y += 27; put(t, L, y, INK); }); y += 8; });

  rule(footY - 30, INK, 2);
  font(700, 21); put(o.site.replace(/^https?:\/\//, '').replace(/\/$/, ''), L, footY + 4, INK);
  font(500, 16.5);
  put('Exploratory tool, not a validated test.', R, footY + 3, MUTED, 'right');
}

// The result as plain text, for pasting into a message. It carries no answers and no code.
function summaryText(who) {
  const head = who.kind === 'demo' ? who.name + ', an illustrative profile (AI Compass)' : (st.name ? possessive(st.name) : 'My') + ' AI worldview (AI Compass)';
  return [head].concat(summaryLines(who.resp).map(l => l.label + ': ' + l.text),
    ['', 'Where do you stand on AI? ' + siteUrl(), 'An exploratory tool, not a validated test.']).join('\n');
}

function shareSection(who) {
  if (who.kind === 'friend') return null;
  const demo = who.kind === 'demo';
  let shape = 'square';
  const canvas = h('canvas', { class: 'card', width: 1080, height: 1080, role: 'img', 'aria-label': 'Preview of the result image. It shows the eight dimensions and the summary given above.' });
  const title = () => (demo ? who.name + ', an illustrative profile' : st.name ? possessive(st.name) + ' AI worldview' : 'My AI worldview');
  const fonts = document.fonts && document.fonts.load
    ? Promise.all(['500', '700'].map(w => document.fonts.load(w + ' 20px "IBM Plex Mono"'))).catch(() => {}) : Promise.resolve();
  const paint = () => fonts.then(() => drawCard(canvas, { w: CARDS[shape].w, h: CARDS[shape].h, title: title(), resp: who.resp, site: siteUrl(), demo: demo }));
  const blob = () => new Promise(done => canvas.toBlob(done, 'image/png'));
  const file = () => 'ai-compass-' + (demo ? 'example' : 'result') + '-' + CARDS[shape].w + 'x' + CARDS[shape].h + '.png';

  const name = !demo && h('input', { type: 'text', id: 'card-name', maxlength: 20, value: st.name, autocomplete: 'off', placeholder: 'Leave empty to stay anonymous', oninput: e => setName(e.target.value, name) });
  if (name) nameWatchers.push(from => { if (from !== name) name.value = st.name; paint(); });
  const shapes = h('fieldset', { class: 'modes shapes' }, h('legend', { text: 'Format' }),
    Object.keys(CARDS).map(s => h('label', { class: 'mode' },
      h('input', { type: 'radio', name: 'shape', value: s, checked: s === shape, onchange: () => { shape = s; canvas.classList.toggle('tall', s === 'portrait'); paint(); } }),
      h('b', { text: CARDS[s].label }), h('span', { text: CARDS[s].w + ' × ' + CARDS[s].h + ' PNG' }))));

  const save = btn('Download PNG', 'primary', () => paint().then(blob).then(b => {
    const a = h('a', { href: URL.createObjectURL(b), download: file() });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }));
  // The device's own share sheet, where there is one. It gets the image if files can be shared, the text otherwise.
  const send = navigator.share && btn('Share…', '', () => paint().then(blob).then(b => {
    const img = new File([b], file(), { type: 'image/png' });
    const withImage = navigator.canShare && navigator.canShare({ files: [img] });
    return navigator.share(withImage ? { files: [img], title: 'AI Compass', text: title() } : { title: 'AI Compass', text: summaryText(who) });
  }).catch(() => { /* the visitor closed the share sheet */ }));
  const copySum = btn('Copy summary', '', () => copyText(summaryText(who), copySum, 'Copy summary'));
  const copyLink = !demo && myLink() && btn('Copy comparison link', '', () => copyText(myLink(), copyLink, 'Copy comparison link'));

  afterRender.push(paint);
  return h('section', { class: 'sharing', id: 'share' },
    h('h2', { text: demo ? 'Save this example as an image' : 'Share your result' }),
    h('div', { class: 'share' },
      h('figure', { class: 'card-box' }, canvas,
        h('figcaption', { text: 'The image is drawn in your browser. It shows the eight dimensions and the summary, and none of your individual answers.' })),
      h('div', null,
        name && h('div', { class: 'field' }, h('label', { for: 'card-name', text: 'Name on the image (optional)' }), name),
        shapes,
        h('div', { class: 'row', style: 'margin-top:18px' }, save, send),
        h('div', { class: 'row', style: 'margin-top:10px' }, copySum, copyLink),
        h('p', { class: 'hint', style: 'margin-top:12px', text: demo ? 'The image is marked as a made-up example.'
          : 'The image and the summary describe your result without your answers. The comparison link does contain your answers, so a friend can compare with you: send it only to people you are happy to show them to.' }))));
}
