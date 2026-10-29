import { createSignal } from "solid-js";

/**
 * Interface languages. English is the primary language of the site and of the content;
 * every other language is a translation that falls back to English where it is missing.
 * To add one: a dictionary below and `content/<day>/<id>.<lang>.md` files from the pipeline.
 */
export const LANGS = ["en", "ru"] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = "t3-thoughts-lang";

function initial(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return LANGS.includes(saved as Lang) ? (saved as Lang) : "en";
}

const [lang, setLangSignal] = createSignal<Lang>(initial());
document.documentElement.lang = lang();

export { lang };

export function setLang(next: Lang) {
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.lang = next;
  setLangSignal(next);
}

type Plural = { one: string; few?: string; many?: string; other: string };

/** `#` in the chosen form becomes `shown`, e.g. a compact "1.2K" for 1234. */
function plural(lang: Lang, count: number, forms: Plural, shown = String(count)): string {
  // "1,2 тыс. лайков": a compacted number takes the form for many
  const rule = (shown === String(count) ? new Intl.PluralRules(lang).select(count) : "many") as keyof Plural;
  return (forms[rule] ?? forms.other).replace("#", shown);
}

type Counter = (count: number, shown: string) => string;

const en = {
  tagline: "An unofficial digest of Theo Browne's posts and videos",
  unofficial: "Unofficial site",
  footer:
    "Unofficial site. Not affiliated with Theo Browne, T3 Tools, t3.gg, T3 Chat or T3 Code. Summaries are written by a model, originals are linked.",
  nav: { feed: "Feed", tags: "Tags", stats: "Stats" },
  searchPlaceholder: "Search posts and tags: opus, -codex, mood:hype",
  tagMenu: { only: "Only this tag", and: "And (narrow)", or: "Or (widen)", exclude: "Exclude", remove: "Remove" },
  cloud: { popular: "Popular", kind: "Type", mood: "Mood", format: "Format", more: "All tags →" },
  tile: { more: (count: number) => plural("en", count, { one: "+# more post in the thread", other: "+# more posts in the thread" }) },
  close: "Close",
  kinds: { all: "All", video: "Videos", post: "Posts", reply: "Replies", quote: "Quotes", repost: "Reposts" },
  kind: { video: "video", post: "post", reply: "reply", quote: "quote", repost: "repost" },
  minor: (count: number) => `minor (${count})`,
  sort: { label: "Sort", new: "newest", likes: "likes", views: "views" },
  found: (count: number) => `Found: ${count}`,
  reset: "reset",
  nothing: "Nothing found.",
  postFailed: "The post did not load.",
  parentFailed: "The post he replied to did not load.",
  openOnX: "Open on X",
  quotesAbove: "↑ quotes the post above",
  reposted: "Theo reposted",
  videoAnalysis: "Video breakdown",
  chapters: (count: number) => plural("en", count, { one: "# chapter", other: "# chapters" }),
  sponsored: "sponsored",
  selfpromo: "his own product",
  sponsorLink: (name: string) => `${name} — Theo's link`,
  trial: "trial format",
  openAt: (clock: string) => `Watch from ${clock}`,
  main: "key post",
  noTranslation: "No translation yet, showing the English original.",
  metrics: {
    replies: ((n, s) => plural("en", n, { one: "# reply", other: "# replies" }, s)) as Counter,
    reposts: ((n, s) => plural("en", n, { one: "# repost", other: "# reposts" }, s)) as Counter,
    likes: ((n, s) => plural("en", n, { one: "# like", other: "# likes" }, s)) as Counter,
    views: ((n, s) => plural("en", n, { one: "# view", other: "# views" }, s)) as Counter,
    comments: ((n, s) => plural("en", n, { one: "# comment", other: "# comments" }, s)) as Counter,
    asOf: (when: string) => `as of ${when}`,
  },
  tagsPage: {
    title: "Tags",
    help: "Click a tag to search by it. In search: comma means “and”, || means “or”, minus means “without”, * matches any ending:",
  },
  namespaces: {
    product: "products",
    model: "models",
    company: "companies",
    person: "people",
    tech: "tech",
    mood: "mood",
    format: "format",
    sponsor: "sponsors",
    topic: "topics",
  } as Record<string, string>,
  stats: {
    title: "Stats",
    days: (count: number) => plural("en", count, { one: "# day", other: "# days" }),
    onSite: "What made it to the site",
    entries: "entries in the feed",
    threads: (count: number) => `threads among them: ${count}`,
    kindsPlural: { video: "videos", post: "posts", reply: "replies", quote: "quotes", repost: "reposts" },
    shitpost: "Shitpost index",
    seen: "posts looked at",
    kept: "kept",
    dropped: "dropped",
    reasons: {
      "emoji-only": "emoji only",
      "no-substance": "no substance",
      "repost-no-text": "repost without his own text",
      "one-word": "one word",
      omfg: "omfg",
      "reply-to-hate": "reply to a hater",
      tease: "tease without details",
      opus: "dropped by Opus while writing",
    } as Record<string, string>,
    when: "When he posts",
    peak: (from: number, count: number, zone: string) =>
      `Most often at ${from}:00–${from + 1}:00 (${count}). Your time, ${zone}.`,
    less: "less",
    more: "more",
    asTable: "as a table",
    hourAria: (peak: number) => `Posts by hour, most at ${peak}:00`,
    about: "What about",
    people: "Who he talks to",
    tics: "Verbal tics",
    top: "Most liked",
    avgLikes: "Average likes by kind",
  },
};

type Dict = typeof en;

const ru: Dict = {
  tagline: "Неофициальный дайджест постов и видео Theo Browne",
  unofficial: "Неофициальный сайт",
  footer:
    "Неофициальный сайт. Не связан с Theo Browne, T3 Tools, t3.gg, T3 Chat и T3 Code. Пересказы написала модель, оригиналы по ссылкам.",
  nav: { feed: "Лента", tags: "Теги", stats: "Статистика" },
  searchPlaceholder: "Поиск по постам и тегам: opus, -codex, mood:hype",
  tagMenu: { only: "Только этот тег", and: "И (сузить)", or: "Или (расширить)", exclude: "Исключить", remove: "Убрать" },
  cloud: { popular: "Популярные", kind: "Тип", mood: "Настроение", format: "Формат", more: "Все теги →" },
  tile: { more: (count: number) => plural("ru", count, { one: "ещё # пост в ветке", few: "ещё # поста в ветке", many: "ещё # постов в ветке", other: "ещё # поста в ветке" }) },
  close: "Закрыть",
  kinds: { all: "Всё", video: "Видео", post: "Посты", reply: "Ответы", quote: "Цитаты", repost: "Репосты" },
  kind: { video: "видео", post: "пост", reply: "ответ", quote: "цитата", repost: "репост" },
  minor: (count: number) => `мелочи (${count})`,
  sort: { label: "Сортировка", new: "новые", likes: "лайки", views: "просмотры" },
  found: (count: number) => `Найдено: ${count}`,
  reset: "сбросить",
  nothing: "Ничего не нашлось.",
  postFailed: "Пост не загрузился.",
  parentFailed: "Пост, на который он ответил, не загрузился.",
  openOnX: "Открыть на X",
  quotesAbove: "↑ цитирует пост выше",
  reposted: "Theo сделал репост",
  videoAnalysis: "Разбор видео",
  chapters: (count: number) => plural("ru", count, { one: "# глава", few: "# главы", many: "# глав", other: "# главы" }),
  sponsored: "реклама",
  selfpromo: "его собственный продукт",
  sponsorLink: (name: string) => `${name} — ссылка Theo`,
  trial: "пробный формат",
  openAt: (clock: string) => `Смотреть с ${clock}`,
  main: "главное",
  noTranslation: "Перевода пока нет, показан английский оригинал.",
  metrics: {
    replies: (n, s) => plural("ru", n, { one: "# ответ", few: "# ответа", many: "# ответов", other: "# ответа" }, s),
    reposts: (n, s) => plural("ru", n, { one: "# репост", few: "# репоста", many: "# репостов", other: "# репоста" }, s),
    likes: (n, s) => plural("ru", n, { one: "# лайк", few: "# лайка", many: "# лайков", other: "# лайка" }, s),
    views: (n, s) => plural("ru", n, { one: "# просмотр", few: "# просмотра", many: "# просмотров", other: "# просмотра" }, s),
    comments: (n, s) => plural("ru", n, { one: "# комментарий", few: "# комментария", many: "# комментариев", other: "# комментария" }, s),
    asOf: (when: string) => `на ${when}`,
  },
  tagsPage: {
    title: "Теги",
    help: "Клик по тегу ищет по нему. В поиске: запятая — «и», || — «или», минус — «без», * — любой хвост:",
  },
  namespaces: {
    product: "продукты",
    model: "модели",
    company: "компании",
    person: "люди",
    tech: "технологии",
    mood: "настроение",
    format: "формат",
    sponsor: "спонсоры",
    topic: "темы",
  },
  stats: {
    title: "Статистика",
    days: (count: number) => plural("ru", count, { one: "# день", few: "# дня", many: "# дней", other: "# дня" }),
    onSite: "Что попало на сайт",
    entries: "записей в ленте",
    threads: (count: number) => `из них веток: ${count}`,
    kindsPlural: { video: "видео", post: "постов", reply: "ответов", quote: "цитат", repost: "репостов" },
    shitpost: "Шитпост-индекс",
    seen: "просмотрено постов",
    kept: "оставлено",
    dropped: "отброшено",
    reasons: {
      "emoji-only": "только эмодзи",
      "no-substance": "без содержания",
      "repost-no-text": "репост без своего текста",
      "one-word": "одно слово",
      omfg: "omfg",
      "reply-to-hate": "ответ хейтеру",
      tease: "тизер без деталей",
      opus: "Opus отсеял при разборе",
    },
    when: "Когда пишет",
    peak: (from: number, count: number, zone: string) =>
      `Чаще всего в ${from}:00–${from + 1}:00 (${count}). Время ваше, ${zone}.`,
    less: "меньше",
    more: "больше",
    asTable: "таблицей",
    hourAria: (peak: number) => `Посты по часам, больше всего в ${peak}:00`,
    about: "О чём",
    people: "С кем говорит",
    tics: "Словечки",
    top: "Больше всего лайков",
    avgLikes: "Средние лайки по типам",
  },
};

const DICTS: Record<Lang, Dict> = { en, ru };

/** The dictionary of the current language; read it inside JSX or memos to stay reactive. */
export const t = () => DICTS[lang()];

const formatCache = new Map<string, Intl.DateTimeFormat>();

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  const key = lang() + JSON.stringify(options);
  let format = formatCache.get(key);
  if (!format) formatCache.set(key, (format = new Intl.DateTimeFormat(lang(), options)));
  return format.format(date);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(lang(), { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
