import { For, Show } from "solid-js";
import type { Metrics } from "./content";
import { formatCount, formatDate, t } from "./i18n";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

const COUNTS = ["replies", "reposts", "likes", "views", "comments"] as const;

/** X-style counters; the snapshot time is in the tooltip, since the numbers keep moving. */
export default function Counts(props: { metrics?: Metrics }) {
  return (
    <Show when={props.metrics}>
      {(metrics) => (
        <div class="counts" title={t().metrics.asOf(formatDate(new Date(metrics().capturedAt), DATE_TIME_FORMAT))}>
          <For each={COUNTS.filter((key) => metrics()[key] !== undefined)}>
            {(key) => <span>{t().metrics[key](metrics()[key]!, formatCount(metrics()[key]!))}</span>}
          </For>
        </div>
      )}
    </Show>
  );
}

