import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { skipped } from "virtual:content";
import { entries, entryMetric, items, localized, type Kind } from "./content";
import { formatCount, formatDate, lang, t } from "./i18n";
import { postHref } from "./route";
import { tagCounts } from "./search";
import { namespaceKey, Tag } from "./Tag";

/** Theo's verbal tics, counted in his own texts. */
const TICS: [label: string, pattern: RegExp][] = [
  ["lol", /\blol\b/gi],
  ["lmao", /\blmao\b/gi],
  ["insane", /\binsane\b/gi],
  ["cooked", /\bcooked\b/gi],
  ["skill issue", /\bskill issue\b/gi],
  ["🙃", /🙃/gu],
  ["😭", /😭/gu],
  ["🫡", /🫡/gu],
];

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function countBy<T>(list: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of list) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

type Bar = { label: JSX.Element; value: number; shown?: string; title?: string };

/** Horizontal bars from one baseline, one hue; the value sits at the tip in text color. */
function Bars(props: { rows: Bar[]; stacked?: boolean }) {
  const max = () => Math.max(...props.rows.map((row) => row.value), 1);
  const valueWidth = () => Math.max(1, ...props.rows.map((row) => String(row.shown ?? row.value).length));
  return (
    <div class={{ bars: true, stacked: !!props.stacked }} style={{ "--value-width": `${valueWidth()}ch` }}>
      <For each={props.rows}>
        {(row) => (
          <div class="bar-row" title={row.title}>
            <div class="bar-label">{row.label}</div>
            <div class="bar-track">
              <span class="bar-fill" style={{ width: `${Math.max((row.value / max()) * 100, 1)}%` }} />
              <span class="bar-value">{row.shown ?? row.value}</span>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

function Figure(props: { label: string; value: string | number; note?: string }) {
  return (
    <div class="figure">
      <span class="stat-label">{props.label}</span>
      <span class="stat-value">{props.value}</span>
      <Show when={props.note}>
        <span class="stat-note">{props.note}</span>
      </Show>
    </div>
  );
}

/** A section of the page: a heading and its chart, divided from the next by a rule, not boxed. */
function Panel(props: { title: string; note?: string; wide?: boolean; children: JSX.Element }) {
  return (
    <section class={{ panel: true, wide: !!props.wide }}>
      <h3>{props.title}</h3>
      <Show when={props.note}>
        <p class="panel-note">{props.note}</p>
      </Show>
      {props.children}
    </section>
  );
}

/** Posts per local hour as 24 columns from one baseline; the busiest hour is labeled. */
function Hours(props: { hours: number[]; peak: number }) {
  const max = () => Math.max(...props.hours, 1);
  return (
    <>
      <div class="hours" role="img" aria-label={t().stats.hourAria(props.peak)}>
        <For each={props.hours}>
          {(count, hour) => (
            <div
              class={{ hour: true, peak: hour() === props.peak }}
              style={{ "--peak-height": `${(count / max()) * 100}%` }}
              title={`${hour()}:00–${hour() + 1}:00 · ${count}`}
            >
              <Show when={hour() === props.peak}>
                <span class="hour-value">{t().stats.posts(count)}</span>
              </Show>
              <span class="hour-bar" style={{ height: count ? `${(count / max()) * 100}%` : "0" }} />
            </div>
          )}
        </For>
      </div>
      {/* ticks sit on the columns they name: the start of hours 0, 6, 12, 18 and the end of 23 */}
      <div class="hour-axis">
        <span style={{ "grid-column": "1" }}>0</span>
        <span style={{ "grid-column": "7" }}>6</span>
        <span style={{ "grid-column": "13" }}>12</span>
        <span style={{ "grid-column": "19" }}>18</span>
        <span class="end" style={{ "grid-column": "24" }}>24</span>
      </div>
      <details class="as-table">
        <summary>{t().stats.asTable}</summary>
        <table class="stats-table">
          <tbody>
            <For each={props.hours}>
              {(count, hour) => (
                <Show when={count > 0}>
                  <tr>
                    <td>
                      {hour()}:00–{hour() + 1}:00
                    </td>
                    <td>{count}</td>
                  </tr>
                </Show>
              )}
            </For>
          </tbody>
        </table>
      </details>
    </>
  );
}

export default function StatsPage() {
  const days = [...new Set(items.map((item) => item.day))].sort();
  const kinds = countBy(items, (item) => item.kind) as [Kind, number][];
  const threads = entries.filter((entry) => entry.items.length > 1).length;
  const seen = items.length + skipped.length;
  const reasons = countBy(skipped, (skip) => (skip.reason.startsWith("opus:") ? "opus" : skip.reason));
  const theoText = items.map((item) => item.text ?? "").join("\n");
  const tics = TICS.map(([label, pattern]) => [label, theoText.match(pattern)?.length ?? 0] as const).filter(([, count]) => count > 0);
  const people = tagCounts.filter(([tag]) => namespaceKey(tag) === "person").slice(0, 8);
  const topics = tagCounts.filter(([tag]) => !["person", "mood", "format"].includes(namespaceKey(tag))).slice(0, 10);
  const moods = tagCounts.filter(([tag]) => namespaceKey(tag) === "mood");
  const hours = Array.from({ length: 24 }, (_, hour) => items.filter((item) => item.createdAt.getHours() === hour).length);
  const peak = hours.indexOf(Math.max(...hours));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // a repost's numbers belong to someone else's post, so it stays out of the likes ranking
  const liked = entries
    .filter((entry) => entry.latest.kind !== "repost" && entryMetric(entry, "likes") >= 0)
    .sort((a, b) => entryMetric(b, "likes") - entryMetric(a, "likes"))
    .slice(0, 5);
  const likesByKind = (["video", "post", "quote", "reply"] as Kind[])
    .map((kind) => {
      const counted = items.filter((item) => item.kind === kind && item.metrics?.likes !== undefined);
      const total = counted.reduce((sum, item) => sum + item.metrics!.likes!, 0);
      return [kind, counted.length ? Math.round(total / counted.length) : -1] as const;
    })
    .filter(([, average]) => average >= 0)
    .sort((a, b) => b[1] - a[1]);
  const s = () => t().stats;
  const tagBars = (list: [string, number][]): Bar[] => list.map(([tag, count]) => ({ label: <Tag tag={tag} />, value: count }));

  return (
    <section class="page wide stats-page">
      <header class="page-head">
        <h1>{s().title}</h1>
        <p class="muted">
          {formatDate(new Date(`${days[0]}T12:00:00`), { day: "numeric", month: "long" })} —{" "}
          {formatDate(new Date(`${days.at(-1)}T12:00:00`), { day: "numeric", month: "long" })} · {s().days(days.length)}
        </p>
      </header>

      <div class="figures">
        <Figure label={s().entries} value={entries.length} note={threads ? s().threads(threads) : undefined} />
        <Figure label={s().seen} value={seen} note={s().keptShare(percent(items.length, seen))} />
        <Figure label={s().topLikes} value={liked[0] ? formatCount(entryMetric(liked[0], "likes")) : "—"} />
        <Figure label={s().peakHour} value={`${peak}:00`} note={zone} />
      </div>

      <div class="panels">
        <Panel title={s().top}>
          <Bars
            stacked
            rows={liked.map((entry) => ({
              label: <a href={postHref(entry.latest.id)}>{localized(entry.latest, lang()).title}</a>,
              value: entryMetric(entry, "likes"),
              shown: formatCount(entryMetric(entry, "likes")),
            }))}
          />
        </Panel>

        <Panel title={s().onSite} note={s().byKind}>
          <Bars rows={kinds.map(([kind, count]) => ({ label: s().kindsPlural[kind], value: count }))} />
          <p class="panel-note">{s().avgLikes}</p>
          <Bars rows={likesByKind.map(([kind, average]) => ({ label: s().kindsPlural[kind], value: average, shown: formatCount(average) }))} />
        </Panel>

        <Show when={skipped.length > 0}>
          <Panel title={s().shitpost} note={s().shitpostNote(items.length, seen)}>
            <div class="split" role="img" aria-label={`${s().kept} ${percent(items.length, seen)}%, ${s().dropped} ${percent(skipped.length, seen)}%`}>
              <span class="split-kept" style={{ "flex-grow": String(items.length) }} title={`${s().kept}: ${items.length}`} />
              <span class="split-dropped" style={{ "flex-grow": String(skipped.length) }} title={`${s().dropped}: ${skipped.length}`} />
            </div>
            <div class="split-legend">
              <span>
                <i class="split-kept" /> {s().kept} · {items.length}
              </span>
              <span>
                <i class="split-dropped" /> {s().dropped} · {skipped.length}
              </span>
            </div>
            <p class="panel-note">{s().why}</p>
            <Bars rows={reasons.map(([reason, count]) => ({ label: s().reasons[reason] ?? reason, value: count }))} />
          </Panel>
        </Show>

        <Panel title={s().when} note={s().peak(peak, hours[peak], zone)}>
          <Hours hours={hours} peak={peak} />
        </Panel>

        <Panel title={s().about}>
          <Bars rows={tagBars(topics)} />
        </Panel>

        <Panel title={s().mood}>
          <Bars rows={tagBars(moods)} />
        </Panel>

        <Show when={people.length > 0}>
          <Panel title={s().people}>
            <Bars rows={tagBars(people)} />
          </Panel>
        </Show>

        <Show when={tics.length > 0}>
          <Panel title={s().tics}>
            <Bars rows={tics.map(([label, count]) => ({ label, value: count }))} />
          </Panel>
        </Show>
      </div>
    </section>
  );
}
