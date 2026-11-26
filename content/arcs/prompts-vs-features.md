---
id: prompts-vs-features
kind: arc
createdAt: 2026-11-26T12:00:00Z
from: 2026-09-25
to: 2026-11-26
title: "Prompts vs. features: where Theo stands"
summary: "Over two months Theo's \"just prompt it\" line grew louder — from \"at
  least half\" to \"~70% of feature requests.\" Yet merged PRs reveal a sharper
  rule underneath, plus one loud exception: side chats."
weight: 3
sourcesCount: 58
council: Opus 5.5 + Astra
cover: prompts-vs-features/oct18-tool-calls.webp
tags:
  - prompts-vs-features
  - product:t3-code
  - format:opinion-change
sections:
  - id: where-things-stand
    tags:
      - prompts-vs-features
      - product:t3-code
      - side-chats
  - id: chronological-arc
    tags:
      - prompts-vs-features
      - harness
      - orchestration
      - skills
      - tech:mcp
      - secrets
  - id: where-the-line-falls
    tags:
      - prompts-vs-features
      - skills
      - review
      - harness
      - secrets
      - tech:mcp
      - side-chats
      - product:boat
  - id: checking-oct-29
    tags:
      - side-chats
      - product:boat
      - sandbox
      - skills
      - tech:mcp
      - roadmap
  - id: gaps-and-caveats
    tags: []
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

## Where things stand

As of November 26, 2026, Theo Browne's public argument against adding UI features has only gotten sharper. In an [October 18 video](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=413s), he estimated that "at least half" of T3 Code feature requests could be solved by prompting the agent; by [November 10](https://x.com/theo/status/2119958282022568059), he put the figure at "~70% of feature requests in T3 Code are prompt skill issues at this point." In the final two weeks of the window, he was still answering requests with "just ask the agent" — turning down an automatic recap ([Nov 12](https://x.com/theo/status/2120853258260656412)), built-in observability visualizations ([Nov 20](https://x.com/theo/status/2123634511753916746)), and first-party sandbox integrations ([Nov 20](https://x.com/theo/status/2123906366905688530)).

What T3 Code actually shipped over those two months reveals a quieter boundary underneath the slogan. When an agent already has access to the files, threads, or CLI needed to do a job, Theo tells users to prompt for it — and turns his own repeated prompts into skills rather than UI. When an agent cannot give itself a capability (a secret, a remote OAuth login, a guest link for another person, an org-level policy, or durable schedules and approvals), T3 Code builds the feature. **Side chats** are the clear exception: Theo shipped them on [October 31](https://x.com/theo/status/2116446018506236371) saying "I caved" and "I don't like this feature lol," yet the team kept building and maintaining them through November 26.

## Chronological arc

**Late September – mid-October: "I usually just ask."** On [September 25](https://www.youtube.com/watch?v=ejjBbaq9RmY&t=1277s), reacting to advice to hardcode a status format into `CLAUDE.md`, Theo says: "I'm not going to go that far. When I do want this, I usually just ask." Early October established the underlying plumbing: on [October 2](https://x.com/theo/status/2106123856759120317) he announced a PR introducing thread forking, scheduled tasks, subagents, and `delegate_task`, which shipped to stable in [v0.1.0](https://github.com/pingdotgg/t3code/releases/tag/v0.1.0) on October 15. Once agents could read and message other threads, small feature requests met short dismissals: asked for effortless review and undo ([Oct 5](https://x.com/theo/status/2107332125976625523)), he replied "I just tell the agent to make the changes I want"; asked to show which instruction files loaded into a thread ([Oct 19](https://x.com/theo/status/2112102110548668689)), "Just ask the model."

**October 18 – 22: the thesis video and scope boundary.** *"Your prompts kinda suck"* ([Oct 18](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=413s)) gives the considered version of the argument, separate from X one-liners. "We are used to needing to have the feature in the tool to get the thing from the tool. But now we can just ask it, and it's very different," he says (from YouTube auto-captions, rolling duplicates removed). Moments later he [narrows the target](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=459s): "I'm talking about features that aren't actually features. They're information." His concrete example is a run-status dashboard he kept adding buttons to until he [realized](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=504s) "I could make this a chat instead." That example separates two distinct decisions: wiring up what data the agent can reach (product work) versus adding a button for every question you might ask of it (prompt work). On [October 22](https://x.com/theo/status/2113380283865260298), he added a scope line: "T3 Code is not a harness. We require you to bring your own harness."

<!-- frame:oct18-tool-calls -->

**October 25 – 29: peak tension.** On [October 25](https://x.com/theo/status/2114238361967988747) he shipped "share with guest" because he was "so tired of copy pasting from a thread" to coworkers. On [October 27](https://x.com/theo/status/2114955695434993702) he admitted T3 Code "originally was such a light wrapper" and that its built-in browser, device manager, subagents, and inline HTML had made it "a bit bloated" — the same day [#25423](https://github.com/pingdotgg/t3code/pull/25423) trimmed MCP tool schemas. Hours later, when DHH suggested building a capability directly into Omarchy (arguing against spending tokens to reconstruct something software can just do for everyone), Theo [replied](https://x.com/theo/status/2115039183266054148) with the arc's slogan: "Resist the urge! Agents relieve us of the burden of 'features that could have been prompts'".

October 29 packed four dismissals, one concession, one feature praise, and one open question into a few hours:
- Asked whether T3 Code should support a verification thread with permission to reject an agent's work, Theo [replied](https://x.com/theo/status/2115671000067326253): "You can just prompt this lol. No need for a 'feature'."
- Asked for first-party Boat.dev sandboxes per worktree (a day after praising Boat as "almost absurdly convenient" in his [Oct 28 video](https://www.youtube.com/watch?v=NBCM_ZoWZo8&t=1599s)), he [answered](https://x.com/theo/status/2115674607206412531): "No. Just tell your agent to use boat."
- Asked for automatic provider retries during outages, he [described](https://x.com/theo/status/2115788556753121405) his own workaround — spinning up a Haiku thread on a 15-minute schedule.
- Under a post about a user who had built side chats into a nightly build, replying to someone who asked why not just steer the thread, Theo [agreed](https://x.com/theo/status/2115669900664705340): "Feels weird doing a thread split when you can just ask lol. I know if we implement this, it will stop mattering in like a month tops. I'm mostly doing it so people stop asking us."
- That same morning, he [praised](https://x.com/theo/status/2115743790459994553) T3 Code's secure secret passing as "so absurdly convenient" and [polled](https://x.com/theo/status/2115700736084648177) his audience on whether T3 Code should take on "harness configuration" (skill manager, MCP marketplace, global `CLAUDE.md`/`AGENTS.md`).

**October 31 – November 10: caving, then reframing pushback.** On [October 31](https://x.com/theo/status/2116446018506236371), Theo announced: "T3 Code has /btw and side chats now. I caved." Asked what had held it up, he [answered](https://x.com/theo/status/2116465018799837639): "the hold up is that I don't like this feature lol." Two days later ([Nov 2](https://x.com/theo/status/2117142182415257643)) T3 Code shipped org-level managed policies. On [November 8](https://x.com/theo/status/2119575130204717336), he complained that Opus builds MCP authentication "that straight up doesn't work." Then came the [November 10](https://x.com/theo/status/2119958282022568059) "~70% of feature requests" post. When a reader asked whether a skill issue shared by enough people stops being a skill issue, Theo [conceded](https://x.com/theo/status/2120028053434999223): "Education issue at that point (also my problem!)." That echoes his [October 30 video](https://www.youtube.com/watch?v=ebILGCoN4UU&t=2460s), where he noted users switching from Claude to Codex couldn't find their skills and looked in T3 Code's settings instead of realizing each harness owns its own config. When Corey Quinn [pushed back](https://x.com/QuinnyPig/status/2119985674229326032) ("If 70% of the user base hits the same corner, it's time to fix the corner"), Theo [separated the denominators](https://x.com/theo/status/2120059010825277531): "Thankfully this is like 5% of our users."

<!-- post:2119958282022568059 -->

**November 12 – 26: same rule, heavier platform features.** Asked why not add an automatic recap like Claude Code instead of making the user prompt for one, Theo [refused](https://x.com/theo/status/2120853258260656412): "I'm definitely not adding more token furnaces when you can just send 1 word." Asked for built-in observability ([Nov 20](https://x.com/theo/status/2123634511753916746)), he argued visualizations "will be misunderstood and poorly optimized for" and ended with "just ask your agent!" Even when he added UI customization ([Nov 14](https://x.com/theo/status/2121455838414201200)), the interface was a prompt. Yet core capability features kept landing: secret passing became "one of our biggest" ([Nov 18](https://x.com/theo/status/2122988211291255141)), remote MCP sign-in drew ["We should have added this awhile ago tbh"](https://x.com/theo/status/2124061795753382139) on November 21, and [v0.1.12](https://github.com/pingdotgg/t3code/releases/tag/v0.1.12) (Nov 25) shipped both MCP sign-in and durable **Workflows (beta)** ([#38884](https://github.com/pingdotgg/t3code/pull/38884)) with schedules, webhooks, and human approvals.

## Where the line actually falls

Looking across his videos, replies, and merged PRs, Theo's actual boundary is much more consistent than his flippant X replies ("lol", "🙃") make it sound — though he has stated the rule only in pieces:


**Stays a prompt (or becomes a skill).** Requests where the agent already has the tools and access to do the work: review/undo, instruction-file visibility, a verifier check, a thread recap, observability queries, port/tunnel workarounds ([Oct 27](https://x.com/theo/status/2114928959653839208)), a 3am pause routed through existing schedules ([Nov 1](https://x.com/theo/status/2116758247818576346)), and Boat CLI usage. His stated objections are token waste ("token furnaces"), premature metrics people misread, and UI clutter. When he repeats a prompt himself, his intermediate step is a **skill**, not a product feature — in his [October 26 video](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=0s), he describes skills as "behaviors I found myself doing again and again that I turned into skills." Notably, the verifier idea he dismissed on October 29 exists in his own workflow as the council skill shown in his [November 3 video](https://www.youtube.com/watch?v=xq0eB8vxeqk&t=411s) (though that still leaves open the requester's harder question of hard enforcement if an agent ignores a verdict).

<!-- frame:nov03-council-skill -->

**Becomes a first-party feature.** Capabilities an agent cannot reliably conjure by itself — especially human-in-the-loop boundaries, cross-machine plumbing, and cross-harness orchestration: secure secret passing, remote MCP OAuth sign-in, guest sharing, org managed policies, the cross-harness MCP behind `delegate_task`, and durable workflows with human approvals. This fits his [October 30 video](https://www.youtube.com/watch?v=ebILGCoN4UU&t=1184s), where he locates T3 Code in "what I call the data plane" sitting outside any single harness. *(Editorial note: the evidence shows his Nov 8 MCP-auth complaint and the Nov 21 sign-in ship in sequence, not that the complaint caused the feature.)*

<!-- frame:oct30-data-plane -->

**Refused for non-prompt reasons.** Not every "no" is about prompting. On [November 9](https://x.com/theo/status/2119703397456564512), he rejected two-way CLI session sync with "Breaks too much shit" — a sync-engine boundary, not a prompting argument.

**Real exceptions.** **Side chats** are the clearest break from the rule: users already had steering and [thread forking](https://github.com/pingdotgg/t3code/releases/tag/v0.1.0), and Theo openly disliked the feature, yet shipped it because people kept asking. A smaller exception: on [October 18](https://www.youtube.com/watch?v=m-B3jIMMmUE&t=595s) he said context-usage meters were hidden behind a legacy flag "cuz we shouldn't have to think about these things," yet a subsequent ["Day 30" post](https://x.com/theo/status/2115916633726501202) added a panel section "for monitoring your limits and context usage."

## Checking the Oct 29 claims one month later

**1. Thread splitting / side chats ("will stop mattering in like a month tops").**
The prediction is ambiguous — it could mean users stop needing the feature or simply stop asking for it. Either way, engineering activity moved in the opposite direction. Side chats landed on October 31 ([#26901](https://github.com/pingdotgg/t3code/pull/26901)), and **35 PRs with "side chat(s)" in the title** merged through November 26 — not just bugfixes, but new capabilities: `/side` on mobile ([#31709](https://github.com/pingdotgg/t3code/pull/31709), Nov 5), referencing side chats from the main thread via `@` ([#38323](https://github.com/pingdotgg/t3code/pull/38323), highlighted in [v0.1.11](https://github.com/pingdotgg/t3code/releases/tag/v0.1.11), Nov 20), unified opening for subagents/side chats/linked threads ([#39515](https://github.com/pingdotgg/t3code/pull/39515), Nov 20), and Android inspector support ([#43210](https://github.com/pingdotgg/t3code/pull/43210)) plus a shared-checkout fix ([#43230](https://github.com/pingdotgg/t3code/pull/43230)) on November 26. Important distinction: merge volume proves the team kept investing in side chats, not how heavily users adopt them or whether Theo warmed up to them. He has not publicly revisited the forecast.

<!-- post:2115669900664705340 -->

<!-- post:2116446018506236371 -->

**2. Boat and cloud sandboxes ("No. Just tell your agent to use boat.").**
No PR with "boat" in the title merged. On X, however, his stance wobbled before settling back. On [November 7](https://x.com/theo/status/2118900115817812175) he dismissed cloud sandboxes: "They're only useful if you move super slowly and your env doesn't change often." On [November 9](https://x.com/theo/status/2119705561679933806), after a developer reported that prompting a VM per session lost T3 Code's PR and diff views, Theo gave a more specific local-worktree-plus-sync workflow and added tentatively: "I might have to ship cloud sandboxes as a paid feature just because people have prompt skill issues 🙃." That reads as a concession to friction, not a launch commitment. By [November 20](https://x.com/theo/status/2123906366905688530), he was back to his original line: "My solution is to just use Boat when compute is needed lol."

<!-- post:2115674607206412531 -->

<!-- post:2119705561679933806 -->

**3. The harness-configuration poll (skill manager, MCP marketplace, global `CLAUDE.md`/`AGENTS.md`).**
Still unresolved. Theo's only reply in the collected evidence on October 29 was about defaults (["Default is Opus 5.5 with nothing extra"](https://x.com/theo/status/2115704619351605514)). Zero "skill manager" PRs merged; the sole PR with "marketplace" in its title ([#42743](https://github.com/pingdotgg/t3code/pull/42743), Nov 25) fixes how T3 Code's existing Claude skill picker reads Claude's own marketplace entries. On [November 20](https://x.com/theo/status/2123906366905688530), replying to a complaint that global `AGENTS.md` pollutes every project, Theo called scoped instructions "Thing I think about a lot, will try to get this right." On [November 25](https://x.com/theo/status/2125708849680384342), he noted T3 Code displays skills "alongside configuring agent sdk using your Claude config files." Reading and surfacing a harness's existing config is narrower than managing skills and MCP servers across providers; the broader question from October 29 remains open.

## Gaps and caveats

- **X search limits:** Keyword searches cap at 10 posts per query and thread fetches sample replies, so quieter posts (including any post-Nov 1 mention of side chats) or replies inside the 587-reply Oct 29 poll may be missing.
- **YouTube coverage & captions:** The curated video excerpts run through November 13 (no video after Nov 13 matched the topic filter), so late November relies on X and GitHub. Video quotes come from auto-captions with rolling duplicate phrases removed and no words altered; auto-captions occasionally garble names (e.g., "Opus 55").
- **GitHub title-only counts:** PR counts (`35` side chats, `0` Boat, `0` skill manager, `0` verifier) search PR titles only and could miss work filed under other names. Also, PR merges measure developer activity, not user adoption.
- **Unreconciled figures & missing metadata:** The [Oct 27 post](https://x.com/theo/status/2114955695434993702) cites "79% less context" while [#25423](https://github.com/pingdotgg/t3code/pull/25423) says schemas were cut "by a third" — they likely measure different things and were not reconciled. The ["Day 30" post](https://x.com/theo/status/2115916633726501202) appears only as a quoted post inside the Oct 31 "Day 31" post, so it has no timestamp of its own in the evidence, and secret passing has no dedicated PR link in the GitHub file.

## Cited sources

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
