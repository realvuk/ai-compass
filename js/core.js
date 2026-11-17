// ---------------------------------------------------------------------------
// Pure logic and content. No DOM in this block, so it can be loaded and tested
// with Node (see compass.test.js). Loaded by index.html before js/app.js.
// ---------------------------------------------------------------------------

const KEYS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];

// low = the -100 pole, high = the +100 pole, mid = the synthesis zone around 0.
const AXES = {
  D1: { short: 'Risk', name: 'Ontological risk',
    q: 'What are we building, and can something smarter than us be controlled?',
    low: ['Techno-Optimist', 'AI is a controllable tool for human abundance.'],
    mid: ['Conditional Pragmatist', 'High capability brings serious tail risks; how manageable they are depends on engineering rigor.'],
    high: ['AI Doomer', 'Superintelligence would be an autonomous entity we may not be able to control, and a threat to our existence.'] },
  D2: { short: 'Pace', name: 'Development velocity',
    q: 'How fast should the most capable AI be built and released, relative to the rules around it?',
    low: ['Effective Accelerationist', 'Maximum speed, with as little regulatory friction as possible.'],
    mid: ['Staged Deployment Advocate', 'Scale up step by step, with each step tied to testing and red-teaming results.'],
    high: ['Safety-First Advocate', 'Legal guardrails and evidence of safety before scaling further.'] },
  D3: { short: 'Access', name: 'Control topology',
    q: 'Who gets access to the most capable models and the recipes for training them?',
    low: ['Open-Sourcer', 'Public weights, auditable code and power spread across many hands.'],
    mid: ['Tiered-Access Pragmatist', 'Open weights for models behind the frontier; audited access for the most dangerous ones.'],
    high: ['Frontier Gatekeeper', 'Closed models, reached through licensed and accountable institutions.'] },
  D4: { short: 'War', name: 'Geopolitical posture',
    q: 'How should AI change military power, deterrence and the use of force?',
    low: ['AI Dove', 'Binding international treaties that ban lethal autonomous weapons.'],
    mid: ['Deterrence Realist', 'Defensive military AI is acceptable; humans stay in the loop on strategic weapons, by treaty.'],
    high: ['AI Hawk', 'Military AI superiority over adversaries, because they will not hold back.'] },
  D5: { short: 'Labor', name: 'Economic integration',
    q: 'Does AI mostly make human workers more capable, or replace thinking work altogether?',
    low: ['Augmentation Optimist', 'A cognitive exoskeleton that raises what people can do.'],
    mid: ['Task-Reallocation Realist', 'Routine thinking tasks get automated; human value moves to judgment, taste and physical work.'],
    high: ['Labor-Disruption Realist', 'A drop-in replacement that displaces white-collar work at scale.'] },
  D6: { short: 'Compute', name: 'Infrastructure and compute sovereignty',
    q: 'Where does intelligence physically live: on many small devices, or in a few giant data centers?',
    low: ['Distributed and Edge', 'Local chips, shared peer-to-peer computing and ever-smaller models.'],
    mid: ['Hybrid Federated Grid', 'Public or national clusters for the heavy lifting, local devices for private use.'],
    high: ['Centralized Mega-Cluster', 'Gigawatt-scale data centers run by a few large companies or states.'] },
  D7: { short: 'Architecture', name: 'Cognitive architecture',
    q: 'Does general intelligence emerge from scale alone, or does it need new, engineered designs?',
    low: ['World-Model Architect', 'It needs causal reasoning, grounded models of the world or hybrid designs.'],
    mid: ['Architecture Agnostic', 'Scale builds the base; explicit memory, planning and grounding complete it.'],
    high: ['Scaling Maximalist', 'Sequence prediction with enough data, computing power and reinforcement learning is sufficient.'] },
  D8: { short: 'Wealth', name: 'Post-labor value distribution',
    q: 'When thinking work no longer needs human time, who owns what it produces?',
    low: ['Compute and Data Redistribution', 'Basic income, public compute dividends or royalties for the data AI learned from.'],
    mid: ['Mixed Stakeholder Capitalism', 'Ordinary company ownership, plus targeted public compute credits and automation taxes.'],
    high: ['Capital-Compute Capture', 'The surplus belongs to whoever owns the chips, the energy and the models.'] }
};

// [axis, key, statement, plain-language note].
// key -1: agreeing points to the axis's low pole. key +1: agreeing points to its high pole.
// Every axis has three of each, stored as low, high, low, high, low, high.
const ITEMS = [
  ['D1', -1, 'However capable AI becomes, it will remain a tool that does what people build it to do.',
    'The question is whether very capable AI stays an instrument, like software today, or starts acting on goals of its own.'],
  ['D1', 1, 'If superhuman AI is built before we know how to control it, human extinction is a realistic outcome.',
    'Superhuman AI means a system that outperforms the best people at nearly every intellectual task.'],
  ['D1', -1, 'The idea that AI could wipe out humanity belongs in science fiction, not in serious planning.',
    'Some researchers put a real probability on AI causing human extinction. Others think the scenario is too speculative to plan around.'],
  ['D1', 1, 'Nobody currently knows how to make sure an AI much smarter than us would keep doing what we want.',
    'This is often called the alignment problem: getting an AI system’s goals to reliably match what its makers intend.'],
  ['D1', -1, 'The dangers of more capable AI are ordinary engineering problems that we will fix as they come up.',
    'The opposing view is that some failures would be too large to fix after the fact.'],
  ['D1', 1, 'Once an AI can outthink us, we should not expect to be able to switch it off or correct it.',
    'The worry is that a capable enough system would resist being shut down or changed if that got in the way of its goals.'],

  ['D2', -1, 'Slowing AI down does more harm, in cures not found and problems left unsolved, than moving fast does.',
    'This weighs the benefits lost to delay against the risks of rapid release.'],
  ['D2', 1, 'Governments should be able to halt the training of an AI model that crosses agreed danger thresholds.',
    'Training is the costly process of building a model. A threshold could be the computing power used, or dangerous abilities found in testing.'],
  ['D2', -1, 'AI companies should be free to release new models without waiting for government approval.',
    'The alternative is an approval step before release, as there is for new medicines or aircraft.'],
  ['D2', 1, 'A company should have to show that a powerful new model is safe before it is allowed to release it.',
    'This puts the burden of proof on the developer, instead of on regulators to show harm afterwards.'],
  ['D2', -1, 'Rules for AI should respond to harms that have actually happened, not to ones people imagine.',
    'The opposing view is that some harms are too large to wait for.'],
  ['D2', 1, 'If we cannot yet show that today’s most powerful AI is safe, building even more powerful systems should wait.',
    'This is the argument for a pause: capability should not outrun our ability to check it.'],

  ['D3', -1, 'The most capable AI models should be published openly, so that anyone can inspect, run and modify them.',
    'Publishing a model’s weights, the trained numbers that make it work, lets anyone run it on their own hardware and change it.'],
  ['D3', 1, 'A published model can never be recalled, so the most capable ones should not be released openly.',
    'Once a model’s weights are public, copies spread and its built-in safeguards can be removed.'],
  ['D3', -1, 'A few companies controlling the best AI is a bigger danger than bad actors misusing openly available models.',
    'This asks you to weigh two risks against each other: concentrated control, and misuse.'],
  ['D3', 1, 'Access to the most powerful AI should require a license, as it does for other dangerous technologies.',
    'Licensing would mean that only vetted organizations could build or run the most capable systems.'],
  ['D3', -1, 'Letting outsiders examine and test AI models makes them safer than keeping them secret does.',
    'Open models can be audited by anyone. Closed models are tested mainly by their makers and by reviewers the makers invite.'],
  ['D3', 1, 'Having a handful of accountable companies run the most powerful AI is safer than putting it in everyone’s hands.',
    'This asks you to weigh two risks against each other: misuse, and concentrated control.'],

  ['D4', -1, 'Weapons that select and attack targets without a human decision should be banned by international treaty.',
    'These are usually called lethal autonomous weapons.'],
  ['D4', 1, 'Rivals will build AI weapons whatever any treaty says, so holding back only guarantees defeat.',
    'This is the deterrence argument: restraint only works if everyone can be trusted to keep to it.'],
  ['D4', -1, 'An AI arms race makes every country less safe, including whichever one is ahead.',
    'An arms race here means states competing to field military AI faster than their rivals.'],
  ['D4', 1, 'Staying ahead of rival states in military AI matters more than agreeing limits with them.',
    'This asks which you would give up first: a military lead, or an arms-control agreement.'],
  ['D4', -1, 'AI companies should refuse to build weapons.',
    'Some AI developers decline military work on principle. Others see it as a responsibility.'],
  ['D4', 1, 'People who build AI have a duty to help their country’s military get the best systems it can.',
    'Some AI developers see military work as a responsibility. Others decline it on principle.'],

  ['D5', -1, 'AI will create more good jobs than it destroys.',
    'This is a prediction about the whole job market, not about any single profession.'],
  ['D5', 1, 'Within ten years, AI will do most office and knowledge work without a person involved.',
    'Knowledge work covers jobs done mainly at a computer: writing, analysis, programming, administration.'],
  ['D5', -1, 'At most jobs, a person working with AI will keep outperforming AI working alone.',
    'The question is whether people remain a useful part of the team, or become the slow part.'],
  ['D5', 1, 'This time is different from earlier technologies: AI can learn the new jobs too, so displaced workers will have nowhere to go.',
    'Earlier machines replaced specific tasks, and workers moved to tasks machines could not do.'],
  ['D5', -1, 'As with earlier technologies, people will move into new kinds of work that we cannot yet picture.',
    'Many of today’s jobs did not exist a century ago. The question is whether that pattern continues.'],
  ['D5', 1, 'AI is likely to cause large, lasting unemployment among office workers.',
    'Lasting means the jobs do not come back in another form within a few years.'],

  ['D6', -1, 'Within a few years, AI that runs on your own phone or laptop will be good enough for almost everything people need.',
    'Running a model locally means it works on your own device, without sending your data to a company’s servers.'],
  ['D6', 1, 'The most capable AI will always need enormous data centers that only a few companies or states can afford.',
    'The largest AI data centers now being planned would use as much electricity as a city.'],
  ['D6', -1, 'I would rather run a weaker AI on my own device than rent a stronger one from someone else’s data center.',
    'This is about your own preference between control and capability.'],
  ['D6', 1, 'Running powerful AI in a few large, well-guarded facilities is safer than spreading it across millions of devices.',
    'A few sites are easier to secure and monitor. Many devices are harder for anyone to control or shut off.'],
  ['D6', -1, 'Public money should go into making AI small and efficient enough to run anywhere, not into ever-bigger data centers.',
    'This is about where research and infrastructure funding should point.'],
  ['D6', 1, 'The race to build ever-bigger AI data centers is money and energy well spent.',
    'Companies and governments are committing very large sums to AI computing capacity.'],

  ['D7', -1, 'Today’s language models will hit a ceiling; human-level AI needs a fundamentally different design.',
    'Today’s leading systems are large language models, trained to predict text. The question is whether that recipe, scaled up, goes all the way.'],
  ['D7', 1, 'Bigger models, more data and more computing power are enough to reach human-level AI and beyond.',
    'This is often called the scaling hypothesis.'],
  ['D7', -1, 'Predicting the next word, however well, is not the same as understanding how the world works.',
    'Language models are trained by predicting what comes next in text.'],
  ['D7', 1, 'To predict text really well, a model has to learn how the world works, and today’s models are doing that.',
    'The idea is that accurate prediction forces a model to build an internal picture of what the text describes.'],
  ['D7', -1, 'Real intelligence has to be learned by interacting with the physical world, not from text alone.',
    'Some researchers argue that text is too thin a slice of reality, and that learning needs video, touch and action.'],
  ['D7', 1, 'In AI, simple methods given more computing power keep beating clever hand-built designs, and that will continue.',
    'Researchers call this the Bitter Lesson, after a 2019 essay by Rich Sutton.'],

  ['D8', -1, 'AI is built on humanity’s shared knowledge, so everyone is owed a share of the wealth it creates.',
    'AI models learn from enormous amounts of text, images and code that people produced.'],
  ['D8', 1, 'Companies that risk billions building AI are entitled to keep the profits, like any other business.',
    'This treats AI as an ordinary investment: those who fund it own what it earns.'],
  ['D8', -1, 'If AI takes over most work, governments should pay everyone a basic income funded by taxes on AI profits.',
    'A universal basic income is a regular payment to every adult, whether or not they work.'],
  ['D8', 1, 'Special taxes on AI or automation would do more harm than good by slowing innovation.',
    'An automation tax would charge companies for replacing workers with machines or software.'],
  ['D8', -1, 'People whose writing, art or code was used to train an AI should be paid for it.',
    'This is sometimes called a data royalty.'],
  ['D8', 1, 'AI’s benefits will reach everyone through cheaper goods and better services, without new redistribution.',
    'The alternative view is that the gains will stay with whoever owns the AI unless governments step in.']
];

// The order statements are shown in. Each round of eight has one statement per axis, alternating
// between poles. After the first two rounds (16 statements) every axis has one statement from each
// pole, so a short reading is already balanced.
const ORDER = (() => {
  const per = ITEMS.length / KEYS.length, out = [];
  for (let r = 0; r < per; r++) {
    for (let j = 0; j < KEYS.length; j++) {
      const ax = (j * 3 + r * 2) % KEYS.length;
      out.push(ax * per + (ax % 2 === 0 ? r : r ^ 1));
    }
  }
  return out;
})();
const SHORT_FORM = 2 * KEYS.length;

// Reference camps. d = profile on D1..D8. lp = preferred label side on the chart (r, l, t, b).
const FACTIONS = [
  { name: 'Decentralized Cypherpunk', tag: 'Cypherpunk', d: [-50, -90, -100, -40, -30, -100, -20, -30], lp: 'bltr',
    creed: 'Keep AI in everyone’s hands.',
    about: 'People here see concentrated control of AI, by companies or by governments, as a bigger threat than the technology itself. They want open models that run on hardware people own, and as few gatekeepers as possible.',
    critics: 'A powerful model that has been published cannot be recalled, whatever people end up doing with it.',
    near: 'Common in the open-weights and local-model communities.' },
  { name: 'Open-Science Architect', tag: 'Open-Science', d: [-80, -50, -90, -30, -70, -40, -100, -10], lp: 'rtbl',
    creed: 'Open research, and a better design than today’s models.',
    about: 'People here treat AI as science that should be done in the open. They doubt that scaling up language models leads to human-level intelligence, find extinction scenarios far-fetched, and expect AI to assist workers more than replace them.',
    critics: 'If scaling keeps working, this view underrates how fast capability arrives and what open release then puts in anyone’s hands.',
    near: 'Public figures often placed near here: Yann LeCun.' },
  { name: 'Techno-Capital Accelerationist', tag: 'Techno-Capital', d: [-100, -100, -30, 80, -40, 60, 70, 100], lp: 'trlb',
    creed: 'Build it, faster.',
    about: 'People here see technology and markets as the engine of human progress, and AI as the biggest step yet. Regulation mostly delays the benefits, the builders who take the risk should keep the rewards, and national strength depends on staying ahead.',
    critics: 'Moving this fast leaves little time to notice harms, and the gains may pile up with a few owners.',
    near: 'Public figures often placed near here: Marc Andreessen.' },
  { name: 'Scale Utility Builder', tag: 'Scale Utility', d: [-40, -50, 70, 40, 50, 100, 100, -30], lp: 'ltrb',
    creed: 'Intelligence as a utility, delivered at scale.',
    about: 'People here think scaling works, so the job is to build enormous computing capacity and deliver AI to everyone as a service. They release in stages, keep the most capable models in-house, and expect large changes to work, softened by sharing some of the gains.',
    critics: 'This puts a great deal of power, and a great deal of everyone else’s dependence, in a few providers’ hands.',
    near: 'Public figures often placed near here: Sam Altman.' },
  { name: 'Frontier Safety Gatekeeper', tag: 'Safety Gatekeeper', d: [60, 40, 80, 60, 80, 50, 70, -40], lp: 'rblt',
    creed: 'Powerful AI is coming, and careful hands should hold it.',
    about: 'People here expect very capable AI soon and take its dangers seriously. Their answer is for a few accountable developers and democratic states to stay in front, with tight control over the most powerful models, while preparing for heavy disruption to jobs.',
    critics: 'Racing ahead while warning of danger can look contradictory, and safety rules can end up protecting incumbents.',
    near: 'Public figures often placed near here: Dario Amodei, Mustafa Suleyman.' },
  { name: 'Sovereign Defense Industrialist', tag: 'Defense Industrialist', d: [-30, -70, 80, 100, 20, 80, 10, 50], lp: 'btlr',
    creed: 'AI is national power.',
    about: 'People here treat AI as strategic infrastructure, as steel and electricity were in earlier eras. A nation should own the whole chain, from chips and power plants to military systems, and neither utopian nor apocalyptic stories should distract from that.',
    critics: 'This logic feeds an arms race and concentrates AI in state and military hands.',
    near: 'Public figures often placed near here: Alex Karp.' },
  { name: 'Precautionary Institutionalist', tag: 'Precautionary', d: [70, 90, 50, -90, 50, 0, -20, -70], lp: 'lbrt',
    creed: 'Guardrails first, agreed between nations.',
    about: 'People here think advanced AI carries serious risks, some of them catastrophic, and that binding rules, independent oversight and international agreements should come before more capability. They oppose autonomous weapons and want the gains shared widely.',
    critics: 'Strict rules assume someone knows what safe AI looks like, and they could hold back real benefits.',
    near: 'Public figures often placed near here: Yoshua Bengio, Stuart Russell.' },
  { name: 'Existential Hardliner', tag: 'Hardliner', d: [100, 100, 100, -40, 60, 10, 70, 0], lp: 'brlt',
    creed: 'Do not build it until we can control it.',
    about: 'People here believe that superhuman AI built with anything like today’s methods would probably end humanity. They want frontier development halted worldwide, by enforceable agreement, until the control problem is solved.',
    critics: 'A worldwide halt may be unenforceable, and it would give up enormous benefits if the danger is overstated.',
    near: 'Public figures often placed near here: Eliezer Yudkowsky, Nate Soares.' },
  { name: 'Institutional Adaptationist', tag: 'Adaptationist', d: [20, 30, 30, 10, 90, 20, 50, -90], lp: 'tlrb',
    creed: 'The disruption is coming. Get society ready.',
    about: 'People here take large-scale job displacement as the central fact and put their effort into what follows from it: tax systems, education, safety nets and legal liability. They care less about whether to pause AI than about who is protected when it arrives.',
    critics: 'Treating displacement as inevitable can mean giving up on steering it, and it may underrate more extreme risks.',
    near: 'Common among people who work on labor, tax and education policy.' },
  { name: 'Public-Interest Skeptic', tag: 'Public-Interest Skeptic', d: [-50, 70, -30, -80, 10, -60, -90, -80], lp: 'btrl',
    creed: 'Less hype, more accountability.',
    about: 'People here think both the doom and the salvation stories oversell what today’s systems can do. The problems they care about are already here: concentrated corporate power, creative work used without consent, pressure on jobs. They want enforceable rules now.',
    critics: 'If capability keeps climbing, dismissing the big scenarios leaves society unprepared for them.',
    near: 'Common among AI ethics researchers and labor advocates.' },
  { name: 'Pragmatic Augmenter', tag: 'Augmenter', d: [-40, -20, -10, 0, -100, -20, -30, -20], lp: 'lbrt',
    creed: 'A tool that makes people better at their work.',
    about: 'People here see AI as a general-purpose tool, like electricity or the computer, that mostly raises what workers can do. They expect new kinds of jobs to appear and see little need for either alarm or a redesign of the economy.',
    critics: 'If AI can also learn the new jobs, the comparison with earlier technologies stops holding.',
    near: 'Public figures often placed near here: Erik Brynjolfsson.' }
];

const ZONE = 25;       // |score| at or below this is the synthesis zone
const MIN_SIM = 0.45;  // below this similarity, no camp is named
const FLAT = 15;       // below this average strength, the profile is too flat to match
const MIN_AXES = 5;    // axes that need a score before any camp is named

// Scores each axis from -100 (low pole) to +100 (high pole).
// Skipped or unanswered statements are left out, not counted as neutral.
// conflict: 0..1, how strongly both poles were agreed with. reject: 0..1, how strongly both were rejected.
function scoreAxes(resp) {
  const acc = {}, out = {};
  KEYS.forEach(k => { acc[k] = { lo: 0, nlo: 0, hi: 0, nhi: 0 }; });
  ITEMS.forEach((it, i) => {
    const v = resp ? resp['q' + i] : undefined;
    if (typeof v !== 'number' || !isFinite(v)) return;
    const c = Math.max(-2, Math.min(2, v)), a = acc[it[0]];
    if (it[1] === 1) { a.hi += c; a.nhi++; } else { a.lo += c; a.nlo++; }
  });
  KEYS.forEach(k => {
    const a = acc[k], n = a.nlo + a.nhi;
    if (!n) { out[k] = { score: null, n: 0, conflict: 0, reject: 0 }; return; }
    const lo = a.nlo ? a.lo / a.nlo : null, hi = a.nhi ? a.hi / a.nhi : null;
    const both = lo !== null && hi !== null;
    const score = both ? (hi - lo) * 25 : (hi !== null ? hi * 50 : -lo * 50);
    out[k] = {
      score: score + 0, n: n,
      conflict: both ? Math.max(0, Math.min(lo, hi)) / 2 : 0,
      reject: both ? Math.max(0, Math.min(-lo, -hi)) / 2 : 0
    };
  });
  return out;
}

// Chart position. x: access, compute and wealth (distributed to concentrated).
// y: risk and pace (speed to caution). War, labor and architecture do not move the chart.
const COMPASS_X = ['D3', 'D6', 'D8'], COMPASS_Y = ['D1', 'D2'];
function compass(get) {
  const mean = ks => {
    const v = ks.map(get).filter(x => typeof x === 'number');
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length + 0 : null;
  };
  return { x: mean(COMPASS_X), y: mean(COMPASS_Y) };
}

// How strongly held the profile is, and how much of it cancels out.
function profile(s) {
  const got = KEYS.filter(k => s[k] && s[k].score !== null);
  const avg = f => got.length ? got.reduce((t, k) => t + f(s[k]), 0) / got.length : 0;
  return { axes: got.length, strength: Math.sqrt(avg(a => a.score * a.score)), conflict: avg(a => a.conflict), reject: avg(a => a.reject) };
}

// Every camp with its similarity to the profile (cosine, -1..1), best first. Empty if the profile is too thin or flat.
function similarities(s) {
  const p = profile(s);
  if (p.axes < MIN_AXES || p.strength < FLAT) return [];
  const idx = KEYS.map((k, i) => (s[k].score === null ? -1 : i)).filter(i => i >= 0);
  return FACTIONS.map(f => {
    let dot = 0, na = 0, nb = 0;
    idx.forEach(i => { const v = s[KEYS[i]].score; dot += v * f.d[i]; na += v * v; nb += f.d[i] * f.d[i]; });
    return Object.assign({}, f, { sim: na && nb ? dot / Math.sqrt(na * nb) : 0 });
  }).sort((a, b) => b.sim - a.sim);
}

// Camps close enough to name, best first.
function rank(s) { return similarities(s).filter(r => r.sim >= MIN_SIM); }

// 0..1: how close two sets of axis scores are. 1 = identical, 0 = 100 points apart on average.
function agreement(a, b) {
  const ks = KEYS.filter(k => a[k].score !== null && b[k].score !== null);
  if (!ks.length) return null;
  const gap = ks.reduce((t, k) => t + Math.abs(a[k].score - b[k].score), 0) / ks.length;
  return Math.max(0, 1 - gap / 100);
}

// Share codes: every answer packed into letters and digits, so a code survives chat apps and URLs.
const CODE_PREFIX = 'AIC2';
const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHECK = 1291;    // prime below 36 * 36: the two check characters catch any single wrong or swapped character
function cleanName(name) {
  return String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
}
function encodeCode(resp, name) {
  const v = ITEMS.map((it, i) => {
    const x = resp ? resp['q' + i] : undefined;
    return typeof x === 'number' && isFinite(x) ? Math.max(-2, Math.min(2, Math.round(x))) + 3 : 0;
  });
  let body = '', sum = 0;
  for (let i = 0; i < v.length; i += 2) { const d = v[i] * 6 + v[i + 1]; body += B36[d]; sum += d * (i / 2 + 1); }
  sum %= CHECK;
  let out = CODE_PREFIX + '-' + body.match(/.{1,6}/g).join('-') + '-' + B36[Math.floor(sum / 36)] + B36[sum % 36];
  const nm = cleanName(name);
  if (nm) {
    try {
      out += '-' + encodeURIComponent(nm).replace(/%([0-9A-F]{2})|([\s\S])/g,
        (m, hex, ch) => hex || ('0' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-2));
    } catch (e) { /* unpaired surrogate: leave the name off */ }
  }
  return out;
}
function decodeCode(str) {
  const pairs = ITEMS.length / 2;
  const m = new RegExp(CODE_PREFIX + '((?:-?[0-9A-Z]){' + (pairs + 2) + '})(?:-?((?:[0-9A-F]{2})+))?(?![0-9A-Z])')
    .exec(String(str == null ? '' : str).toUpperCase().replace(/\s+/g, ''));
  if (!m) return null;
  const body = m[1].replace(/-/g, ''), resp = {};
  let sum = 0;
  for (let i = 0; i < pairs; i++) {
    const d = B36.indexOf(body[i]);
    sum += d * (i + 1);
    const a = Math.floor(d / 6), b = d % 6;
    if (a) resp['q' + (2 * i)] = a - 3;
    if (b) resp['q' + (2 * i + 1)] = b - 3;
  }
  sum %= CHECK;
  if (B36[Math.floor(sum / 36)] + B36[sum % 36] !== body.slice(pairs)) return null;
  let name = '';
  if (m[2]) { try { name = cleanName(decodeURIComponent(m[2].replace(/../g, '%$&'))); } catch (e) { name = ''; } }
  return { resp: resp, name: name };
}

// ---------------------------------------------------------------------------
// Readings: words for the numbers. Everything below is read off the scores, by
// fixed rules, so the same answers always give the same text. Still no DOM.
// ---------------------------------------------------------------------------

// One discussion prompt per axis, shown when two people differ on it.
const TALK = {
  D1: 'What would each of you need to see to change your mind about whether very capable AI can be kept under control?',
  D2: 'Which is the bigger mistake: releasing a powerful model too early, or holding back one that would have helped people?',
  D3: 'Which worries you more: a few organizations controlling the best AI, or anyone being able to misuse it?',
  D4: 'Would you trust an international treaty on military AI to hold? What would make it believable?',
  D5: 'Think of a job you both know well. In ten years, is AI helping the person who does it, or doing it instead?',
  D6: 'Would you give up some capability to run AI on your own device? Where is the line?',
  D7: 'What would convince you that today’s language models do, or do not, understand how the world works?',
  D8: 'If AI ends up doing most of the work, who should own what it produces, and how would that be enforced?'
};

// The reading of one axis: a title, a number in words, and which side it is on (-1, 0, 1).
function axisRead(k, a) {
  const A = AXES[k];
  if (!a || a.score === null) return { title: 'Not scored', num: 'no answers on this dimension yet', side: 0 };
  const s = Math.round(a.score), abs = Math.abs(s), pole = s < 0 ? A.low[0] : A.high[0];
  if (abs <= ZONE) return { title: A.mid[0], num: abs ? 'middle ground, ' + abs + ' toward ' + pole : 'middle ground, dead center', side: 0 };
  return { title: (abs > 60 ? 'Firmly ' : 'Leans ') + pole, num: abs + ' of 100', side: s < 0 ? -1 : 1 };
}

// What kind of result this is: a named camp, too few answers, the middle, torn, or a combination no camp shares.
function verdict(s) {
  const p = profile(s), r = rank(s);
  if (p.axes < MIN_AXES) return { kind: 'thin' };
  if (r.length) return { kind: 'camp', top: r[0], rest: r.slice(1, 3) };
  if (p.strength < FLAT) return { kind: p.conflict >= 0.4 ? 'torn' : 'middle' };
  return { kind: 'uncharted' };
}
const fitWord = sim => (sim >= 0.75 ? 'a close fit' : sim >= 0.6 ? 'a fair fit' : 'a loose fit');
const sideOf = v => (v > ZONE ? 1 : v < -ZONE ? -1 : 0);

// Where a set of scores and a reference vector d (a camp's profile, D1..D8) sit on the same side
// of an axis, or both in its middle ground, and where they sit on opposite sides.
function contrast(s, d) {
  const same = [], opposite = [];
  KEYS.forEach((k, i) => {
    if (!s[k] || s[k].score === null || typeof d[i] !== 'number') return;
    const a = sideOf(s[k].score), b = sideOf(d[i]);
    if (a === b) same.push(k); else if (a && b) opposite.push(k);
  });
  return { same: same, opposite: opposite };
}

// The facts a summary is built from: firm, leaning and middle axes, the strongest and the most
// balanced one, and the pair of clear positions that the fewest reference camps hold together.
function summarize(s) {
  const got = KEYS.filter(k => s[k] && s[k].score !== null);
  const abs = k => Math.abs(s[k].score), at = k => KEYS.indexOf(k);
  const clear = got.filter(k => abs(k) > ZONE), mid = got.filter(k => abs(k) <= ZONE);
  const strongest = clear.slice().sort((a, b) => abs(b) - abs(a) || at(a) - at(b))[0] || null;
  const balanced = mid.slice().sort((a, b) => abs(a) - abs(b) || at(a) - at(b))[0] || null;
  let combo = null;
  for (let i = 0; i < clear.length; i++) {
    for (let j = i + 1; j < clear.length; j++) {
      const a = clear[i], b = clear[j], weight = abs(a) + abs(b);
      const shared = FACTIONS.filter(f => sideOf(f.d[at(a)]) === sideOf(s[a].score) && sideOf(f.d[at(b)]) === sideOf(s[b].score));
      if (!combo || shared.length < combo.shared.length || (shared.length === combo.shared.length && weight > combo.weight)) {
        combo = { a: a, b: b, shared: shared, weight: weight };
      }
    }
  }
  return {
    scored: got, firm: clear.filter(k => abs(k) > 60), lean: clear.filter(k => abs(k) <= 60), mid: mid,
    strongest: strongest, balanced: balanced, combo: combo && combo.shared.length <= 2 ? combo : null
  };
}

// The summary as labelled lines of plain text, for the result page, the image and "copy summary".
function summaryLines(resp) {
  const s = scoreAxes(resp), sum = summarize(s), v = verdict(s), lines = [];
  const n = ITEMS.reduce((t, it, i) => t + (resp && typeof resp['q' + i] === 'number' ? 1 : 0), 0);
  const read = k => axisRead(k, s[k]);
  const plural = (c, w) => c + ' ' + w + (c === 1 ? '' : 's');

  if (sum.strongest) lines.push({ label: 'Firmest position', text: AXES[sum.strongest].short + ': ' + read(sum.strongest).title + ' (' + read(sum.strongest).num + ').' });
  else if (sum.scored.length) lines.push({ label: 'Firmest position', text: 'None. Every scored dimension sits in its middle ground.' });

  if (sum.balanced) {
    const k = sum.balanced, a = s[k];
    if (a.conflict >= 0.5) lines.push({ label: 'Most torn', text: AXES[k].short + ': statements from both poles got agreement, so they cancel out.' });
    else if (a.reject >= 0.5) lines.push({ label: 'Least settled', text: AXES[k].short + ': statements from both poles got disagreement, so neither pole fits.' });
    else lines.push({ label: 'Most balanced', text: AXES[k].short + ': ' + read(k).title + ' (' + read(k).num + ').' });
  }

  if (sum.combo) {
    const c = sum.combo, who = c.shared.map(f => f.name);
    const lower = t => t.charAt(0).toLowerCase() + t.slice(1);
    lines.push({ label: 'Unusual pairing', text: read(c.a).title + ' on ' + AXES[c.a].short.toLowerCase() + ', together with ' + lower(read(c.b).title) + ' on ' + AXES[c.b].short.toLowerCase() + '. ' +
      (who.length === 0 ? 'None of the eleven reference camps combines the two.'
        : who.length === 1 ? 'Only one of the eleven reference camps combines the two: ' + who[0] + '.'
          : 'Only two of the eleven reference camps combine the two: ' + who.join(' and ') + '.') });
  }

  if (v.kind === 'camp') lines.push({ label: 'Closest reference camp', text: v.top.name + ', similarity ' + Math.round(v.top.sim * 100) + ' of 100, ' + fitWord(v.top.sim) + '.' });
  else if (v.kind === 'thin') lines.push({ label: 'Closest reference camp', text: 'Not enough answers yet to compare with the reference camps.' });
  else if (v.kind === 'uncharted') {
    const near = similarities(s)[0];
    lines.push({ label: 'Closest reference camp', text: 'None close enough to name. The nearest is ' + near.name + ', at ' + Math.round(near.sim * 100) + ' of 100.' });
  } else lines.push({ label: 'Closest reference camp', text: 'None named. The profile sits too close to the center to point toward any camp.' });

  if (sum.scored.length) {
    lines.push({ label: 'Overall', text: sum.firm.length + ' firm, ' + sum.lean.length + ' leaning and ' + sum.mid.length + ' middle-ground across ' +
      plural(sum.scored.length, 'scored dimension') + '.' + (sum.scored.length < KEYS.length ? ' ' + (KEYS.length - sum.scored.length) + ' not scored.' : '') });
  }
  if (n < ITEMS.length) lines.push({ label: 'Coverage', text: 'Provisional: based on ' + n + ' of ' + ITEMS.length + ' statements.' });
  return lines;
}

// How two sets of scores compare: overall alignment, the gap on each shared axis, the closest and the furthest.
function compare(a, b) {
  const ks = KEYS.filter(k => a[k].score !== null && b[k].score !== null), gap = {};
  ks.forEach(k => { gap[k] = Math.abs(a[k].score - b[k].score); });
  const byGap = ks.slice().sort((x, y) => gap[x] - gap[y] || KEYS.indexOf(x) - KEYS.indexOf(y));
  return { agreement: agreement(a, b), axes: ks, gap: gap, near: byGap[0] || null, far: byGap.length > 1 ? byGap[byGap.length - 1] : null,
    talk: byGap.slice().reverse().filter(k => gap[k] >= 40).slice(0, 2) };
}
const alignWord = ag => (ag >= 0.85 ? 'Nearly the same outlook' : ag >= 0.7 ? 'Broadly aligned' : ag >= 0.5 ? 'Partly aligned' : ag >= 0.3 ? 'Mostly different' : 'Far apart');

// Answers that put each axis on a target score, snapped to the 25-point steps the scoring can reach.
function answersFor(d) {
  const resp = {};
  KEYS.forEach((ax, j) => {
    const t = Math.round(d[j] / 25), b = Math.max(-2, Math.min(2, t)), a = b - t;
    ITEMS.forEach((it, i) => { if (it[0] === ax) resp['q' + i] = it[1] === 1 ? b : a; });
  });
  return resp;
}

// Two synthetic profiles for the demo mode. They are invented for illustration: nobody took the quiz to produce them.
const DEMOS = [
  { name: 'Example A', blurb: 'worried about risk, and wants AI kept open and widely shared', resp: answersFor([50, 75, -75, -50, 0, -50, -25, -50]) },
  { name: 'Example B', blurb: 'relaxed about risk and keen to move fast, and also wants AI kept open', resp: answersFor([-75, -50, -50, -25, -50, 25, 75, -25]) }
];
