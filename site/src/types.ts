export type Kind = "video" | "post" | "reply" | "quote" | "repost";

/** A snapshot of X or YouTube numbers; they only mean something together with `capturedAt`. */
export type Metrics = {
  capturedAt: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  bookmarks?: number;
  views?: number;
  comments?: number;
};

/** `<id>.<lang>.md` next to the English `<id>.md`: a translated title and analysis. */
export type Translation = { title: string; html: string; chapters?: ChapterText[] };

/** The language-dependent part of a video chapter, from its `## [MM:SS] Title` section. */
export type ChapterText = { title: string; html: string };

/** A stretch of a video with its own tags; text per language lives in `text` and translations. */
export type Chapter = {
  start: number;
  end: number;
  tags: string[];
  ownTags: string[];
  weight: number;
  sponsor?: string;
};

export type Sponsor = {
  name: string;
  url?: string;
  start: number;
  end: number;
  /** `selfpromo` for Theo's own products, otherwise a paid sponsor */
  category: "sponsor" | "selfpromo";
};

export type ForeignPost = {
  author: string;
  name?: string;
  url?: string;
  text?: string;
  media?: string[];
};

/** One content/<day>/<id>.md file, parsed at build time by content-plugin.ts. */
export type RawItem = {
  id: string;
  url: string;
  kind: Kind;
  createdAt: string;
  day: string;
  title: string;
  titleRu?: string;
  duration?: string;
  weight: number;
  /** everything search matches: own tags, their implications, people Theo talks to */
  tags: string[];
  /** what a card shows: tags Opus set (canonical) and people Theo talks to, without implications */
  ownTags: string[];
  text?: string;
  media: string[];
  parent?: ForeignPost | "unavailable";
  quoted?: ForeignPost | "unavailable";
  video?: string;
  metrics?: Metrics;
  /** video only: seconds, chapters (English text in `chapterText`), sponsor segments */
  seconds?: number;
  chapters?: Chapter[];
  chapterText?: ChapterText[];
  sponsors?: Sponsor[];
  /** a trial file from a preview folder, not part of content/ */
  preview?: boolean;
  /** English, the primary language */
  html: string;
  /** other languages by code, e.g. `ru` */
  translations: Record<string, Translation>;
};

/** tags.yaml in the repo root, shared with the pipeline. */
/** A description in one language (the English original) or by language code. */
export type Described = string | Record<string, string>;

export type Vocabulary = {
  namespaces: Record<string, Described>;
  mood: string[];
  format: string[];
  /** tag → description */
  tags: Record<string, Described>;
  /** old or short name → canonical tag */
  aliases: Record<string, string>;
};

/** A post the pipeline dropped (state/skipped/<day>.jsonl), without its text. */
export type Skip = { day: string; reason: string };
