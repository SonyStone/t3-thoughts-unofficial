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
  replayIntro: "Play the intro again",
  language: "Language",
  xAction: { reply: "Reply", repost: "Repost", like: "Like", views: "Views", bookmark: "Bookmark", share: "Share" },
  verified: "Verified account",
  copied: "Copied",
  credits: {
    starring: "starring",
    ceo: "full-time CEO of",
    and: "and",
    sponsors: "proudly sponsored by",
  },
  searchPlaceholder: "Search posts and tags",
  or: "or",
  and: "and",
  impliedTag: "Not on the card itself: it follows from another tag (a model implies its company)",
  clear: "Clear search",
  done: "Done",
  scrollChips: { left: "Earlier tags", right: "Later tags" },
  searchFor: (words: string) => `Search the text for “${words}”`,
  says: { lead: "Looking for", and: "and", or: "or", without: "without", not: "not", all: "Everything" },
  drop: { add: "Add (and)", negate: "Without", include: "Include", only: "Only this", and: "and", or: "or" },
  tagMenu: {
    only: "Only this tag",
    and: "Narrow: and",
    or: "Widen: or",
    exclude: "Without",
    remove: "Remove",
    // short, beside each action's preview of the query it makes
    verbs: { and: "Narrow", or: "Widen", exclude: "Without", only: "Only", remove: "Remove" },
    empty: "all entries",
    related: "Often together",
    similar: "Similar",
  },
  cloud: {
    popular: "Topics",
    kind: "Type",
    mood: "Mood",
    format: "Format",
    page: "Tags page →",
    sortBy: "Sort",
    rating: "Rating",
    day: "Day",
    people: "People",
    sort: "Order of tags",
    sorts: { popular: "Popular", recent: "Recent", name: "A–Z" },
    more: (count: number) => `+${count} more`,
  },
  views: { label: "Feed layout", tiles: "Tiles", list: "List" },
  xViews: "Views",
  backToFeed: "Back to feed",
  notFound: "No such entry.",
  breakdown: "Breakdown",
  related: "Related",
  tile: { more: (count: number) => plural("en", count, { one: "+# more post in the thread", other: "+# more posts in the thread" }) },
  close: "Close",
  kinds: { all: "All", video: "Videos", post: "Posts", reply: "Replies", quote: "Quotes", repost: "Reposts" },
  kind: { video: "video", post: "post", reply: "reply", quote: "quote", repost: "repost" },
  minor: (count: number) => `minor (${count})`,
  sort: { label: "Sort", new: "newest", likes: "likes", views: "views" },
  found: (count: number) => plural("en", count, { one: "# entry found", other: "# entries found" }),
  total: (count: number) => plural("en", count, { one: "# entry", other: "# entries" }),
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
    groups: "Tag groups",
    filter: "Filter tags",
    order: "Order",
    orders: { count: "Most used", name: "A–Z" },
    shown: (count: number) => plural("en", count, { one: "# tag", other: "# tags" }),
    // groups tags.yaml has no namespace for
    about: { sponsor: "Sponsors of his videos, from the sponsor reads", topic: "Everything else: subjects without a namespace" } as Record<string, string>,
    help: "Click a tag to search by it; right-click (long-press on a phone) for more. In search a space means “and”, || means “or”, a minus means “without”, * matches any ending:",
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
    days: (count: number) => plural("en", count, { one: "posts on # day", other: "posts on # days" }),
    posts: (count: number) => plural("en", count, { one: "# post", other: "# posts" }),
    onSite: "What made it to the site",
    entries: "entries in the feed",
    threads: (count: number) => plural("en", count, { one: "a thread counts once", other: "# threads count once each" }),
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
    avgLikes: "Average likes per post",
    keptShare: (share: number) => `${share}% made it to the site`,
    topLikes: "likes on the top post",
    peakHour: "busiest hour",
    byKind: "By kind",
    shitpostNote: (kept: number, seen: number) => `${kept} of ${seen} posts made it; the rest was dropped, and why`,
    why: "Why dropped",
    mood: "His mood",
  },
};

type Dict = typeof en;

const ru: Dict = {
  tagline: "Неофициальный дайджест постов и видео Theo Browne",
  unofficial: "Неофициальный сайт",
  footer:
    "Неофициальный сайт. Не связан с Theo Browne, T3 Tools, t3.gg, T3 Chat и T3 Code. Пересказы написала модель, оригиналы по ссылкам.",
  nav: { feed: "Лента", tags: "Теги", stats: "Статистика" },
  replayIntro: "Показать вступление снова",
  language: "Язык",
  xAction: { reply: "Ответить", repost: "Репост", like: "Нравится", views: "Просмотры", bookmark: "В закладки", share: "Поделиться" },
  verified: "Подтверждённая учётная запись",
  copied: "Скопировано",
  credits: {
    starring: "в главной роли",
    ceo: "CEO на полную ставку",
    and: "и",
    sponsors: "при поддержке",
  },
  searchPlaceholder: "Поиск по постам и тегам",
  or: "или",
  and: "и",
  impliedTag: "Этого тега нет на карточке: он следует из другого (модель подразумевает свою компанию)",
  clear: "Очистить поиск",
  done: "Готово",
  scrollChips: { left: "Предыдущие теги", right: "Следующие теги" },
  searchFor: (words: string) => `Искать в тексте «${words}»`,
  says: { lead: "Ищем", and: "и", or: "или", without: "без", not: "не", all: "Всё" },
  drop: { add: "Добавить (и)", negate: "Без", include: "Включить", only: "Только это", and: "и", or: "или" },
  tagMenu: {
    only: "Только этот тег",
    and: "Сузить: и",
    or: "Расширить: или",
    exclude: "Без",
    remove: "Убрать",
    verbs: { and: "Сузить", or: "Шире", exclude: "Без", only: "Только", remove: "Убрать" },
    empty: "все записи",
    related: "Часто вместе",
    similar: "Похожие",
  },
  cloud: {
    popular: "Темы",
    kind: "Тип",
    mood: "Настроение",
    format: "Формат",
    page: "Страница тегов →",
    sortBy: "Сортировка",
    rating: "Рейтинг",
    day: "День",
    people: "Люди",
    sort: "Порядок тегов",
    sorts: { popular: "Популярные", recent: "Свежие", name: "A–Z" },
    more: (count: number) => `ещё ${count}`,
  },
  views: { label: "Вид ленты", tiles: "Плитка", list: "Список" },
  xViews: "просмотров",
  backToFeed: "К ленте",
  notFound: "Такой записи нет.",
  breakdown: "Разбор",
  related: "По теме",
  tile: { more: (count: number) => plural("ru", count, { one: "ещё # пост в ветке", few: "ещё # поста в ветке", many: "ещё # постов в ветке", other: "ещё # поста в ветке" }) },
  close: "Закрыть",
  kinds: { all: "Всё", video: "Видео", post: "Посты", reply: "Ответы", quote: "Цитаты", repost: "Репосты" },
  kind: { video: "видео", post: "пост", reply: "ответ", quote: "цитата", repost: "репост" },
  minor: (count: number) => `мелочи (${count})`,
  sort: { label: "Сортировка", new: "новые", likes: "лайки", views: "просмотры" },
  found: (count: number) => plural("ru", count, { one: "Найдена # запись", few: "Найдено # записи", many: "Найдено # записей", other: "Найдено # записи" }),
  total: (count: number) => plural("ru", count, { one: "# запись", few: "# записи", many: "# записей", other: "# записи" }),
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
    groups: "Группы тегов",
    filter: "Найти тег",
    order: "Порядок",
    orders: { count: "Частые", name: "A–Z" },
    shown: (count: number) => plural("ru", count, { one: "# тег", few: "# тега", many: "# тегов", other: "# тега" }),
    about: { sponsor: "Спонсоры его видео, по рекламным вставкам", topic: "Всё остальное: темы без пространства имён" },
    help: "Клик по тегу ищет по нему, правый клик (долгое нажатие на телефоне) открывает меню. В поиске пробел — «и», || — «или», минус — «без», * — любой хвост:",
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
    days: (count: number) => plural("ru", count, { one: "посты за # день", few: "посты за # дня", many: "посты за # дней", other: "посты за # дня" }),
    posts: (count: number) => plural("ru", count, { one: "# пост", few: "# поста", many: "# постов", other: "# поста" }),
    onSite: "Что попало на сайт",
    entries: "записей в ленте",
    threads: (count: number) => plural("ru", count, { one: "ветка считается одной", few: "# ветки — по одной записи", many: "# веток — по одной записи", other: "# ветки — по одной записи" }),
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
    avgLikes: "Средние лайки на пост",
    keptShare: (share: number) => `${share}% попало на сайт`,
    topLikes: "лайков у топового поста",
    peakHour: "самый активный час",
    byKind: "По типам",
    shitpostNote: (kept: number, seen: number) => `${kept} из ${seen} постов попали на сайт; остальные отброшены, и почему`,
    why: "Почему отброшены",
    mood: "Настроение",
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

/**
 * A count in a post's action bar, where four of them share a phone tile's width: Russian
 * "579,6 тыс." takes the K and M of the feeds people read ("579,6K"), so it fits as English does.
 */
export function formatTightCount(value: number): string {
  return formatCount(value).replace(/\s?тыс\.$/, "K").replace(/\s?млн$/, "M").replace(/\s?млрд$/, "B");
}
