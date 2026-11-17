# Testing

Two automated suites, plus what was checked by hand and what was not.

## Running

```bash
node --test
```

Unit tests for `js/core.js` and checks on `index.html`. Node 18+, no dependencies, about half a second.

```bash
node tools/e2e.mjs
```

Browser tests. Node 22+ and Chrome (set `CHROME` to its executable if it is not in a standard place). Serves the folder on a random local port, drives headless Chrome through the DevTools protocol, exits with 1 on any failure. About two minutes.

## Results

Last full run: 17 November 2026, macOS, Node 26.5.0, headless Chrome.

| Suite | Result |
|---|---|
| `node --test` | 38 of 38 tests pass |
| `node tools/e2e.mjs` | 160 of 160 checks pass, in 23 groups |

## What `node --test` covers

- **Scoring:** polarity, agree-with-everything, reject-everything, all-neutral, skipped versus neutral, one-sided answers, out-of-range input, which dimensions move the compass.
- **Statement bank:** 48 statements, six per dimension, three per pole, no duplicates; display order; the first 16 are balanced.
- **Camps:** complete profiles; every camp matches itself, in full, on the quick route and in a mild version; random respondents are not funnelled into one camp; every camp is reachable.
- **Comparison:** agreement at the extremes; per-dimension gaps, nearest, furthest, talking points.
- **Share codes:** round trip of every answer and a name with diacritics; survival of lowercase, spaces, missing hyphens and a wrapped link; rejection of any single wrong character and of truncation.
- **Compatibility:** three codes issued by v0.1 still decode, re-encode and score to the same numbers and the same camp.
- **Readings:** firm / leaning / middle / not scored; the summary names the real strongest and most balanced dimensions; the "unusual pairing" is one at most two camps really hold; summaries never mention unanswered dimensions; 2,000 random answer sets never produce broken text.
- **Example profiles:** complete, distinct from every camp and from each other.
- **Static page:** dimensions match the app; headline, creator credit, disclaimer, attribution and a `<noscript>` notice are present; one `<h1>`.
- **Metadata:** title, description length, canonical, Open Graph and Twitter tags, absolute image address, image really 1200×630 and under 300 kB; JSON-LD parses and names the app, its creator and its source; every referenced local file exists.

## What `node tools/e2e.mjs` covers

| Group | Checks |
|---|---|
| Static page without JavaScript | Content is in the HTML and not hidden when scripts are off. |
| Landing page | Headline on two lines, tagline, call to action above the fold at 1280×800, quick route preselected, creator link, eight dimensions, compass preview. |
| Quick route, then continuing | 16 questions; Next disabled until answered; strongly agree / neutral / skip stored as 2 / 0 / null; going back shows the saved state; focus lands on the question; provisional banner; skipped is not scored as neutral; continuing starts at 17 with earlier answers intact; 48 answers remove the banner; reload returns to the result. |
| Rapid input and history | Hammering a key cannot skip a question; browser back and forward move between views. |
| Held answer key, normal and reduced motion | A held key answers only one question; releasing it and pressing again answers the next. |
| Pending quiz transitions | Leaving during final-answer feedback keeps About open; canceled slides cannot advance a replacement quiz; hash navigation also cancels pending work; new input still works. |
| Restored partial results | A quick result with a skip opens and survives reload without invented answers; continuing starts at the first missing question; invalid codes preserve answers; erasing or starting over resets eligibility; empty codes remain explicitly unscored. |
| Clipboard failures | Missing and denied clipboard access expose the exact summary/link as selected, labeled, read-only text; repeated failures reuse the field and it fits a phone screen; a failed code copy selects the code field and keeps its own label. |
| Coverage and comparison descriptions | A 40-answer result reports its actual coverage; opposite poles are described as the smallest difference, not agreement; near-identical profiles 25 points apart on one dimension get the largest difference, not disagreement. |
| Result page | Three tabs, eight dimensions first; unanswered dimension reads "Not scored"; poles, marks and worded scores; summary; three camps with same-side and opposite-side dimensions; no percentages; arrow keys move between tabs; the compass says it is a projection; every button has a name and every image alt text. |
| Share codes and links | A link adds the friend and opens Compare; comparison content; the link carries the full code; a v0.1 code works; a damaged code adds nobody and explains; your own code is refused; friends persist. |
| Saved state from v0.1 | State without a route loads, resumes at the right question, keeps answers and friends. |
| Demo mode | Labelled as made up; full result; stores no answers; second example; `#demo-2`; reload without the address goes home; your own answers untouched. |
| Result image and summary | 1080×1080 and 1080×1350, really drawn (pixel count in the accent color), exports as PNG; the text summary has the address and no answers code; all actions offered. |
| About, erase and restore | `#about`; every section present, including the required principle; live slots filled; erase needs two presses and clears storage; a saved code restores answers. |
| Reduced motion | No entrance animation; the quiz completes without waiting for any transition. |
| Phone (390×844) | No sideways scroll on landing, quiz, result, comparison; call to action on the first screen; question and answers fit one screen; targets at least 44 px tall; answer buttons do not move between questions; the page does not scroll while answering; tabs fit. |
| Phone held sideways (844×390) | Answers in one row, visible without scrolling. |
| Color contrast, light and dark | Ten text and background pairs against WCAG ratios (7:1 for body text, 4.5:1 for secondary text and buttons, 3:1 for the friend marker). |
| Outgoing requests | Only Google Fonts is contacted. |
| Page weight and layout stability | Cumulative layout shift 0.000 on landing and result; 165 kB of HTML, CSS, JS and icons before compression. |

Every group also fails if the page logs a script error.

The interaction, restoration, copy-fallback and wording regressions were reproduced by failing browser checks before the fixes. An additional audit check compared 1,000 deterministic answer sets against the old `main`: scores, classifications, projections and share codes were unchanged.

## Checked by hand

- Screenshots of every screen in light, dark and phone layouts (`launch-assets/screenshots/`), reviewed for overlap, clipping and overflow.
- Both result-image formats, with a name, anonymous, provisional and example profiles.
- The 1200×630 link-preview image, at full size and at thumbnail size.
- The recorded demo, frame by frame at two-second intervals.
- The personal site built with Hugo 0.162.1: home page, Projects listing and project page, in dark and light themes and on a phone layout; the draft essay built with `hugo -D`.

## Known limitations of this testing

These were **not** done, and are worth doing before or just after launch:

- **Real screen readers.** Roles, names, focus movement and the progress bar's values were checked programmatically. Nobody has listened to it in VoiceOver, NVDA or TalkBack.
- **Browsers other than Chrome.** Automated runs used Chrome 157 only, including its phone emulation. Safari (macOS and iOS) and Firefox were not run. The code avoids recent-only features where they matter: `:has()` is used only as an enhancement to the route cards, `100dvh` has a `100vh` fallback, and `navigator.share` is offered only where it exists.
- **Real phones.** Phone results come from Chrome's device emulation, not hardware. Downloading and sharing the PNG on iOS and Android were not exercised.
- **Link-preview validators.** The tags are verified in the raw HTML, but services such as the LinkedIn Post Inspector can only be run against the deployed address.
- **The old-address redirect.** How GitHub Pages redirects `realvuk.github.io/ai-compass` after the custom domain is set is documented behaviour, not something that could be tested before the DNS record exists. `docs/DEPLOYMENT.md` has the check to run afterwards.
- **Hugo 0.147.2.** The personal site's workflow pins that version; the local build used 0.162.1. The added `layouts/home.html` relies on the template lookup introduced in Hugo 0.146, which 0.147.2 has (the PaperMod version in use needs it too), and the other templates use only long-standing functions. The first workflow run after merging is the real check.
- **Statement quality.** No test can say whether a statement is well worded. That needs people.
