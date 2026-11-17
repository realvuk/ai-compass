# Launch assets

Material for announcing AI Compass. Everything here shows the real app. The result cards, the comparison graphic, the screenshots of results and the video use the app's built-in **made-up example profiles**; no real person's answers appear anywhere. Nothing in this folder has been posted: the text files are drafts for the author to edit.

## Images

| File | What it is | Size |
|---|---|---|
| `../assets/og-image.png` | Link-preview image used by the site | 1200×630 |
| `linkedin-promo.png` | Square promotional image | 1200×1200 |
| `example-result-card-1080x1080.png` | A result image, as the app exports it | 1080×1080 |
| `example-result-card-1080x1350.png` | The portrait format | 1080×1350 |
| `example-comparison.png` | Two example profiles compared on eight dimensions | 2x resolution |
| `screenshots/` | Landing, quiz and the three result views, in light, dark and phone layouts | |

## Video

| File | What it is |
|---|---|
| `demo.mp4` | 20-second tour, 1280×720, H.264. Best for LinkedIn and Bluesky. |
| `demo.webm` | The same, VP9. |
| `demo.gif` | The same at 800 px and 10 frames a second, for the README. |
| `demo-poster.png` | A still frame, as a fallback image. |

The tour: landing page, three answers with the slide between questions, the example result, its eight dimensions, the 2D compass, the comparison, and the image export.

## Text drafts (`copy/`)

| File | For |
|---|---|
| `description-50-words.md` | A short blurb |
| `description-150-words.md` | A longer blurb |
| `linkedin-announcement.md` | LinkedIn post |
| `bluesky-announcement.md` | Bluesky thread, each post under 300 characters |
| `show-hn.md` | Hacker News "Show HN" title and text |
| `research-community-announcement.md` | Mailing lists and research groups |

The drafts make no claims about numbers of users, testimonials, endorsements or findings, because there are none to report. Please keep it that way when editing.

## Re-making the images and the video

They are generated from the running app, so they stay true to it:

```bash
node tools/capture.mjs preview
```

```bash
node tools/capture.mjs shots
```

```bash
node tools/capture.mjs video
```

These need Node 22+, Chrome, and for the video ffmpeg. `oxipng`, if installed, shrinks the PNGs.
