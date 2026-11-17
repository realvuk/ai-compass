# Show HN submission (draft)

**Title** (80 characters maximum)

Show HN: AI Compass – a quiz that splits the AI debate into eight questions

**URL**

https://realvuk.github.io/ai-compass/

**Text**

Hi HN. I'm a computational sociologist, and I got tired of AI opinions being sorted on one line from optimist to doomer. People who agree about risk often disagree about openness, pace, military use or who should profit. So I built a small quiz that asks about eight questions separately and shows your position on each.

How it works: each dimension has six statements, three written from each pole, so agreeing with everything scores zero. Skipped statements are left out, not counted as neutral. There are eleven hand-written reference "camps"; similarity to a camp is plain cosine similarity, and the app says it is a measure of direction, not a probability. The summary text comes from fixed rules, not from a model.

Technical notes: plain HTML, CSS and JavaScript, no framework, no build step, no backend. About 50 kB gzipped. Answers live in localStorage. Sharing works by packing all 48 answers into a short checksummed code that goes in the URL fragment, so comparing with a friend needs no server. Result images are drawn on a canvas. Tests run on Node's built-in runner, and a dependency-free DevTools-protocol script drives headless Chrome for the browser tests.

What it is not: a validated instrument. I wrote the statements and the camps myself and have run no reliability or validity studies. I would value criticism of the item wording and of whether these eight dimensions are the right ones.

There is an example result if you want to look before answering anything: https://realvuk.github.io/ai-compass/#demo

Source: https://github.com/realvuk/ai-compass

The starting point was Kristin Houser's Big Think article "10 perspectives that divide the AI world".
