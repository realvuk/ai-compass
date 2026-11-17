# Architecture

How AI Compass is put together: its files, its data, how it scores, what it stores, how sharing works and how it draws. Written during the November 2026 refactor of the original single-file version (v0.1), with notes on what that refactor changed.

## Shape of the app

A static site with no build step. `index.html` loads one stylesheet and six plain scripts, in order. The scripts share the page's global scope, so a `const` or `function` declared at the top of one is visible in the next. There are no modules and no bundler.

| File | Responsibility |
|---|---|
| `index.html` | Metadata, structured data, and the static page: landing copy, the eight dimensions, the whole About text. |
| `css/compass.css` | All styles. Theme colors are custom properties on `:root`; dark mode redefines them. |
| `js/core.js` | Content and pure logic. No DOM. Loadable in Node. |
| `js/ui.js` | DOM helpers, state and storage, tooltips, the compass chart, top bar, footer, About view, router, boot. |
| `js/quiz.js` | Landing page and quiz. |
| `js/result.js` | Result page: headline, summary, tabs, eight-dimension view, 2D view, reference camps. |
| `js/compare.js` | Compare view, share code and link helpers. |
| `js/card.js` | Result image (canvas) and the share section. |

Boot happens on `DOMContentLoaded` in `ui.js`: detach the static About section for reuse, load saved state, read the address `#fragment`, render.

## Content and data (`js/core.js`)

- `KEYS`: the eight dimension ids, `D1` to `D8`.
- `AXES[k]`: `short` name, long `name`, the question `q`, and three positions `low`, `mid`, `high`, each `[label, description]`. `low` is the −100 pole, `high` the +100 pole.
- `ITEMS`: 48 statements as `[axis, key, text, note]`. `key` is −1 if agreeing points to the low pole, +1 for the high pole. Each axis has three of each.
- `ORDER`: the order statements are shown in. Rounds of eight, one statement per axis, alternating poles. `SHORT_FORM = 16`: after two rounds every axis has one statement from each pole.
- `FACTIONS`: eleven reference camps. `d` is the profile on `D1..D8`; the rest is copy (`creed`, `about`, `critics`, `near`) and a label-placement hint for the chart.
- `TALK[k]`: one discussion prompt per axis, for comparisons.
- `DEMOS`: two synthetic profiles for the example mode, built by `answersFor(profile)`.

A statement's identity is its index in `ITEMS` (`q0`…`q47`). Answers, share codes and saved state all refer to statements by that index.

## Scoring

Answers are integers −2…2 (strongly disagree … strongly agree). `null` means skipped. A missing key means not reached.

`scoreAxes(resp)` returns, per axis, `{ score, n, conflict, reject }`:

- `lo`, `hi`: mean answer to the low-pole and high-pole statements that have a numeric answer.
- `score = (hi − lo) × 25`, range −100…100. With answers on only one side, `hi × 50` or `−lo × 50`. With none, `null`.
- `n`: how many statements were counted. Skipped and missing ones are not.
- `conflict` (0…1): how strongly both poles were agreed with. `reject`: how strongly both were rejected.

Thresholds: `ZONE = 25` (|score| at or below it is the middle ground), `MIN_SIM = 0.45`, `FLAT = 15`, `MIN_AXES = 5`.

`compass(get)` projects onto two directions: x = mean of D3, D6, D8 (access, compute, wealth); y = mean of D1, D2 (risk, pace). D4, D5 and D7 do not move it.

`similarities(scores)` gives every camp's cosine similarity to the scores over the scored axes, best first, or nothing if fewer than `MIN_AXES` axes are scored or the profile's root-mean-square strength is under `FLAT`. `rank` keeps those at or above `MIN_SIM`. `verdict` turns that into one of `camp`, `thin`, `middle`, `torn`, `uncharted`.

`agreement(a, b)` between two people is `max(0, 1 − meanGap / 100)` over shared axes.

## Readings (also `js/core.js`)

Rule-based text, tested, with no randomness and no model:

- `axisRead(k, score)`: "Firmly X", "Leans X", the middle-ground name, or "Not scored".
- `summarize(scores)`: firm (>60), leaning (26–60) and middle axes; the strongest; the most balanced; and the pair of clear positions held together by the fewest camps, reported only if at most two camps share it.
- `summaryLines(resp)`: the above as labelled lines, plus the closest camp and a coverage line for partial results. Used by the result page, the image and "copy summary".
- `contrast(scores, campProfile)`: axes on the same side (or both in the middle), and axes on opposite sides.
- `compare(a, b)`: per-axis gaps, nearest and furthest axis, and up to two axes to talk about (gap of 40 or more).

## State and persistence (`js/ui.js`)

One object, `st`:

| Field | Meaning | Saved |
|---|---|---|
| `view` | `intro`, `quiz`, `result` or `about` | yes (`about` is saved as the view it was opened from) |
| `idx` | position in `ORDER` | yes |
| `resp` | answers, `{ q0: 2, q7: null, … }` | yes |
| `name` | optional display name, cleaned to 20 characters | yes |
| `friends` | up to 8 `{ code, name }` | yes |
| `mode` | `quick` or `full` route | yes (new in this version; absent means `full`) |
| `restored` | answers came from a saved code, so a partial result can be read immediately | yes (optional; absent means `false`) |
| `pick` | route selected on the landing page | no |
| `viewing` | `null`, `{ friend: i }` or `{ demo: i }` | no |
| `tab` | open result view: `dims`, `map`, `compare` | no |
| `from`, `note` | where About was opened from; a one-off notice | no |

Saved state is JSON in `localStorage` under **`ai-compass-v2`**, written on every render and every answer. `sanitize()` validates everything read back and ignores what it does not recognise, so state saved by v0.1 loads unchanged. If storage is unavailable the app runs in memory.

Storage is per origin. Answers saved at one address are not visible at another; see `docs/DEPLOYMENT.md`.

Example mode never touches `resp`: the result page reads its answers from `subject()`, which returns your own, a friend's or an example's.

## Sharing

A share code is all 48 answers in text:

```
AIC2-PNG9WP-NG9WPN-G9WPNG-9WPNG9-NX-C5BD696761
└┬─┘ └──────────────┬─────────────┘ └┤ └───┬────┘
prefix   24 characters, 2 answers each  check  optional name, UTF-8 bytes as hex
```

Each answer becomes 0 (none or skipped) or 1…5; a pair of answers becomes one base-36 character (`a × 6 + b`). Two check characters hold a position-weighted sum modulo 1291, which catches a wrong or swapped character. `decodeCode` tolerates lowercase, spaces, missing hyphens and a link wrapped around the code.

A comparison link is the page address plus `#r-CODE`. The fragment is not sent to the server. Opening one adds the sender to `friends` (replacing an older code with the same answers) and opens the Compare view. A damaged code adds nobody and shows a notice. `importOwn(code)`, reached from About → Privacy, replaces your own answers with a code's.

Codes do not distinguish skipped questions from unreached ones. Restoration keeps the numeric answers and scores, leaves missing answers absent, and sets `restored` so even a result with fewer than 16 numeric answers remains readable after reload. Continuing starts at the first missing answer. Erasing or starting a fresh quiz clears this flag; ordinary quizzes still require 16 questions seen before showing results. An empty valid code can show an explicitly unscored result, without fabricating answers.

If clipboard access is missing or denied, copy actions select the existing code field or expose a labeled, read-only text area containing the requested summary/link for manual copying.

Other fragments: `#about` opens the About view; `#demo` and `#demo-2` open the example results.

There is no server side to any of this.

## Rendering and navigation

`render()` cancels pending quiz feedback/slide timers before replacing a view, including navigation through browser history or a URL fragment. The quiz ignores repeated keydown events from held keys.

`render()` rebuilds the page from `st`: top bar, one view, footer. Views are functions returning DOM nodes built with `h(tag, props, …children)`. Two places update in place instead of rebuilding, so they can animate and keep scroll position:

- the quiz: `quizView()` builds the frame once, `paintQuiz()` repaints the question, progress marks and navigation;
- the result tabs: `tabbed()` swaps only the panel.

`go(view)` is the only way to change view. It pushes a history entry, so the browser's back and forward buttons work, and scrolls to the top. Question changes inside the quiz do not scroll and do not touch history.

`busy` blocks input for the ~190 ms between an answer and the next question appearing, which is what stops rapid clicks from skipping a question.

## Visualisation

- **Compass** (`drawCompass` in `ui.js`): an SVG built for the box's measured width and redrawn on resize. Labels are placed greedily (you, then friends, then camps), trying four sides and skipping any that would collide. On entering a view the marks for people travel in from the center.
- **Dimension bars** (`axisBlock` in `result.js`): HTML elements positioned by percentage; the track has `role="img"` and a full text label.
- **Comparison rows** (`pairRow` in `compare.js`): the same track with two marks and the gap shaded.
- **Result image** (`drawCard` in `card.js`): a 2D canvas at 1080×1080 or 1080×1350 with fixed light colors, laid out from the bottom up so the eight rows take the remaining height.

## The static page

Everything inside `#app` in `index.html` is real content: headline, description, the eight dimensions, and the About text (motivation, method, limits, privacy, creator, feedback). That is what crawlers, link-preview bots and visitors without JavaScript read.

With JavaScript, an inline script hides `#app` until the app has rendered (and reveals it after three seconds if the scripts never arrive), the About section is detached and becomes the About view, and three empty slots in it (`data-slot="dimensions"`, `"camps"`, `"data"`) are filled with live content. There is one copy of the About text.

A test checks that the dimension names, questions and poles in `index.html` match `js/core.js`.

## What changed from v0.1

Kept exactly: the statements and their order, the scoring, the camps and thresholds, the share-code format, the storage key and its existing fields, the 2D projection, the visual identity. The `mode` and `restored` state fields are optional additions.

Changed behaviour:

- A result can be read once 16 statements have been **seen**. Before, it needed 16 numeric answers, so skipping one statement of the first 16 locked the result.
- The quiz has a quick route that stops at 16; choosing it is new. The full route behaves as before, including "stop here" after 16.
- A friend's link opens the Compare view; a damaged link now says so.
- "Match" percentages are now "similarity N of 100", worded as a measure of direction.
- User-facing text says "dimension" where it used to say "axis".
- The method text moved from the result page to the About view.
