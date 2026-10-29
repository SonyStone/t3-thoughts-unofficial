import { For, Show } from "solid-js";
import { skipped } from "virtual:content";
import { entries, entryMetric, items, localized, type Kind } from "./content";
import { formatCount, formatDate, lang, t } from "./i18n";
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

/** Posts per local hour as one row of 24 cells: one hue, brighter means more. */
function HourStrip() {
  const hours = Array.from({ length: 24 }, (_, hour) => items.filter((item) => item.createdAt.getHours() === hour).length);
  const max = Math.max(...hours, 1);
  const peak = hours.indexOf(Math.max(...hours));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stats = () => t().stats;
  const shade = (count: number) => (count === 0 ? 0 : 20 + Math.round((count / max) * 80));
  return (
    <>
      <div class="hours" role="img" aria-label={stats().hourAria(peak)}>
        <For each={hours}>
          {(count, hour) => (
            <div
              class="hour"
              style={{ "--shade": `${shade(count)}%` }}
              title={`${hour()}:00–${hour() + 1}:00 · ${count}`}
            />
          )}
        </For>
      </div>
      <div class="hour-axis muted small">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <p class="muted small">
        {stats().peak(peak, hours[peak], zone)}{" "}
        <span class="scale">
          {stats().less} <i style={{ "--shade": "20%" }} />
          <i style={{ "--shade": "60%" }} />
          <i style={{ "--shade": "100%" }} /> {stats().more}
        </span>
      </p>
      <details class="small">
        <summary class="muted">{stats().asTable}</summary>
        <table class="stats-table">
          <tbody>
            <For each={hours}>
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

function Row(props: { label: string; value: string | number; note?: string }) {
  return (
    <div class="stat">
      <dt>{props.label}</dt>
      <dd>
        {props.value}
        <Show when={props.note}>
          <span class="muted"> {props.note}</span>
        </Show>
      </dd>
    </div>
  );
}

export default function StatsPage() {
  const days = [...new Set(items.map((item) => item.day))].sort();
  const kinds = countBy(items, (item) => item.kind) as [Kind, number][];
  const threads = entries.filter((entry) => entry.items.length > 1).length;
  const seen = items.length + skipped.length;
  const reasons = countBy(skipped, (skip) => (skip.reason.startsWith("opus:") ? "opus" : skip.reason));
  const theoText = items.map((item) => item.text ?? "").join("\n");
  const tics = TICS.map(([label, pattern]) => [label, theoText.match(pattern)?.length ?? 0] as const).filter(
    ([, count]) => count > 0,
  );
  const people = tagCounts.filter(([tag]) => namespaceKey(tag) === "person").slice(0, 8);
  // a repost's numbers belong to someone else's post, so it stays out of the likes ranking
  const liked = entries
    .filter((entry) => entry.latest.kind !== "repost" && entryMetric(entry, "likes") >= 0)
    .sort((a, b) => entryMetric(b, "likes") - entryMetric(a, "likes"))
    .slice(0, 5);
  const likesByKind = countBy(
    items.filter((item) => item.kind !== "repost"),
    (item) => item.kind,
  )
    .map(([kind]) => {
      const counted = items.filter((item) => item.kind === kind && item.metrics?.likes !== undefined);
      const total = counted.reduce((sum, item) => sum + item.metrics!.likes!, 0);
      return [kind as Kind, counted.length ? Math.round(total / counted.length) : -1] as const;
    })
    .filter(([, average]) => average >= 0)
    .sort((a, b) => b[1] - a[1]);
  const s = () => t().stats;
  const leaders = ["product", "model", "company", "tech", "sponsor"]
    .map((ns) => ({ ns, tags: tagCounts.filter(([tag]) => namespaceKey(tag) === ns).slice(0, 5) }))
    .filter((group) => group.tags.length > 0);

  return (
    <section class="page">
      <h2>{s().title}</h2>
      <p class="muted">
        {formatDate(new Date(`${days[0]}T12:00:00`), { day: "numeric", month: "long" })} —{" "}
        {formatDate(new Date(`${days.at(-1)}T12:00:00`), { day: "numeric", month: "long" })}, {s().days(days.length)}
      </p>

      <h3>{s().onSite}</h3>
      <dl class="stats">
        <Row label={s().entries} value={entries.length} note={threads ? s().threads(threads) : undefined} />
        <For each={kinds}>{([kind, count]) => <Row label={s().kindsPlural[kind]} value={count} />}</For>
      </dl>

      <Show when={liked.length > 0}>
        <h3>{s().top}</h3>
        <ol class="top">
          <For each={liked}>
            {(entry) => (
              <li>
                <a href={entry.latest.url} target="_blank" rel="noreferrer">
                  {localized(entry.latest, lang()).title}
                </a>
                <span class="muted"> · {t().metrics.likes(entryMetric(entry, "likes"), formatCount(entryMetric(entry, "likes")))}</span>
              </li>
            )}
          </For>
        </ol>
        <p class="muted small">{s().avgLikes}</p>
        <dl class="stats nested">
          <For each={likesByKind}>
            {([kind, average]) => <Row label={s().kindsPlural[kind]} value={formatCount(average)} />}
          </For>
        </dl>
      </Show>

      <Show when={skipped.length > 0}>
        <h3>{s().shitpost}</h3>
        <dl class="stats">
          <Row label={s().seen} value={seen} />
          <Row label={s().kept} value={items.length} note={`${percent(items.length, seen)}%`} />
          <Row label={s().dropped} value={skipped.length} note={`${percent(skipped.length, seen)}%`} />
        </dl>
        <dl class="stats nested">
          <For each={reasons}>{([reason, count]) => <Row label={s().reasons[reason] ?? reason} value={count} />}</For>
        </dl>
      </Show>

      <h3>{s().when}</h3>
      <HourStrip />

      <h3>{s().about}</h3>
      <For each={leaders}>
        {(group) => (
          <div class="stat-tags">
            <span class="muted small">{t().namespaces[group.ns]}</span>
            <For each={group.tags}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
          </div>
        )}
      </For>
      <div class="stat-tags">
        <span class="muted small">{t().namespaces.topic}</span>
        <For each={tagCounts.filter(([tag]) => namespaceKey(tag) === "topic").slice(0, 10)}>
          {([tag, count]) => <Tag tag={tag} count={count} />}
        </For>
      </div>

      <Show when={people.length > 0}>
        <h3>{s().people}</h3>
        <div class="stat-tags">
          <For each={people}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
        </div>
      </Show>

      <Show when={tics.length > 0}>
        <h3>{s().tics}</h3>
        <dl class="stats">
          <For each={tics}>{([label, count]) => <Row label={label} value={count} />}</For>
        </dl>
      </Show>
    </section>
  );
}
