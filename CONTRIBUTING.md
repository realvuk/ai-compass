# Contributing to AI Compass

Feedback is the most useful contribution: a statement that reads as loaded, a result that seems misleading, a screen that is hard to use. The [issue templates](https://github.com/realvuk/ai-compass/issues/new/choose) cover a problem, an improvement, the wording of a statement and a methodological concern.

**Never include your result code or comparison link in an issue.** They contain your answers. To show a problem, use the example profiles (`#demo`, `#demo-2`) or describe the answers in words.

## Before a pull request

The repository has no license file yet (see the README). Until the author adds one, please open an issue before starting anything larger than a small fix, so that the terms are clear first.

## Running and testing

Nothing to install. Serve the folder and open it:

```bash
python3 -m http.server 8000
```

Run both test suites before opening a pull request:

```bash
node --test
```

```bash
node tools/e2e.mjs
```

The first needs Node 18+. The second needs Node 22+ and Chrome, and drives the real page through every critical path. [docs/TESTING.md](docs/TESTING.md) lists what each covers.

## What the project will not do

- Add an account system, a backend, or any storage of answers outside the visitor's browser.
- Collect answers for analytics, or put them in an address without the visitor choosing to share.
- Present the quiz as validated, or similarity as a probability.
- Add a framework or a build step. Plain files that GitHub Pages can serve are a feature.
- Use a language model to write results. Summaries come from fixed rules.

## Rules of the code

- **`js/core.js` stays pure.** No DOM, so Node can test it. New logic there gets a test in `compass.test.js`.
- **Share codes are a public format.** A code encodes the answer to statement *n* by position. Changing the number or order of statements, or the code format, breaks codes people already sent. The compatibility test in `compass.test.js` pins three codes issued by v0.1 and will fail if that happens. Rewording a statement is fine; adding, removing or reordering needs a new code prefix and a plan for old codes.
- **Saved state is a public format too.** The local-storage key is `ai-compass-v2`. New fields must be optional, and `sanitize()` in `js/ui.js` must accept data saved by older versions.
- **Statements stay balanced.** Every dimension has three statements from each pole. Tests enforce it.
- **The static page and the app must agree.** The eight dimensions appear both in `index.html` and in `js/core.js`; a test compares them.
- **Motion goes behind `prefers-reduced-motion`**, in the block at the end of `css/compass.css`, and anything timed in JavaScript checks `still()`.
- **Narrow-screen rules go last** in the stylesheet, in the "narrow screens" block, so they win over component rules.

## Changing the content

- **A statement or its note:** edit `ITEMS` in `js/core.js`. Keep the pole it was written from.
- **A dimension's wording:** edit `AXES` in `js/core.js` and the matching lines in `index.html`.
- **A reference camp:** edit `FACTIONS` in `js/core.js`. Tests check that every camp is reachable, matches its own profile, and that no single camp swallows random respondents.
- **About, methodology or privacy text:** edit `index.html`. The app reuses that text, so there is one copy.

## After visual changes

Re-make the images that show the app:

```bash
node tools/capture.mjs preview
```

```bash
node tools/capture.mjs shots
```

```bash
node tools/capture.mjs video
```
