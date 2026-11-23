# T3 Thoughts (unofficial)

An unofficial digest of Theo Browne (@theo on X, @t3dotgg on YouTube): his useful posts and breakdowns of his videos, without the shitposting. The texts are written by a model. The project has no connection to Theo Browne or T3 Tools.

## What is here

| Path | What it holds |
|---|---|
| `content/<date>/<id>.md` | One post or video breakdown: frontmatter with the source and its tags, then the text in English. |
| `content/<date>/<id>.ru.md` | Its Russian translation: `title` in the frontmatter and the same text. |
| `tags.yaml` | The tag vocabulary: namespaces, known tags with descriptions, aliases and implications. |
| `state/skipped/` | Posts the scout passed over, with the reason; the Stats page counts the reasons. |
| `assets/` | Theo's avatar and the header video, its posters and the credits' logos. |
| `site/` | The site, in SolidJS 2 and Vite. |

The content is written by agents on a schedule: a scout collects new posts and videos, picks the useful ones and hands them to Claude Opus for the breakdowns. Their instructions and run state live outside this repository.

## Site

```sh
cd site && pnpm install && pnpm dev     # http://localhost:5173
pnpm build                               # static files in site/dist
```

At build time the site reads `content/`, `tags.yaml` and the reasons in `state/skipped/` (the texts of skipped posts are not published). `pnpm dev` picks up new content by itself.

The pages are the feed with search over tags and text (`#/?q=…`), a post (`#/post/<id>`), all tags (`#/tags`) and statistics (`#/stats`), in English and Russian.

`site/scripts/check-*.mjs` drive the site in a headless browser (Playwright) and print what they see; run them against a dev server, e.g. `SITE=http://localhost:5173 node scripts/check-drag.mjs`.

## Deploy

`.github/workflows/pages.yml` builds the site and publishes it to GitHub Pages on every push to `main`.
