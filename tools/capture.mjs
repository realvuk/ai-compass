// Makes the project's images from the running app, so they always show what the app really draws.
//
//   node tools/capture.mjs preview   assets/og-image.png (1200x630) and launch-assets/linkedin-promo.png (1200x1200)
//   node tools/capture.mjs shots     launch-assets/screenshots/*.png, example result cards, comparison graphic
//   node tools/capture.mjs video     launch-assets/demo.mp4, .webm, .gif and demo-poster.png (needs ffmpeg)
//
// Needs Chrome (set CHROME to its path if it is not found) and, for PNG shrinking, oxipng if installed.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { serve, open, sleep, ROOT } from './cdp.mjs';

const OUT = join(ROOT, 'launch-assets');
const shrink = file => { if (spawnSync('oxipng', ['-o', '4', '--strip', 'safe', '-q', file]).error) console.log('  (oxipng not found, left as is)'); };
const saveCanvas = async (page, file) => {
  const data = await page.eval(`document.querySelector('canvas.card').toDataURL('image/png')`);
  await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  shrink(file);
};

// ---------------------------------------------------------------- social preview

// Runs inside the app page: replaces the page with a poster built from the app's own logo and compass.
const poster = square => `(() => {
  const style = document.createElement('style');
  style.textContent = \`
    body { margin: 0; overflow: hidden; }
    .pv { box-sizing: border-box; width: 100vw; height: 100vh; padding: 28px; background: var(--paper); }
    .pv-frame { box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) 500px; gap: 36px; align-items: center;
      height: 100%; padding: 34px 40px 34px 48px; border: 3px solid var(--ink); }
    .pv-text { display: flex; flex-direction: column; height: 100%; }
    .pv-brand { display: flex; align-items: center; gap: 14px; font: 700 40px/1 var(--display); }
    .pv-eyebrow { margin-top: auto; font: 600 19px/1.3 var(--display); letter-spacing: .07em; text-transform: uppercase; color: var(--accent); }
    .pv-head { margin-top: 14px; font: 700 63px/1.08 var(--display); letter-spacing: -.015em; }
    .pv-sub { margin-top: 22px; font: 500 30px/1.25 var(--display); color: var(--ink-2); }
    .pv-by { margin-top: auto; padding-top: 16px; border-top: 2px solid var(--ink); font: 600 24px/1.3 var(--display); }
    .pv-chart .compass { zoom: 1.25; }
    .pv.sq .pv-frame { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); gap: 30px; padding: 44px 52px; }
    .pv.sq .pv-text { height: auto; }
    .pv.sq .pv-eyebrow { margin-top: 30px; }
    .pv.sq .pv-head { font-size: 76px; }
    .pv.sq .pv-by { margin-top: 26px; }
    .pv.sq .pv-chart { justify-self: center; align-self: center; }
    .pv.sq .pv-chart .compass { zoom: 1.6; }
  \`;
  document.head.append(style);
  const box = h('div', { class: 'compass', style: 'width:400px' });
  document.body.replaceChildren(h('div', { class: 'pv' + (${square} ? ' sq' : '') }, h('div', { class: 'pv-frame' },
    h('div', { class: 'pv-text' },
      h('div', { class: 'pv-brand' }, logo(44), h('span', { text: 'AI Compass' })),
      h('p', { class: 'pv-eyebrow', text: 'Where do you stand on AI?' }),
      h('p', { class: 'pv-head', text: 'AI isn’t one debate. It’s eight.' }),
      h('p', { class: 'pv-sub', text: 'Explore your AI worldview.' }),
      h('p', { class: 'pv-by', text: 'Created by Vuk Dinić' })),
    h('div', { class: 'pv-chart' }, box))));
  drawCompass(box, { label: 'Compass', camps: campPoints(), you: { x: -36, y: 44, name: 'You' } }, false);
})()`;

async function preview(base) {
  await mkdir(join(ROOT, 'assets'), { recursive: true });
  for (const [file, w, h, square] of [[join(ROOT, 'assets/og-image.png'), 1200, 630, false], [join(OUT, 'linkedin-promo.png'), 1200, 1200, true]]) {
    const page = await open({ width: w, height: h });
    await page.goto(base);
    await page.eval(poster(square));
    await sleep(200);
    await page.shot(file);
    await page.close();
    shrink(file);
    console.log('wrote', file);
  }
}

// ---------------------------------------------------------------- screenshots and example graphics

async function shots(base) {
  const dir = join(OUT, 'screenshots');
  await mkdir(dir, { recursive: true });
  const take = async (page, name, opts) => { const f = join(dir, name); await page.shot(f, opts); shrink(f); console.log('wrote', f); };

  for (const [tag, opts] of [['desktop', { width: 1280, height: 800 }], ['desktop-dark', { width: 1280, height: 800, dark: true }], ['mobile', { width: 390, height: 844, scale: 2, mobile: true }]]) {
    const page = await open(opts);
    await page.goto(base); await sleep(400);
    await take(page, 'landing-' + tag + '.png');
    await page.click('button', 'Discover your AI worldview'); await sleep(700);
    await page.key('4'); await sleep(700);
    await take(page, 'quiz-' + tag + '.png');
    await page.goto(base + '?demo#demo'); await sleep(1200);
    await take(page, 'result-dimensions-' + tag + '.png');
    if (tag === 'desktop') await take(page, 'result-full-desktop.png', { full: true });
    await page.click('#tab-map'); await sleep(1000);
    await page.eval(`document.querySelector('.tabs').scrollIntoView()`); await sleep(150);
    await take(page, 'result-compass-' + tag + '.png');
    await page.click('#tab-compare'); await sleep(900);
    await page.eval(`document.querySelector('.tabs').scrollIntoView()`); await sleep(150);
    await take(page, 'result-compare-' + tag + '.png');
    if (tag === 'desktop') {
      // the comparison of the two example profiles, as one graphic
      const box = await page.eval(`(() => { const r = document.querySelector('details.friend').getBoundingClientRect(); return { x: r.x - 24, y: r.y + scrollY - 16, width: r.width + 48, height: r.height + 24 }; })()`);
      const r = await page.cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 2 } });
      const f = join(OUT, 'example-comparison.png');
      await writeFile(f, Buffer.from(r.data, 'base64')); shrink(f); console.log('wrote', f);
      // the example result cards, straight from the export canvas
      await sleep(300);
      await saveCanvas(page, join(OUT, 'example-result-card-1080x1080.png'));
      await page.eval(`(() => { const r = document.querySelector('input[name=shape][value=portrait]'); r.checked = true; r.dispatchEvent(new Event('change')); })()`);
      await sleep(500);
      await saveCanvas(page, join(OUT, 'example-result-card-1080x1350.png'));
      console.log('wrote example result cards');
    }
    await page.close();
  }
}

// ---------------------------------------------------------------- demo video

// Records about 18 seconds of the real app: landing, three answers, the example result in its three views, the image export.
async function video(base) {
  const frames = join(OUT, '.frames');
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });
  const page = await open({ width: 1280, height: 720 });
  let n = 0, last = 0;
  const list = [];
  const onFrame = async m => {
    if (m.method !== 'Page.screencastFrame') return;
    const { data, metadata, sessionId } = m.params;
    page.cmd('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const file = join(frames, String(++n).padStart(5, '0') + '.png');
    list.push([file, metadata.timestamp]);
    await writeFile(file, Buffer.from(data, 'base64'));
    last = metadata.timestamp;
  };
  page.on(onFrame);
  const scroll = (to, ms) => page.eval(`new Promise(done => { const from = scrollY, t0 = performance.now(), target = ${to};
    const step = t => { const k = Math.min(1, (t - t0) / ${ms}), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, from + (target - from) * e); if (k < 1) requestAnimationFrame(step); else done(1); };
    requestAnimationFrame(step); })`);
  const topOf = sel => page.eval(`Math.max(0, Math.round(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().top + scrollY - 16))`);

  await page.goto(base); await sleep(500);
  await page.cmd('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await sleep(1800);                                                        // landing
  await page.click('button', 'Discover your AI worldview'); await sleep(1500);
  for (const key of ['4', '2', '5']) { await page.key(key); await sleep(1300); }          // three answers, with the slide between questions
  await page.goto(base + '?demo#demo'); await sleep(2300);                  // example result: headline and summary
  await scroll(await topOf('.tabs'), 900); await sleep(1900);               // eight dimensions
  await page.click('#tab-map'); await sleep(2100);                          // 2D compass
  await page.click('#tab-compare'); await sleep(900);
  await scroll(await topOf('.pairs'), 700); await sleep(1600);              // comparison
  await scroll(await topOf('#share'), 900); await sleep(1900);              // export
  await page.cmd('Page.stopScreencast');
  await sleep(300);
  page.off(onFrame);
  await page.close();

  // frames arrive only when the picture changes, so give each one the time until the next
  const concat = list.map(([file, t], i) => `file '${file}'\nduration ${Math.max(0.01, ((list[i + 1] ? list[i + 1][1] : last + 0.5) - t)).toFixed(3)}`).join('\n') + `\nfile '${list[list.length - 1][0]}'\n`;
  const listFile = join(frames, 'list.txt');
  await writeFile(listFile, concat);
  const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  const input = ['-f', 'concat', '-safe', '0', '-i', listFile];
  ff([...input, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', join(OUT, 'demo.mp4')]);
  ff([...input, '-vf', 'fps=30', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', join(OUT, 'demo.webm')]);
  ff([...input, '-vf', 'fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none', join(OUT, 'demo.gif')]);
  ff(['-i', join(OUT, 'demo.mp4'), '-ss', '8', '-frames:v', '1', join(OUT, 'demo-poster.png')]);
  shrink(join(OUT, 'demo-poster.png'));
  await rm(frames, { recursive: true, force: true });
  console.log('wrote demo.mp4, demo.webm, demo.gif, demo-poster.png from', n, 'frames');
}

const jobs = { preview, shots, video };
const job = jobs[process.argv[2]];
if (!job) { console.log('usage: node tools/capture.mjs ' + Object.keys(jobs).join(' | ')); process.exit(1); }
await mkdir(OUT, { recursive: true });
const server = await serve();
try { await job(server.url); } finally { server.close(); }
