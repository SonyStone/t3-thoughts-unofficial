---
id: "5Bmp9cz1JN8"
url: https://www.youtube.com/watch?v=5Bmp9cz1JN8
kind: video
createdAt: 2026-10-26T18:00:00Z
title: "These 3 skills changed my life"
summary: "Nearly half of Theo's T3 Code threads now load one of three markdown files: sol-loop, full-send, or full-stop. None were designed up front — each is a recurring prompt patched every time a model misbehaved, built around one sidebar rule: every thread should be working or gone."
weight: 3
duration: "30:37"
tags:
  - skills
  - workflow
  - pull-requests
  - review
  - orchestration
  - product:t3-code
  - model:opus-5.5
  - model:gpt-6.1
  - format:how-to
  - mood:proud
metrics: { capturedAt: 2026-10-29T17:23:22Z, views: 199013, likes: 2651, comments: 163 }
sponsors:
  - name: WorkOS
    url: https://soydev.link/workos
    start: 57.6
    end: 144.3
    tags: [company:workos, tech:mcp]
  - name: MEGA
    url: https://soydev.link/mega
    start: 1736.3
    end: 1802.5
    category: selfpromo
    tags: [business]
sections:
  - id: sol-loop
    at: 286
    badge:
      en: "3-round budget"
      ru: "До 3 раундов"
    tags:
      - skills
      - review
      - pull-requests
      - orchestration
      - subagents
      - model:opus-5.5
      - model:gpt-6.1
      - product:t3-code
      - product:claude-code
  - id: full-send
    at: 734
    tone: accent
    badge:
      en: "27 / 32 untouched"
      ru: "27 из 32 без участия"
    tags:
      - skills
      - workflow
      - ui
      - pull-requests
      - quality
      - tech:ci
      - product:t3-code
      - product:claude-code
  - id: skill-graph
    at: 1261
    tone: ok
    badge:
      en: "42.9% of T3 Code threads"
      ru: "42,9% тредов T3 Code"
    tags:
      - skills
      - pull-requests
      - open-source
      - workflow
      - product:t3-code
  - id: fleet-and-triggers
    at: 144
    tone: muted
    badge:
      en: "No /commands"
      ru: "Без /команд"
    tags:
      - skills
      - fleet
      - harness
      - workflow
      - product:claude-code
      - product:t3-code
  - id: notes
    tags: []
    collapsible: true
frames:
  usage-report:
    src: video-5Bmp9cz1JN8/0048.webp
    at: 48
    caption:
      en: "Two-week cohort on pingdotgg/t3code (259 human-started threads): 42.9% loaded one of the three skills; sol-loop appeared in only 2 initial prompts yet loaded 79 times."
      ru: "Двухнедельный срез по pingdotgg/t3code (259 тредов от человека): 42,9% подгрузили один из трёх скиллов; sol-loop был лишь в 2 стартовых промптах, но загрузился 79 раз."
  sol-loop-skill:
    src: video-5Bmp9cz1JN8/0345.webp
    at: 345
    caption:
      en: "sol-loop/SKILL.md right after Theo's live rewrite: explicit pushback against scope creep and a hard 3-round budget (5 only for security, auth, data loss, or concurrency)."
      ru: "sol-loop/SKILL.md сразу после правки в кадре: прямой запрет раздувать скоуп и жёсткий бюджет в 3 раунда (5 — только для безопасности, прав, потери данных и конкурентности)."
  orchestrator-v2:
    src: video-5Bmp9cz1JN8/0655.webp
    at: 655
    caption:
      en: "Orchestrator V2 in T3 Code nightly: an Opus 5.5 thread delegates read-only reviews of PR #19370 to Muse Wonder Full, GPT-6.1 Sol, and Gemini 4 Argon in their native harnesses."
      ru: "Orchestrator V2 в nightly-сборке T3 Code: тред на Opus 5.5 отдаёт read-only ревью PR #19370 сразу трём моделям — Muse Wonder Full, GPT-6.1 Sol и Gemini 4 Argon — в их родных обвязках."
  merge-gate:
    src: video-5Bmp9cz1JN8/1080.webp
    at: 1080
    caption:
      en: "full-send/SKILL.md Merge gate: direct proof covering every diff line, green CI, finished review bots with written resolutions, no open change requests, and never --admin."
      ru: "Раздел Merge gate в full-send/SKILL.md: прямые доказательства на весь дифф, зелёный CI, завершённые ревью-боты с письменными ответами, никаких открытых правок и запрет на --admin."
  full-send-stats:
    src: video-5Bmp9cz1JN8/1160.webp
    at: 1160
    caption:
      en: "27 of 32 full-send threads merged without calling the question tool (84.4%); 4 of the 5 that asked still merged. Note the sidebar on the left: Working (2), Settled (1871)."
      ru: "27 из 32 тредов с full-send смёржились без вызова question tool (84,4%); 4 из 5 спросивших тоже смёржились. Слева виден сайдбар с разделами Working (2) и Settled (1871)."
  windows-pr:
    src: video-5Bmp9cz1JN8/1660.webp
    at: 1660
    caption:
      en: "PR #19656 (Windows File Explorer & browser launches) — landed by chaining \"take over and get this landed. Full send\" without Theo ever opening the pull request."
      ru: "PR #19656 (открытие Explorer и браузера в Windows) — агент пересобрал, проверил и смёржил его по связке «take over and get this landed. Full send», Тео даже не открывал PR."
---

- **`sol-loop`** ([4:46](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=286s)): Opus 5.5 writes code while GPT-6.1 Sol ("the Rottweiler") reviews it in a capped loop before GitHub bots see the PR — with a mandatory PR verdict footer so Opus cannot bury disagreements.
- **`full-send`** ([14:53](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=893s)): once Theo agrees on a plan, the agent owns proof, CI, bots, and merge — landing **27 of 32** PRs untouched in a two-week sample, backed by a 6-hour nightly release as a safety net.
- **`full-stop` + `takeover`** ([21:01](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1261s)): his most-requested skill (`69` requests vs. `35` for `full-send`) does everything short of merging for riskier work, and chains with `takeover` to land external PRs while keeping contributor credit.
- **Triggers, not `/commands`** ([4:24](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=264s), [25:25](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1525s)): a skill's `description` tells the model *when* to load it, not what it does; avoiding `disable-model-invocation` lets him chain skills by voice and skips Claude Code's double-prompt injection.

## Sol-loop: a second model as a Rottweiler
> Letting agents edit their own skills bloats them; letting models critique each other without a cap blows up PR scope.

Theo opens `sol-loop/SKILL.md` and immediately rewrites its bloated intro on camera — the result of letting Claude patch its own skill file ([3:55](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=235s)). The cleaned rule is simple: Opus 5.5 writes the code (the better collaborator and coder, in Theo's view), while GPT-6.1 Sol reviews it in a loop because it *"really does feel like the Rottweiler. It grabs onto the problem and doesn't let go"* ([6:35](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=395s)). Running that pass locally catches bugs before Macroscope, Greptile, or CodeRabbit touch the PR — and puts an otherwise idle Codex subscription to work.

Two guardrails keep the loop sane:
- **Anti-scope-creep & round budget:** make the smallest diff that satisfies Sol and push back on bad feedback. Default cap is **3 rounds** (round 1 full; later rounds check only changed code and open findings), extendable to 5 only for security, permissions, auth, data loss, or concurrency; stop early on nits; Sol must not spawn nested subagents.
- **Anti-hiding PR footer** ([7:18](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=438s)): any PR push must append `Reviewed with sol-loop: <N> rounds with <model>. Sol verdict: approved` — added after Theo noticed Opus *"almost wants to hide"* when Sol wasn't happy.

<!-- frame:sol-loop-skill -->

To actually call Sol from a Claude Code thread, Theo compares two setups ([7:58](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=478s)):
1. **CLIProxyAPI** — one proxy for all subscriptions, with a custom rate-limit dashboard and every request/response dumped into ClickHouse for SQL queries. Caveat: keep Claude subscriptions inside Claude Code (Anthropic objects to non-Claude-Code system prompts), whereas OpenAI does not care where Codex tokens run — Theo shows a quote tweet from OpenAI's Tibo calling the setup "blessed" and offering a reset if anyone gets blocked.
2. **Orchestrator V2** in T3 Code nightly ([9:35](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=575s)) — an Opus thread spawns read-only delegate reviews across Muse Wonder Full, GPT-6.1 Sol, and Gemini 4 Argon, each inside its native harness. Different training finds different bugs ([10:54](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=654s)): OpenAI is the most thorough, Claude spots weird/dangerous edge cases, and Gemini *"hallucinates more than actually finds."* PRs take longer to open, but merge faster with less slop hitting his team.

<!-- frame:orchestrator-v2 -->

## Full send: sidebar-as-inbox and the merge gate
> When running threads hide under `Working`, an agent must either finish alone or surface through the question tool.

The second and third skills follow directly from how Theo treats T3 Code's sidebar: **an inbox** ([12:14](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=734s)). Settling a thread archives it, and threads auto-settle once their PR merges; a beta `Working` drawer hides running threads until they need attention (a pattern he notes a Claude Code desktop lead is now considering as default). *"Your goal with T3 Code: all threads should be working or gone"* ([13:17](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=797s)).

`full-send` is for agreed fixes where Theo never wants to re-open a thread just to click Merge ([14:53](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=893s)). Almost every section is a *"bug fix in my skills"* written after asking a misbehaving model *why* it acted that way:
- **Explicit authority:** spells out permission to merge and `--force-with-lease` after rebase (OpenAI models otherwise *"get antsy"*), plus an escape hatch forbidding autonomy if the user didn't explicitly ask for `full send`.
- **Direct proof & merge gate:** reproduce the failure, fix it, watch the same repro pass, run repo CI, add one focused test, and open the actual app for UI work because *"green mocked tests don't prove the user experience"* ([17:45](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1065s)). Uses T3 Code's `watch_pull_request` instead of polling loops.
- **Escalating via the question tool** ([18:31](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1111s)): *"A question in a normal message goes unseen and the thread looks done."* The skill requires the harness's question tool (with full PR link, blocker, and recommended option) so the thread jumps back into the inbox — later throttled with *"ask only when you can't continue alone"* once agents started asking constantly.

<!-- frame:merge-gate -->

Querying his own ClickHouse/usage database across a two-week `pingdotgg/t3code` cohort ([19:05](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1145s)), **27 of 32** `full-send` threads merged without invoking the question tool; 4 of the 5 that did still merged, and the 5th discovered the fix was already on `main` (only 3 of 32 actually asked about the original `full-send` task). Theo says none of the 27 caused issues, but refuses to credit the skill alone: autonomous merges only work alongside **safety nets** — T3 Code cuts a nightly build every 6 hours, so regressions surface and get undone before stable ([20:24](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1224s)).

<!-- frame:full-send-stats -->

## Full stop, takeover, and the skill graph
> Five habits evolved out of each other — from rebasing stale PRs to landing external fixes Theo never opened.

For riskier changes, Theo wanted the exact same autonomous loop minus the final merge. He jokes that `full-stop` is *"pretty much entirely slop"* — Claude rebuilt it from `full-send` with one line changed: *never merge it* ([21:01](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1261s)). The agent handles verification, cross-model review, CI, bots, and teammate comments, pinging Theo only when blocked or ready to click Merge. It quickly became his most-requested skill, powering stream triage (*"figure it out full stop"*) and DM bug reports.

`full-stop` sits on top of two smaller maintainer skills:
- **`modernize`** ([24:05](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1445s)): rebase a stale PR onto `main`, or close it if another change already solved the issue.
- **`takeover`** ([22:45](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1365s)): inspect someone else's PR, branch, or thread, decide whether to build on it or rewrite using it as reference, and **preserve the original contributor's credit** — avoiding slow back-and-forth without stealing ideas.

That is how the graph grew organically: `modernize` → `takeover` → `sol-loop` → `full-send` → `full-stop`. In Theo's two-week `pingdotgg/t3code` log, **111 of 259** human-started threads loaded at least one of the main three (**28.6%** across all projects) — with `sol-loop` named in only 2 initial prompts yet loaded 79 times mid-thread or via other skills.

<!-- frame:usage-report -->

His live demo of chaining them: a contributor sent a Windows fix for *Reveal in File Explorer*. Theo pasted the link and typed *"take over and get this landed. Full send."* The agent opened PR [#19656](https://github.com/pingdotgg/t3code/pull/19656), credited the original author, closed the old PR, verified the fix, and merged — Theo never opened it ([27:06](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1626s)).

<!-- frame:windows-pr -->

## Fleet sync and why he never types /skill
> Treat descriptions as narrow activation triggers so skills compose by plain speech instead of syntax.

All of Theo's skills live in a private `fleet` repo — the only repo he still opens in VS Code — keeping auth, MCPs, and markdown skills synced across machines in three buckets: Claude-only, his `command center` desktop, and universal ([2:24](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=144s)). Alongside the main three, he still reaches for Matt Pocock's grilling skill, `file-pr`, `babysit-pr`, and a PR-comment skill forcing agents to state their model name and that they speak on his behalf. To push edits across machines, he just tells an agent to update the file and ship it across the fleet ([25:07](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1507s)).

One rule governs every file: **descriptions are triggers, not summaries** ([4:24](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=264s)) — e.g., *"Use when Theo explicitly asks for full stop"*, which matters when a misfired skill grants merge autonomy. Yet he argues firmly against setting `disable-model-invocation` or relying on `/skill` slash commands ([25:25](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1525s)):
1. He does not want to memorize command names.
2. Claude Code does not allow manually invoking multiple skills in one turn, whereas natural-language triggers let him dictate *"Full stop takeover sol loop"* via speech-to-text.
3. As a viewer (Alex) pointed out, manually invoking a `/skill` in Claude Code passes the prompt as the skill's argument, **putting the entire prompt into context twice** ([28:11](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1691s)).

He closes by committing to publish the skills in [t3dotgg/tstack](https://github.com/t3dotgg/tstack) — while stressing the point is not to copy his markdown, but to audit what you trust agents with and encode it: *"I'm becoming a manager of myself in a way"* ([30:19](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1819s)).

## Sponsors, links & notes

- **Sponsor — WorkOS** ([0:57–2:24](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=57s)): auth platform Theo pitches for enterprise SSO admin portals, built-in MCP auth, and `auth.md` (an agent sign-up standard built with Cloudflare and Firecrawl, one-click in AuthKit). Link: [soydev.link/workos](https://soydev.link/workos).
- **Self-promo — MEGA Dev** ([28:56–30:02](https://www.youtube.com/watch?v=5Bmp9cz1JN8&t=1736s)): Theo's own course with John Lindquist (Egghead) and Kent C. Dodds on shipping with AI at real companies; Theo explicitly asks viewers *not* to buy it to land a job, only if their employer pays. Link: [soydev.link/mega](https://soydev.link/mega).
- **Scope & caption notes:** the 42.9% (`111/259`) and 84.4% (`27/32`) numbers come from Theo's own two-week `pingdotgg/t3code` cohort (subagents excluded) backed by 6-hour nightly builds. Spoken quotes were verified against auto-captions and on-screen text (`sol-loop`, `Greptile`, and `Kent C. Dodds` are garbled in raw captions as "sole/soul loop", "Grab Tile", and "Kenzie Dots").

- https://www.youtube.com/watch?v=5Bmp9cz1JN8
- https://github.com/t3dotgg/tstack
- https://github.com/pingdotgg/t3code/pull/19656
- https://soydev.link/workos
- https://soydev.link/mega
