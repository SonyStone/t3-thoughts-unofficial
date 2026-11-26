---
id: prompts-vs-features
kind: arc
createdAt: 2026-11-26T12:00:00Z
from: 2026-09-25
to: 2026-11-26
title: "Prompts vs. features: where Theo stands"
summary: "Two months of Theo Browne telling T3 Code users to \"just prompt it\" —
  checked against his videos, replies, and merged PRs."
weight: 3
sourcesCount: 58
council: Opus 5.5 + Astra
cover: prompts-vs-features/oct18-tool-calls.webp
tags:
  - prompts-vs-features
  - product:t3-code
  - format:opinion-change
sections:
  - id: side-chats
    tone: accent
    badge:
      en: "35 PRs merged"
      ru: "35 PR"
    tags:
      - side-chats
      - prompts-vs-features
      - product:t3-code
  - id: where-the-line-falls
    badge:
      en: "The pattern"
      ru: "Граница"
    tags:
      - prompts-vs-features
      - skills
      - review
      - harness
      - orchestration
      - secrets
      - tech:mcp
      - product:t3-code
  - id: boat-sandboxes
    tone: ok
    badge:
      en: "0 PRs titled \"boat\""
      ru: "0 PR с boat"
    tags:
      - product:boat
      - sandbox
      - prompts-vs-features
  - id: harness-config
    tone: muted
    badge:
      en: "Still open"
      ru: "Открыто"
    tags:
      - skills
      - tech:mcp
      - roadmap
      - harness
  - id: sources
    tags: []
    collapsible: true
frames:
  oct18-tool-calls:
    src: prompts-vs-features/oct18-tool-calls.webp
    videoUrl: https://www.youtube.com/watch?v=m-B3jIMMmUE&t=504s
    time: 8:24
    videoTitle: Your prompts kinda suck (Oct 18, 2026)
    caption:
      en: "Theo's core example: instead of building a UI feature to inspect slow tool
        calls, ask the agent to analyze them directly."
      ru: "Главный пример Тео: вместо отдельной UI-фичи для анализа медленных tool
        calls — просто попросить агента разобрать их напрямую."
  nov03-council-skill:
    src: prompts-vs-features/nov03-council-skill.webp
    videoUrl: https://www.youtube.com/watch?v=xq0eB8vxeqk&t=411s
    time: 6:51
    videoTitle: Agents Sucked At UI (Until Today) (Nov 3, 2026)
    caption:
      en: Theo's Council skill (SKILL.md) — repeated prompts become skills rather than
        UI features, serving as his own multi-model reviewer.
      ru: Скилл Council (SKILL.md) у самого Тео — повторяемые промпты становятся
        скиллами, а не кнопками, и по сути заменяют отдельный verifier.
  oct30-data-plane:
    src: prompts-vs-features/oct30-data-plane.webp
    videoUrl: https://www.youtube.com/watch?v=ebILGCoN4UU&t=1184s
    time: 19:44
    videoTitle: My last video about ai harnesses (Oct 30, 2026)
    caption:
      en: Theo's diagram placing T3 Code MCP and shared context in the "data plane" —
        outside any single harness.
      ru: Схема Тео, где T3 Code MCP и общий контекст вынесены в «плоскость данных»
        (data plane) — снаружи любой отдельной обвязки.
embeds:
  "2115669900664705340":
    id: "2115669900664705340"
    url: https://x.com/theo/status/2115669900664705340
    createdAt: 2026-10-29T04:59:46Z
    text: >-
      This is where I’m at. Feels weird doing a thread split when you can just
      ask lol. I know if we implement this, it will stop mattering in like a
      month tops. 


      I’m mostly doing it so people stop asking us.
    parent:
      id: "2115650678647582894"
      author: "@thisisboulty"
      name: Chris Boulton
      url: https://x.com/thisisboulty/status/2115650678647582894
      text: Why not just steer? This works considerably well with frontier models
        ("also can you..", "where are you at?", "start a new thread with..") -
        including open weight models (with the right provider)
    metrics:
      capturedAt: 2026-11-26T12:43:21Z
      likes: 1
      reposts: 0
      quotes: 0
      replies: 0
      bookmarks: 0
      views: 400
  "2115674607206412531":
    id: "2115674607206412531"
    url: https://x.com/theo/status/2115674607206412531
    createdAt: 2026-10-29T05:18:28Z
    text: No. Just tell your agent to use boat.
    parent:
      id: "2115672732549726337"
      author: "@chaserobbinss"
      name: Chase Robbins
      url: https://x.com/chaserobbinss/status/2115672732549726337
      text: '@theo can we pls get 1st party support for @boatdotdev in @t3codes so
        that each "worktree" actually becomes a sandbox?'
    metrics:
      capturedAt: 2026-11-26T12:43:21Z
      likes: 5
      reposts: 0
      quotes: 1
      replies: 1
      bookmarks: 3
      views: 20350
  "2116446018506236371":
    id: "2116446018506236371"
    url: https://x.com/theo/status/2116446018506236371
    createdAt: 2026-10-31T08:23:47Z
    text: |-
      Day 31/
      T3 Code has /btw and side chats now.

      I caved. Works with any model or harness. Enjoy.
    quoted:
      id: "2115916633726501202"
      author: "@theo"
      name: Theo - t3.gg
      url: https://x.com/theo/status/2115916633726501202
      text: >-
        Day 30/


        You can now customize the contents of the thread detail panel, including
        a new section for monitoring your limits and context usage
    metrics:
      capturedAt: 2026-11-26T12:43:21Z
      likes: 2514
      reposts: 43
      quotes: 32
      replies: 228
      bookmarks: 254
      views: 166338
  "2119705561679933806":
    id: "2119705561679933806"
    url: https://x.com/theo/status/2119705561679933806
    createdAt: 2026-11-09T08:16:02Z
    text: >-
      You told your agent to use boat wrong.


      Still spin up worktrees and edit code locally. The point of the boat boxes
      is to quickly sync up the changes to do anything that requires real
      cpu/ram


      Point made though. I might have to ship cloud sandboxes as a paid feature
      just because people have prompt skill issues 🙃
    parent:
      id: "2119685459215589569"
      author: "@chaserobbinss"
      name: Chase Robbins
      url: https://x.com/chaserobbinss/status/2119685459215589569
      text: >-
        tried this for ~2 weeks. claude code + codex on a hostinger vps, every
        session spun up its own @boatdotdev vm and did everything thru the cli


        you lose all the pr/diff stuff in @t3dotcodes and honestly the model
        felt dumber


        someone should benchmark agent on the vps driving the vm vs agent
        running inside the vm @AniC_dev 


        why wouldn't t3c add native sandbox support? the outcry from conductor's
        orphaned users should be market validation enough, and also a great
        opportunity to start to monetize. 


        part of this, I think has to do with the TOS from oai and anthro,
        specifically them not loving other apps/services utilizing monthly subs
        in a "proprietary" environment - meaning it's more risk than how it
        natively just wraps your local codex-cli (for example)
    metrics:
      capturedAt: 2026-11-26T12:43:21Z
      likes: 197
      reposts: 1
      quotes: 4
      replies: 22
      bookmarks: 97
      views: 20993
  "2119958282022568059":
    id: "2119958282022568059"
    url: https://x.com/theo/status/2119958282022568059
    createdAt: 2026-11-10T01:00:16Z
    text: I would say ~70% of feature requests in T3 Code are prompt skill issues at
      this point
    metrics:
      capturedAt: 2026-11-26T12:43:21Z
      likes: 1490
      reposts: 16
      quotes: 8
      replies: 126
      bookmarks: 86
      views: 82492
---

- **The slogan hardened:** from "at least half" ([Oct 18](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=413s)) to "~70% of feature requests in T3 Code are prompt skill issues" ([Nov 10](https://x.com/theo/status/2119958282022568059)) — which he later separated from overall user share at "~5% of our users."
- **The pattern in what ships:** when an agent already has the files, threads, or CLI, Theo says prompt (or turns repeated prompts into a `SKILL.md`). When an agent cannot conjure a capability itself — secrets, remote MCP OAuth, guest links, org policies, durable workflows — T3 Code builds it.
- **The loud exception — Side chats:** predicted they'd "stop mattering in like a month tops" ([Oct 29](https://x.com/theo/status/2115669900664705340)), caved two days later ([Oct 31](https://x.com/theo/status/2116446018506236371)), and the team merged **35 side-chat PRs** through Nov 26.
- **Boat & harness config:** Boat.dev sandboxes stay a prompt (0 PRs titled "boat," despite a Nov 9 wobble); the Oct 29 harness-configuration poll (skill manager, MCP marketplace) remains unresolved.

## Side chats: "I caved"
> Shipped "mostly so people stop asking us" — then became one of the most active features in the repo.

Users already had steering and [thread forking](https://github.com/pingdotgg/t3code/releases/tag/v0.1.0), and when asked what had held side chats up, Theo [replied](https://x.com/theo/status/2116465018799837639): *"the hold up is that I don't like this feature lol."*

<!-- post:2115669900664705340 -->

<!-- post:2116446018506236371 -->

After landing on Oct 31 ([#26901](https://github.com/pingdotgg/t3code/pull/26901)), **35 PRs with "side chat(s)" in the title** merged through Nov 26 — adding `/side` on mobile ([#31709](https://github.com/pingdotgg/t3code/pull/31709), Nov 5), `@`-referencing side chats from the main thread ([#38323](https://github.com/pingdotgg/t3code/pull/38323), headlining [v0.1.11](https://github.com/pingdotgg/t3code/releases/tag/v0.1.11) on Nov 20), unified opening for subagents/side chats/linked threads ([#39515](https://github.com/pingdotgg/t3code/pull/39515), Nov 20), Android inspector support ([#43210](https://github.com/pingdotgg/t3code/pull/43210), Nov 26), and a shared-checkout fix ([#43230](https://github.com/pingdotgg/t3code/pull/43230), Nov 26).

*(Title-only PR counts measure ongoing engineering investment, not user adoption; Theo has not publicly revisited his forecast.)*

## Where the line actually falls
> "Features that aren't actually features. They're information." — wiring up what data an agent can reach is product work; a button per question is prompt work.

The stance started simple: reacting on [Sep 25](https://www.youtube.com/watch?v=ejjBbaq9RmY&t=1277s) to hardcoding status formats in `CLAUDE.md`, Theo said *"I usually just ask."* Once early October's plumbing ([Oct 2](https://x.com/theo/status/2106123856759120317), shipped in [v0.1.0](https://github.com/pingdotgg/t3code/releases/tag/v0.1.0) on Oct 15) gave agents thread forking, schedules, subagents, and `delegate_task`, *"Your prompts kinda suck"* ([Oct 18](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=413s)) laid out the thesis: *"We are used to needing to have the feature in the tool to get the thing from the tool. But now we can just ask it"* ([459s](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=459s)). His concrete example was over-building a run-status dashboard before realizing *"I could make this a chat instead"* ([8:24](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=504s)). That same logic turned down review/undo ([Oct 5](https://x.com/theo/status/2107332125976625523)), showing loaded instruction files ([Oct 19](https://x.com/theo/status/2112102110548668689)), port/tunnel workarounds ([Oct 27](https://x.com/theo/status/2114928959653839208)), automatic provider retries ([Oct 29](https://x.com/theo/status/2115788556753121405): his workaround is a Haiku thread on a 15-minute schedule), a 3am pause via existing schedules ([Nov 1](https://x.com/theo/status/2116758247818576346)), automatic recaps ([Nov 12](https://x.com/theo/status/2120853258260656412): *"not adding more token furnaces when you can just send 1 word"*), and built-in observability charts ([Nov 20](https://x.com/theo/status/2123634511753916746): *"will be misunderstood and poorly optimized for"*). Even UI customization ([Nov 14](https://x.com/theo/status/2121455838414201200)) shipped as a prompt.

<!-- frame:oct18-tool-calls -->

When a prompt repeats, Theo turns it into a **skill**, not a UI button ([Oct 26](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=0s)). The verifier thread he [dismissed](https://x.com/theo/status/2115671000067326253) on Oct 29 (*"You can just prompt this lol"*) exists in his own workflow as the Council skill ([Nov 3](https://www.youtube.com/watch?v=xq0eB8vxeqk&t=411s)) — though that still leaves open hard enforcement if an agent ignores a verdict.

<!-- frame:nov03-council-skill -->

**What actually ships** are capabilities an agent cannot reliably mint itself, sitting in what Theo called the **"data plane"** outside any single harness ([Oct 30](https://www.youtube.com/watch?v=ebILGCoN4UU&t=1184s); earlier, [Oct 22](https://x.com/theo/status/2113380283865260298): *"T3 Code is not a harness. We require you to bring your own harness."*). Over these two months that meant share with guest ([Oct 25](https://x.com/theo/status/2114238361967988747), built because he was *"so tired of copy pasting from a thread"*), org managed policies ([Nov 2](https://x.com/theo/status/2117142182415257643)), secure secret passing ([Oct 29](https://x.com/theo/status/2115743790459994553), [Nov 18](https://x.com/theo/status/2122988211291255141)), remote MCP OAuth ([Nov 21](https://x.com/theo/status/2124061795753382139): *"We should have added this awhile ago tbh"*, two weeks after complaining Opus MCP auth [*"straight up doesn't work"*](https://x.com/theo/status/2119575130204717336)), and durable **Workflows (beta)** with schedules, webhooks, and human approvals in [v0.1.12](https://github.com/pingdotgg/t3code/releases/tag/v0.1.12) ([#38884](https://github.com/pingdotgg/t3code/pull/38884)).

<!-- frame:oct30-data-plane -->

The tension around that line surfaced twice. On [Oct 27](https://x.com/theo/status/2114955695434993702), Theo admitted T3 Code *"originally was such a light wrapper"* and that its built-in browser, device manager, subagents, and inline HTML had made it *"a bit bloated"* — the same day [#25423](https://github.com/pingdotgg/t3code/pull/25423) trimmed MCP tool schemas. Hours later, when DHH argued against burning tokens to reconstruct something software can just build in once for everyone (Omarchy), Theo [replied](https://x.com/theo/status/2115039183266054148): *"Resist the urge! Agents relieve us of the burden of 'features that could have been prompts'."*

Then came his Nov 10 "~70%" post:

<!-- post:2119958282022568059 -->

When a reader asked whether a widespread skill issue stops being one, Theo [conceded](https://x.com/theo/status/2120028053434999223) *"Education issue at that point (also my problem!)"* — echoing his [Oct 30](https://www.youtube.com/watch?v=ebILGCoN4UU&t=2460s) note about users hunting for Claude/Codex skills in T3 Code's settings. And when Corey Quinn [pushed back](https://x.com/QuinnyPig/status/2119985674229326032) (*"If 70% of the user base hits the same corner, it's time to fix the corner"*), Theo [separated the denominators](https://x.com/theo/status/2120059010825277531): *"Thankfully this is like 5% of our users."*

Not every "no" is about prompting — two-way CLI session sync was [rejected](https://x.com/theo/status/2119703397456564512) with *"Breaks too much shit"* (a sync-engine limit). And besides side chats, context-usage meters were a smaller reversal: hidden behind a legacy flag on [Oct 18](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=595s), then added to the thread detail panel in ["Day 30"](https://x.com/theo/status/2115916633726501202).

## Boat.dev sandboxes
> A day after calling Boat "almost absurdly convenient," Theo refused native sandbox worktrees — and held the line even after prompting a VM broke PR and diff views.

On [Oct 28](https://www.youtube.com/watch?v=NBCM_ZoWZo8&t=1599s) Theo praised Boat as *"almost absurdly convenient."* The next morning, when Chase Robbins (`@chaserobbinss`) asked for first-party Boat sandboxes per worktree, Theo shut it down:

<!-- post:2115674607206412531 -->

On [Nov 7](https://x.com/theo/status/2118900115817812175) he dismissed cloud sandboxes as *"only useful if you move super slowly and your env doesn't change often."* Two days later, Chase Robbins reported back after two weeks of prompting a VM per session: he lost T3 Code's PR and diff views and the model felt dumber. Theo laid out a local-worktree-plus-sync workflow and briefly conceded the friction:

<!-- post:2119705561679933806 -->

By [Nov 20](https://x.com/theo/status/2123906366905688530), he was back to his original stance: *"My solution is to just use Boat when compute is needed lol."* Zero PRs with "boat" in the title merged.

## Harness configuration poll
> Reading Claude's existing config, yes; managing skills and MCP across harnesses, not yet.

On [Oct 29](https://x.com/theo/status/2115700736084648177), Theo polled users on whether T3 Code should take on harness configuration — a skill manager, MCP marketplace, and global `CLAUDE.md`/`AGENTS.md`. His only collected reply that day was about defaults ([*"Default is Opus 5.5 with nothing extra"*](https://x.com/theo/status/2115704619351605514)).

Zero "skill manager" PRs have merged; the lone "marketplace" PR ([#42743](https://github.com/pingdotgg/t3code/pull/42743), Nov 25) fixes how T3 Code's existing Claude skill picker reads Claude's own marketplace entries. Replying on [Nov 20](https://x.com/theo/status/2123906366905688530) to a complaint that global `AGENTS.md` pollutes every project, Theo called scoped instructions *"Thing I think about a lot, will try to get this right,"* and on [Nov 25](https://x.com/theo/status/2125708849680384342) noted T3 Code surfaces Claude's existing config files — narrower than cross-provider management.

## Caveats & cited sources

- **X search limits:** keyword queries cap at 10 posts and thread fetches sample replies, so quieter posts or replies inside the 587-reply Oct 29 poll may be missing.
- **YouTube coverage & captions:** curated video excerpts run through Nov 13 (no video after Nov 13 matched the topic filter), so late November relies on X and GitHub. Quotes come from deduplicated auto-captions, which occasionally garble names (e.g., "Opus 55").
- **GitHub title-only counts:** PR counts (`35` side chats, `0` Boat, `0` skill manager, `0` verifier) search PR titles only, could miss work filed under other names, and measure developer activity rather than user adoption.
- **Unreconciled figures & sequence:** [Oct 27](https://x.com/theo/status/2114955695434993702) cites "79% less context" while [#25423](https://github.com/pingdotgg/t3code/pull/25423) says schemas were cut "by a third" (likely different metrics); the Nov 8 MCP-auth complaint and Nov 21 OAuth ship appear in sequence without proving causation; ["Day 30"](https://x.com/theo/status/2115916633726501202) appears only as a quote inside Oct 31; secret passing has no dedicated PR link in the GitHub extract.

- https://www.youtube.com/watch?v=ejjBbaq9RmY&t=1277s
- https://www.youtube.com/watch?v=m-B3jIMMmUE&t=413s
- https://www.youtube.com/watch?v=m-B3jIMMmUE&t=459s
- https://www.youtube.com/watch?v=m-B3jIMMmUE&t=504s
- https://www.youtube.com/watch?v=m-B3jIMMmUE&t=595s
- https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=0s
- https://www.youtube.com/watch?v=NBCM_ZoWZo8&t=1599s
- https://www.youtube.com/watch?v=ebILGCoN4UU&t=1184s
- https://www.youtube.com/watch?v=ebILGCoN4UU&t=2460s
- https://www.youtube.com/watch?v=xq0eB8vxeqk&t=411s
- https://x.com/theo/status/2106123856759120317
- https://x.com/theo/status/2107332125976625523
- https://x.com/theo/status/2112102110548668689
- https://x.com/theo/status/2113380283865260298
- https://x.com/theo/status/2114238361967988747
- https://x.com/theo/status/2114928959653839208
- https://x.com/theo/status/2114955695434993702
- https://x.com/theo/status/2115039183266054148
- https://x.com/theo/status/2115612361864487332
- https://x.com/theo/status/2115669900664705340
- https://x.com/theo/status/2115671000067326253
- https://x.com/theo/status/2115674607206412531
- https://x.com/theo/status/2115700736084648177
- https://x.com/theo/status/2115704619351605514
- https://x.com/theo/status/2115743790459994553
- https://x.com/theo/status/2115788556753121405
- https://x.com/theo/status/2115916633726501202
- https://x.com/theo/status/2116446018506236371
- https://x.com/theo/status/2116465018799837639
- https://x.com/theo/status/2116758247818576346
- https://x.com/theo/status/2117142182415257643
- https://x.com/theo/status/2118900115817812175
- https://x.com/theo/status/2119575130204717336
- https://x.com/theo/status/2119703397456564512
- https://x.com/theo/status/2119705561679933806
- https://x.com/theo/status/2119958282022568059
- https://x.com/QuinnyPig/status/2119985674229326032
- https://x.com/theo/status/2120028053434999223
- https://x.com/theo/status/2120059010825277531
- https://x.com/theo/status/2120853258260656412
- https://x.com/theo/status/2121455838414201200
- https://x.com/theo/status/2122988211291255141
- https://x.com/theo/status/2123634511753916746
- https://x.com/theo/status/2123906366905688530
- https://x.com/theo/status/2124061795753382139
- https://x.com/theo/status/2125708849680384342
- https://github.com/pingdotgg/t3code/releases/tag/v0.1.0
- https://github.com/pingdotgg/t3code/releases/tag/v0.1.11
- https://github.com/pingdotgg/t3code/releases/tag/v0.1.12
- https://github.com/pingdotgg/t3code/pull/25423
- https://github.com/pingdotgg/t3code/pull/26901
- https://github.com/pingdotgg/t3code/pull/31709
- https://github.com/pingdotgg/t3code/pull/38323
- https://github.com/pingdotgg/t3code/pull/38884
- https://github.com/pingdotgg/t3code/pull/39515
- https://github.com/pingdotgg/t3code/pull/42743
- https://github.com/pingdotgg/t3code/pull/43210
- https://github.com/pingdotgg/t3code/pull/43230
