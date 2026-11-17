// Browser tests for the critical paths, run in headless Chrome with no dependencies:
//   node tools/e2e.mjs
// Exits with 1 if any check fails. The pure logic is tested separately by `node --test`.
import { serve, open, sleep } from './cdp.mjs';

const server = await serve(), base = server.url;
let failed = 0, passed = 0;
const check = (name, ok, detail) => { if (ok) passed++; else { failed++; console.log('  ✖ ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); } };
const group = async (name, opts, fn) => {
  const page = await open(opts);
  const before = failed;
  try { await fn(page); check(name + ': no script errors', page.errors.length === 0, page.errors); }
  catch (e) { failed++; console.log('  ✖ ' + name + ' threw: ' + e.message); }
  await page.close();
  console.log((failed === before ? '✔ ' : '✖ ') + name);
};
const seed = (page, js) => page.eval(`localStorage.setItem('ai-compass-v2', JSON.stringify(${js}))`);
const answerKeys = async (page, keys, wait = 330) => { for (const k of keys) { await page.key(k); await sleep(wait); } };
const fresh = async page => { await page.goto(base); await page.eval('localStorage.clear()'); await page.goto(base + '?t=' + Math.random()); await sleep(250); };
const V01 = 'AIC2-PNG9WP-NG9WPN-G9WPNG-9WPNG9-NX-C5BD696761';      // a code issued by v0.1, with the name Žiga
const desktop = { width: 1280, height: 800 }, phone = { width: 390, height: 844, scale: 2, mobile: true };

await group('static page without JavaScript', { ...desktop, js: false }, async p => {
  await p.goto(base);
  const doc = await p.cmd('DOM.getDocument', { depth: -1 });      // scripts are off, so read the DOM through the protocol
  const html = (await p.cmd('DOM.getOuterHTML', { nodeId: doc.root.nodeId })).outerHTML;
  check('headline is in the HTML', html.includes('<h1>Where do you stand on AI?</h1>'));
  check('about text is in the HTML', html.includes('id="privacy"') && html.includes('not a scientifically validated'));
  check('noscript notice is present', html.includes('The quiz needs JavaScript to run'));
  check('page is not hidden when scripts are off', !/<html[^>]*class="js"/.test(html));
});

await group('landing page', desktop, async p => {
  await fresh(p);
  check('headline', (await p.text('h1')) === 'Where do you stand on AI?');
  check('tagline', (await p.text('.tagline')) === 'AI isn’t one debate. It’s eight.');
  check('primary call to action', await p.eval(`!!Array.from(document.querySelectorAll('.btn.primary')).find(b => b.textContent === 'Discover your AI worldview')`));
  check('quick route is preselected', await p.eval(`document.querySelector('input[name=route]:checked').value === 'quick'`));
  check('creator credit links to vukdinic.com', await p.eval(`document.querySelector('.credit a').href === 'https://vukdinic.com/'`));
  check('eight dimensions are listed', await p.eval(`document.querySelectorAll('.axes-list li').length === 8`));
  check('compass preview is drawn', await p.eval(`document.querySelectorAll('.compass svg .c-camp').length === 11`));
  check('call to action is above the fold', await p.eval(`document.querySelector('.btn.primary').getBoundingClientRect().bottom < innerHeight`));
  check('headline takes two lines, not three, on a desktop screen', await p.eval(`document.querySelector('.hero h1').getBoundingClientRect().height < 2.5 * parseFloat(getComputedStyle(document.querySelector('.hero h1')).fontSize) * 1.05`));
});

await group('quick route, then continuing to the full one', desktop, async p => {
  await fresh(p);
  await p.click('button', 'Discover your AI worldview'); await sleep(450);
  check('quiz shows question 1 of 16', (await p.text('#q-count')) === 'Question 1 of 16');
  check('Next is disabled until an answer is given', await p.eval(`Array.from(document.querySelectorAll('.quiz-nav .btn')).find(b => b.textContent === 'Next').disabled`));
  await answerKeys(p, ['5', '3', '0']);                        // strongly agree, neutral, skip
  const three = await p.eval(`JSON.stringify(ORDER.slice(0, 3).map(i => st.resp['q' + i]))`);
  check('strongly agree, neutral and skip are stored as 2, 0 and null', three === '[2,0,null]', three);
  await p.key('ArrowLeft'); await sleep(330);
  check('going back shows the skipped question as skipped', /^Skipped/.test(await p.text('.q-status')) && (await p.eval(`document.querySelector('[data-v=null]').getAttribute('aria-pressed')`)) === 'true');
  await p.key('ArrowLeft'); await sleep(330);
  check('going back keeps the earlier answer pressed', (await p.eval(`document.querySelector('[data-v="0"]').getAttribute('aria-pressed')`)) === 'true' && /Neutral/.test(await p.text('.q-status')));
  check('focus is on the question after a change', await p.eval(`document.activeElement.classList.contains('statement')`));
  await p.key('ArrowRight'); await sleep(330); await p.key('ArrowRight'); await sleep(330);
  await answerKeys(p, '4215342153421'.split(''));
  check('after 16 questions the result opens', (await p.eval('st.view')) === 'result');
  check('the result is marked provisional', /Provisional result/.test(await p.text('.partial')));
  check('skipped statement is not scored as neutral', await p.eval(`scoreAxes(st.resp)[ITEMS[ORDER[2]][0]].n === 1`));
  const before = await p.eval(`JSON.stringify(st.resp)`);
  await p.click('button', 'Answer the remaining'); await sleep(450);
  check('continuing starts at question 17 of 48', (await p.text('#q-count')) === 'Question 17 of 48');
  check('earlier answers are kept', await p.eval(`ORDER.slice(0, 16).every(i => JSON.stringify(st.resp['q' + i]) === JSON.stringify(${before}['q' + i]))`));
  await answerKeys(p, Array.from({ length: 32 }, (_, i) => String(1 + (i * 3) % 5)), 300);
  check('after 48 the result is no longer provisional', (await p.eval('st.view')) === 'result' && !(await p.eval(`!!Array.from(document.querySelectorAll('.partial')).find(e => /Provisional/.test(e.textContent))`)));
  check('all 48 statements are stored', (await p.eval('touched()')) === 48);
  await p.goto(base + '?reload=1'); await sleep(500);
  check('a reload returns to the saved result', (await p.eval('st.view')) === 'result' && (await p.eval('touched()')) === 48);
});

await group('rapid input and browser history', desktop, async p => {
  await fresh(p);
  await p.click('button', 'Discover your AI worldview'); await sleep(450);
  for (let i = 0; i < 12; i++) await p.key('4');
  await sleep(700);
  check('hammering a key never skips an unanswered question', await p.eval(`ORDER.slice(0, st.idx).every(i => ('q' + i) in st.resp) && touched() === st.idx`), await p.eval('st.idx + "/" + touched()'));
  await p.eval('history.back()'); await sleep(450);
  check('browser back leaves the quiz for the landing page', (await p.eval('st.view')) === 'intro');
  await p.eval('history.forward()'); await sleep(450);
  check('browser forward returns to the quiz', (await p.eval('st.view')) === 'quiz');
});

for (const reducedMotion of [false, true]) {
  await group('held answer key, reduced motion ' + reducedMotion, { ...desktop, reducedMotion }, async p => {
    await fresh(p);
    await p.click('button', 'Discover your AI worldview'); await sleep(450);
    const key = { key: '4', code: 'Digit4', windowsVirtualKeyCode: 52, text: '4' };
    await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
    for (let i = 0; i < 12; i++) {
      await sleep(60);
      await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', ...key, autoRepeat: true });
    }
    await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...key }); await sleep(300);
    check('one held key answers exactly one question', await p.eval('touched() === 1 && st.idx === 1'), await p.eval('touched()'));
    await p.key('2'); await sleep(330);
    check('a fresh press answers the next question', await p.eval('touched() === 2 && st.resp["q" + ORDER[1]] === -1'));
  });
}

await group('leaving the quiz cancels pending transitions', desktop, async p => {
  await fresh(p);
  await p.eval(`(() => {
    st.mode = 'quick'; st.idx = 15;
    st.resp = Object.fromEntries(ORDER.slice(0, 15).map(i => ['q' + i, 1])); go('quiz');
  })()`);
  await sleep(400);
  await p.eval(`(() => { document.querySelector('.likert button').click(); document.querySelector('.top-right button').click(); })()`);
  await sleep(350);
  check('About stays open after the final-answer feedback delay', (await p.eval('st.view')) === 'about');
  check('the answer was saved before leaving', await p.eval('st.resp["q" + ORDER[15]] === -2'));
  await p.eval(`(() => { st.idx = 0; go('quiz'); step(1); go('about'); go('quiz'); })()`);
  await sleep(300);
  check('a canceled slide cannot advance the replacement quiz', await p.eval('st.idx === 0 && document.getElementById("q-count").textContent === "Question 1 of 16"'));
  await p.key('5'); await sleep(330);
  check('the replacement quiz accepts new input', await p.eval('st.resp["q" + ORDER[0]] === 2 && st.idx === 1'));
  await p.eval(`(() => { answer(1); location.hash = '#about'; })()`); await sleep(350);
  check('hash navigation also cancels the pending advance', await p.eval('st.view === "about" && st.idx === 1'));
});

await group('restore a quick result with skipped answers', desktop, async p => {
  await fresh(p);
  const code = await p.eval(`encodeCode(Object.fromEntries(ORDER.slice(0, 16).map((i, n) => ['q' + i, n === 4 ? null : 1])), 'Mira')`);
  await p.click('button', 'About'); await sleep(400);
  await p.eval(`document.getElementById('restore-code').value = ${JSON.stringify(code)}`);
  await p.click('.about-text button[type=submit]'); await sleep(400);
  check('a restored result opens with 15 numeric answers', await p.eval('st.view === "result" && answered() === 15'));
  check('restoration invents no answers or skipped markers', await p.eval('touched() === 15 && !("q" + ORDER[4] in st.resp)'));
  await p.goto(base + '?restored=1'); await sleep(400);
  check('the partial result stays readable after reload', await p.eval('st.view === "result" && canRead() && answered() === 15'));
  if ((await p.eval('st.view')) === 'result') {
    await p.click('button', 'Answer the remaining'); await sleep(400);
    check('continuation starts at the first missing answer', (await p.text('#q-count')) === 'Question 5 of 48');
  } else check('continuation starts at the first missing answer', false);
  check('invalid imports leave the current answers intact', await p.eval(`(() => { const before = JSON.stringify(st.resp); return !!importOwn('broken') && JSON.stringify(st.resp) === before; })()`));
  await p.eval(`(() => { eraseAll(); beginQuiz('quick'); answer(1); })()`); await sleep(330);
  check('erasing restores the normal 16-question result gate', await p.eval('touched() === 1 && !canRead()'));
  await p.eval(`(() => { eraseAll(); importOwn(encodeCode({}, '')); seeResult(); })()`);
  check('an all-skipped code gives an explicitly unscored result', await p.eval('st.view === "result" && touched() === 0 && KEYS.every(k => scoreAxes(st.resp)[k].score === null)'));
  await p.eval(`(() => { home(); beginQuiz('quick'); answer(1); })()`); await sleep(330);
  check('starting a fresh quiz clears restored-result eligibility', await p.eval('touched() === 1 && !canRead()'));
});

await group('clipboard failure leaves selectable text', desktop, async p => {
  await fresh(p);
  await p.eval(`(() => { st.resp = answersFor([50, 25, -75, -50, 50, -25, 0, -75]); go('result'); document.execCommand = () => false; })()`);
  const summary = await p.eval('summaryText(subject())'), comparison = await p.eval('myLink()');
  for (const unavailable of [true, false]) {
    await p.eval(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: ${unavailable ? 'undefined' : '{ writeText: () => Promise.reject(new Error("Denied")) }'} })`);
    await p.eval(`document.querySelectorAll('#share .row:last-of-type button')[0].click()`); await sleep(100);
    check('summary can be selected when clipboard is ' + (unavailable ? 'missing' : 'denied'), await p.eval(`(() => { const f = document.activeElement; return f.tagName === 'TEXTAREA' && f.readOnly && f.value === ${JSON.stringify(summary)} && f.selectionStart === 0 && f.selectionEnd === f.value.length && !!f.getAttribute('aria-label'); })()`));
    await p.eval(`document.querySelectorAll('#share .row:last-of-type button')[1].click()`); await sleep(100);
    check('comparison link is available for manual copying', await p.eval(`document.activeElement.tagName === 'TEXTAREA' && document.activeElement.value === ${JSON.stringify(comparison)}`));
  }
  check('repeated failures reuse one fallback field', (await p.eval(`document.querySelectorAll('#share textarea').length`)) === 1);
  await p.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  check('the manual-copy field fits a phone screen', await p.eval('document.documentElement.scrollWidth <= innerWidth && document.querySelector("#share textarea").getBoundingClientRect().width > 0'));
  await p.eval(`(() => { st.tab = 'compare'; render(); })()`);
  await p.click('.views button', 'Copy code'); await sleep(100);
  check('a failed code copy selects the code field and keeps its label', await p.eval(`(() => { const f = document.getElementById('your-code'); return document.activeElement === f && !f.hasAttribute('aria-label') && f.labels[0].textContent === 'Your code'; })()`));
});

await group('partial coverage and comparison descriptions', desktop, async p => {
  await fresh(p);
  await p.eval(`(() => { st.resp = Object.fromEntries(ORDER.slice(0, 40).map(i => ['q' + i, ITEMS[i][1]])); st.mode = 'full'; go('result'); })()`);
  check('40-answer result does not claim two answers per dimension', /40 of 48/.test(await p.text('.partial')) && !/two per dimension/.test(await p.text('main.result')));
  await p.eval(`(() => {
    st.resp = answersFor(Array(8).fill(100));
    st.friends = [{ code: encodeCode(answersFor(Array(8).fill(-100)), 'Opposite'), name: 'Opposite' }];
    st.tab = 'compare'; render();
  })()`);
  const comparison = await p.text('details.friend .facts');
  check('opposite poles are not described as agreement', /200 apart/.test(comparison) && !/Strongest agreement/.test(comparison) && /Smallest difference/.test(comparison), comparison);
  await p.eval(`(() => {
    st.resp = answersFor(Array(8).fill(50));
    st.friends = [{ code: encodeCode(answersFor([75, 50, 50, 50, 50, 50, 50, 50]), 'Close'), name: 'Close' }];
    render();
  })()`);
  const close = await p.text('details.friend .facts');
  check('near-identical profiles are not described as disagreeing', /Strongest agreement/.test(close) && /Largest difference/.test(close) && !/disagreement/.test(close), close);
});

await group('result page: views, summary, camps, unanswered dimensions', desktop, async p => {
  await p.goto(base);
  // a full result except that the two War statements of the quick route were skipped and the rest of War never answered
  await seed(p, `(() => { const resp = answersFor([50, 25, -75, 0, 50, -25, 0, -75]); ITEMS.forEach((it, i) => { if (it[0] === 'D4') delete resp['q' + i]; });
    ORDER.slice(0, 16).forEach(i => { if (ITEMS[i][0] === 'D4') resp['q' + i] = null; }); return { view: 'result', idx: 47, resp, name: 'Vuk', friends: [], mode: 'full' }; })()`);
  await p.goto(base + '?r=1'); await sleep(700);
  check('three views, eight dimensions first', (await p.eval(`Array.from(document.querySelectorAll('[role=tab]')).map(t => t.textContent + ':' + t.getAttribute('aria-selected')).join('|')`)) === 'Eight dimensions:true|2D compass:false|Compare:false');
  check('all eight dimensions are shown', (await p.eval(`document.querySelectorAll('.panel .axis').length`)) === 8);
  check('an unanswered dimension reads "Not scored", not neutral', (await p.text('#axis-D4 .read b')) === 'Not scored' && await p.eval(`document.querySelector('#axis-D4').classList.contains('none') && !document.querySelector('#axis-D4 .dot')`));
  check('each scored dimension has poles, a position mark and a worded score', await p.eval(`Array.from(document.querySelectorAll('.axis:not(.none)')).every(a => a.querySelectorAll('.pole').length === 2 && a.querySelector('.dot') && a.querySelector('.read b').textContent)`));
  check('summary names the firmest position', /^Access: Firmly Open-Sourcer/.test(await p.eval(`document.querySelector('.brief dd').textContent`)));
  check('three closest camps with same-side and opposite-side dimensions', (await p.eval(`document.querySelectorAll('.camp-cards li').length`)) === 3 && /Same side on/.test(await p.text('.camp-cards li')));
  check('similarity is not presented as a percentage', !(/\d%/.test(await p.text('.result-head'))) && /not a probability/.test(await p.text('.match')));
  await p.eval(`document.getElementById('tab-dims').focus()`); await p.key('ArrowRight'); await sleep(450);
  check('arrow key moves to the 2D compass view', (await p.eval('st.tab')) === 'map' && await p.eval(`document.activeElement.id === 'tab-map' && !!document.querySelector('.panel .compass svg')`));
  check('the compass says it is a projection', /simplified projection/.test(await p.text('.projection')));
  await p.key('ArrowRight'); await sleep(450);
  check('arrow key moves to Compare', (await p.eval('st.tab')) === 'compare' && await p.eval(`!!document.querySelector('#friend-code')`));
  check('every button and tab has a name', await p.eval(`Array.from(document.querySelectorAll('button, [role=tab]')).every(b => (b.textContent || b.getAttribute('aria-label') || '').trim().length > 0)`));
  check('every image has alt text', await p.eval(`Array.from(document.querySelectorAll('img')).every(i => i.alt)`));
});

await group('share codes and comparison links', desktop, async p => {
  await p.goto(base);
  await seed(p, `{ view: 'result', idx: 47, resp: answersFor([50, 25, -75, -50, 50, -25, 0, -75]), name: 'Vuk', friends: [], mode: 'full' }`);
  const mine = await p.eval(`encodeCode(answersFor([50, 25, -75, -50, 50, -25, 0, -75]), 'Vuk')`);
  const friend = await p.eval(`encodeCode(answersFor([-25, -50, -75, 25, -50, 50, 75, -25]), 'Mira')`);
  await p.goto(base + '?a=1#r-' + friend); await sleep(700);
  check('a comparison link adds the friend and opens Compare', (await p.eval('st.friends.length + ":" + st.view + ":" + st.tab')) === '1:result:compare');
  check('comparison has overall, agreement, disagreement and eight rows', /Strongest agreement/.test(await p.text('details.friend')) && /Strongest disagreement/.test(await p.text('details.friend')) && (await p.eval(`document.querySelectorAll('details.friend .pair').length`)) === 8);
  check('comparison offers something to talk about', (await p.eval(`document.querySelectorAll('.talk li').length`)) >= 1);
  check('the comparison link carries the full code', (await p.eval('myLink()')) === base + '?a=1#r-' + mine, await p.eval('myLink()'));
  await p.goto(base + '?b=1#r-' + V01); await sleep(700);
  check('a code issued by v0.1 still works, name included', (await p.eval(`st.friends.map(f => f.name).join(',')`)) === 'Mira,Žiga');
  await p.goto(base + '?c=1#r-' + V01.replace('PNG9WP', 'PNG9WQ')); await sleep(700);
  check('a damaged code adds nobody and says why', (await p.eval('st.friends.length')) === 2 && /damaged or incomplete/.test(await p.eval('st.note')));
  await p.goto(base + '?d=1#r-' + mine); await sleep(700);
  check('your own code is not added as a friend', (await p.eval('st.friends.length')) === 2);
  check('friends survive a reload', (await p.eval(`JSON.parse(localStorage.getItem('ai-compass-v2')).friends.length`)) === 2);
});

await group('saved state from v0.1 (no route stored)', desktop, async p => {
  await p.goto(base);
  await seed(p, `{ view: 'quiz', idx: 20, resp: Object.fromEntries(ORDER.slice(0, 20).map((i, n) => ['q' + i, n % 5 - 2])), name: '', friends: [{ code: '${V01}', name: 'Žiga' }] }`);
  await p.goto(base + '?v=1'); await sleep(500);
  check('the quiz resumes where it was, on the full route', (await p.text('#q-count')) === 'Question 21 of 48' && (await p.eval('st.mode')) === 'full');
  check('answers and friends are kept', (await p.eval('touched() + ":" + st.friends.length')) === '20:1');
});

await group('demo mode', desktop, async p => {
  await fresh(p);
  await p.click('button', 'See an example result'); await sleep(700);
  check('the example is labelled as made up', /Illustrative example/.test(await p.text('.partial.demo')) && /made-up profile/.test(await p.text('.partial.demo')));
  check('the example has a full result', (await p.eval(`document.querySelectorAll('.panel .axis').length`)) === 8);
  check('the demo stores no answers', (await p.eval(`Object.keys(JSON.parse(localStorage.getItem('ai-compass-v2')).resp).length`)) === 0);
  await p.click('button', 'See the other example'); await sleep(600);
  check('the second example opens', (await p.eval('JSON.stringify(st.viewing)')) === '{"demo":1}');
  await p.goto(base + '?p=1#demo-2'); await sleep(700);
  check('#demo-2 opens the second example directly', (await p.eval('st.view + JSON.stringify(st.viewing)')) === 'result{"demo":1}');
  await p.goto(base + '?q=1'); await sleep(400);
  check('without the address, a reload lands on the landing page', (await p.eval('st.view')) === 'intro');
  await seed(p, `{ view: 'result', idx: 47, resp: answersFor([50, 25, -75, -50, 50, -25, 0, -75]), name: '', friends: [], mode: 'full' }`);
  const own = await p.eval(`localStorage.getItem('ai-compass-v2')`);
  await p.goto(base + '?s=1#demo'); await sleep(700);
  check('viewing the demo leaves your own answers untouched', (await p.eval(`JSON.stringify(JSON.parse(localStorage.getItem('ai-compass-v2')).resp)`)) === JSON.stringify(JSON.parse(own).resp));
});

await group('result image and summary', desktop, async p => {
  await p.goto(base);
  await seed(p, `{ view: 'result', idx: 47, resp: answersFor([50, 25, -75, -50, 50, -25, 0, -75]), name: 'Vuk', friends: [], mode: 'full' }`);
  await p.goto(base + '?i=1'); await sleep(1000);
  const size = () => p.eval(`(() => { const c = document.querySelector('canvas.card'); return c.width + 'x' + c.height; })()`);
  // counts pixels in the accent colour: proof that the bars were really drawn
  const inked = () => p.eval(`(() => { const c = document.querySelector('canvas.card'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === 0xB3 && d[i + 1] === 0x20 && d[i + 2] === 0x6F) n++; return n; })()`);
  check('square image is 1080 by 1080 and drawn', (await size()) === '1080x1080' && (await inked()) > 5000);
  await p.eval(`(() => { const r = document.querySelector('input[name=shape][value=portrait]'); r.checked = true; r.dispatchEvent(new Event('change')); })()`); await sleep(500);
  check('portrait image is 1080 by 1350 and drawn', (await size()) === '1080x1350' && (await inked()) > 5000);
  check('the image exports as a PNG', /^data:image\/png;base64,/.test(await p.eval(`document.querySelector('canvas.card').toDataURL('image/png').slice(0, 30)`)));
  const text = await p.eval('summaryText(subject())');
  const published = await p.eval(`document.querySelector('link[rel=canonical]').href`);
  check('copied summary has the result and the published address but no answers code', /Firmest position/.test(text) && text.includes(published) && !/AIC2|127\.0\.0\.1/.test(text), text);
  check('download, copy summary and copy link are offered', await p.eval(`['Download PNG', 'Copy summary', 'Copy comparison link'].every(t => Array.from(document.querySelectorAll('#share .btn')).some(b => b.textContent === t))`));
});

await group('about, erase and restore', desktop, async p => {
  await p.goto(base);
  await seed(p, `{ view: 'intro', idx: 5, resp: answersFor([50, 25, -75, -50, 50, -25, 0, -75]), name: 'Vuk', friends: [], mode: 'full' }`);
  const code = await p.eval(`encodeCode(answersFor([50, 25, -75, -50, 50, -25, 0, -75]), 'Vuk')`);
  await p.goto(base + '?ab=1#about'); await sleep(500);
  check('#about opens the About view', (await p.text('h1')) === 'About AI Compass');
  check('the About view carries methodology, privacy and the required principle', await p.eval(`['scoring', 'projection', 'camps', 'quick', 'limits', 'privacy', 'creator', 'feedback'].every(id => document.getElementById(id)) && document.querySelector('.about-text').textContent.includes('This is an exploratory educational tool, not a scientifically validated psychological or political test.')`));
  check('camp profiles and the eight dimensions are filled in', await p.eval(`document.querySelectorAll('[data-slot=camps] tbody tr').length === 11 && document.querySelectorAll('[data-slot=dimensions] li').length === 8`));
  await p.click('.about-text .btn', 'Erase everything'); await sleep(100);
  check('erasing asks for a second press', (await p.eval('touched()')) === 48);
  await p.click('.about-text .btn', 'Press again'); await sleep(500);
  check('the second press erases the stored data', (await p.eval(`touched() + ":" + localStorage.getItem('ai-compass-v2').includes('"resp":{}')`)) === '0:true');
  await p.click('button', 'About'); await sleep(450);
  await p.eval(`(() => { const i = document.getElementById('restore-code'); i.value = ${JSON.stringify(code)}; })()`);
  await p.click('.about-text button[type=submit]'); await sleep(600);
  check('a saved code restores your own answers', (await p.eval('touched() + ":" + st.name + ":" + st.view')) === '48:Vuk:result');
});

await group('reduced motion', { ...desktop, reducedMotion: true }, async p => {
  await fresh(p);
  await p.click('button', 'Discover your AI worldview'); await sleep(60);
  check('no entrance animation is applied', await p.eval(`!document.querySelector('main.enter') && getComputedStyle(document.querySelector('.q-card')).animationName === 'none'`));
  // 60 ms apart: with transitions on, most of these presses would land while the quiz is busy and be ignored
  await answerKeys(p, Array(16).fill('2'), 60); await sleep(200);
  check('the quiz runs without waiting for transitions', (await p.eval('st.view')) === 'result' && (await p.eval('touched()')) === 16);
});

await group('phone: layout, tap targets, stable controls', phone, async p => {
  await fresh(p);
  const overflow = () => p.eval('document.documentElement.scrollWidth <= innerWidth');
  check('landing page does not scroll sideways', await overflow());
  check('call to action is on the first screen', await p.eval(`document.querySelector('.btn.primary').getBoundingClientRect().bottom < innerHeight`));
  await p.click('button', 'Discover your AI worldview'); await sleep(500);
  check('quiz does not scroll sideways', await overflow());
  check('the whole question and its answers fit on one screen', await p.eval(`document.querySelector('.quiz-nav').getBoundingClientRect().bottom <= innerHeight + 1`));
  check('answer and navigation targets are at least 44px tall', await p.eval(`Array.from(document.querySelectorAll('.likert button, .quiz-nav .btn, .under .btn')).filter(b => !b.hidden).every(b => b.getBoundingClientRect().height >= 44)`));
  const tops = [];
  for (let i = 0; i < 6; i++) { tops.push(await p.eval(`Math.round(document.querySelector('.likert').getBoundingClientRect().top)`)); await p.click('.likert button'); await sleep(340); }
  check('answer buttons stay in the same place from question to question', new Set(tops).size === 1, tops);
  check('the page did not scroll while answering', (await p.eval('scrollY')) === 0);
  await p.goto(base + '?m=1#demo'); await sleep(700);
  check('result page does not scroll sideways', await overflow());
  check('all three view tabs fit on the screen', await p.eval(`Array.from(document.querySelectorAll('[role=tab]')).every(t => { const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })`));
  await p.click('#tab-compare'); await sleep(500);
  check('comparison does not scroll sideways', await overflow());
});

await group('phone held sideways', { width: 844, height: 390, scale: 2, mobile: true }, async p => {
  await fresh(p);
  await p.click('button', 'Discover your AI worldview'); await sleep(500);
  check('answers sit in one row', await p.eval(`new Set(Array.from(document.querySelectorAll('.likert button')).map(b => Math.round(b.getBoundingClientRect().top))).size === 1`));
  check('question and answers are visible without scrolling', await p.eval(`document.querySelector('.likert').getBoundingClientRect().bottom <= innerHeight`));
});

for (const dark of [false, true]) {
  await group('colour contrast, ' + (dark ? 'dark' : 'light') + ' theme', { ...desktop, dark }, async p => {
    await fresh(p);
    const v = JSON.parse(await p.eval(`JSON.stringify(Object.fromEntries(['paper', 'surface', 'ink', 'ink-2', 'muted', 'accent', 'on-accent', 'accent-wash', 'friend'].map(n => [n, getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim()])))`));
    const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(v[a]), lum(v[b])].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    check('theme is applied', dark ? lum(v.paper) < 0.1 : lum(v.paper) > 0.8, v.paper);
    for (const [fg, bg, min] of [['ink', 'paper', 7], ['ink-2', 'paper', 4.5], ['muted', 'paper', 4.5], ['ink', 'surface', 7], ['ink-2', 'surface', 4.5], ['muted', 'surface', 4.5],
      ['on-accent', 'accent', 4.5], ['accent', 'paper', 4.5], ['ink', 'accent-wash', 7], ['friend', 'surface', 3]]) {
      check(fg + ' on ' + bg + ' is at least ' + min + ':1', ratio(fg, bg) >= min, +ratio(fg, bg).toFixed(2));
    }
  });
}

await group('requests leave the page only for the typeface', desktop, async p => {
  const hosts = new Set();
  await p.cmd('Network.enable');
  p.on(m => { if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) hosts.add(new URL(m.params.request.url).hostname); });
  await fresh(p);
  await p.goto(base + '?n=1#demo'); await sleep(900);
  await p.click('#tab-map'); await sleep(300);
  const outside = [...hosts].filter(h => h !== '127.0.0.1').sort();
  check('only Google Fonts is contacted', outside.every(h => h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com'), outside);
});

await group('page weight and layout stability', desktop, async p => {
  const shift = () => p.eval(`new Promise(done => { let s = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; })
    .observe({ type: 'layout-shift', buffered: true }); setTimeout(() => done(s), 1500); })`);
  await fresh(p);
  const cls = await shift();
  check('landing page: cumulative layout shift under 0.1', cls < 0.1, +cls.toFixed(4));
  const bytes = await p.eval(`performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin)).reduce((t, r) => t + r.decodedBodySize, 0) + performance.getEntriesByType('navigation')[0].decodedBodySize`);
  check('landing page: HTML, CSS, JS and icons under 250 kB before compression', bytes > 50000 && bytes < 250000, bytes);
  await p.goto(base + '?w=1#demo');
  const cls2 = await shift();
  check('result page: cumulative layout shift under 0.1', cls2 < 0.1, +cls2.toFixed(4));
  console.log('  (landing ' + Math.round(bytes / 1024) + ' kB uncompressed, layout shift ' + cls.toFixed(3) + ' / ' + cls2.toFixed(3) + ')');
});

server.close();
console.log('\n' + passed + ' checks passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
