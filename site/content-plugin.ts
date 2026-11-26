import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { marked } from "marked";
import type { Plugin } from "vite";
import { parse as parseYaml } from "yaml";
import type { ArcFrameEmbed, ArcPostEmbed, ForeignPost, RawItem, Skip, Vocabulary } from "./src/types.ts";

const MODULE_ID = "virtual:content";
const RESOLVED_ID = "\0" + MODULE_ID;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TRANSLATION = /^(.+)\.([a-z]{2})\.md$/;

type TagsFile = Vocabulary & {
  implies: Record<string, string[]>;
  drop: string[];
};

function foreign(value: unknown): RawItem["parent"] {
  if (value === "unavailable") return "unavailable";
  if (value && typeof value === "object") {
    const post = value as ForeignPost;
    return { ...post, text: post.text?.trimEnd() || undefined };
  }
  return undefined;
}

/** Aliases, then implications (transitively), then people Theo talks to, as derpibooru would. */
function resolveTags(raw: string[], people: string[], file: TagsFile): { tags: string[]; ownTags: string[] } {
  const drop = new Set(file.drop);
  const own = new Set<string>();
  for (const tag of raw) {
    const canonical = file.aliases[String(tag).toLowerCase().trim()] ?? String(tag).toLowerCase().trim();
    if (!drop.has(canonical)) own.add(canonical);
  }
  for (const handle of people) own.add(`person:${handle.replace(/^@/, "").toLowerCase()}`);

  const all = new Set<string>();
  const add = (tag: string) => {
    if (all.has(tag)) return;
    all.add(tag);
    for (const implied of file.implies[tag] ?? []) add(implied);
  };
  own.forEach(add);
  // an implied tag Opus also wrote by hand is still an implication, so the card skips it
  const implied = new Set([...all].filter((tag) => [...own].some((source) => implies(source, tag, file))));
  return { tags: [...all], ownTags: [...own].filter((tag) => !implied.has(tag)) };
}

function implies(source: string, target: string, file: TagsFile, seen = new Set<string>()): boolean {
  for (const next of file.implies[source] ?? []) {
    if (next === target) return true;
    if (!seen.has(next)) {
      seen.add(next);
      if (implies(next, target, file, seen)) return true;
    }
  }
  return false;
}

function split(path: string, raw: string): { meta: any; body: string } | undefined {
  const match = raw.match(FRONTMATTER);
  if (!match) {
    console.warn(`no frontmatter: ${path}`);
    return undefined;
  }
  return { meta: parseYaml(match[1]) ?? {}, body: raw.slice(match[0].length) };
}

function metrics(value: unknown): RawItem["metrics"] {
  if (!value || typeof value !== "object") return undefined;
  const { capturedAt, ...counts } = value as Record<string, unknown>;
  if (!capturedAt) return undefined;
  const numbers = Object.fromEntries(Object.entries(counts).filter(([, count]) => typeof count === "number"));
  return { capturedAt: new Date(capturedAt as string).toISOString(), ...numbers };
}

const CHAPTER_HEADING = /^## \[(\d+(?::\d{2}){1,2})\] (.+)$/m;
const SECTION_HEADING = /^## (.+)$/m;

function seconds(clock: string): number {
  return clock.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/** A video body: the intro, then one `## [MM:SS] Title` section per chapter. */
function splitChapters(body: string): { intro: string; chapters: { start: number; title: string; body: string }[] } {
  const parts = body.split(new RegExp(CHAPTER_HEADING.source, "m"));
  const chapters = [];
  for (let i = 1; i + 2 < parts.length + 1; i += 3) {
    chapters.push({ start: seconds(parts[i]), title: parts[i + 1].trim(), body: parts[i + 2] ?? "" });
  }
  return { intro: parts[0], chapters };
}

/** An arc body: optional intro, then one `## Title` section per chapter. */
function splitSections(body: string): { intro: string; sections: { title: string; body: string }[] } {
  const parts = body.split(new RegExp(SECTION_HEADING.source, "m"));
  const sections = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), body: parts[i + 1] ?? "" });
  }
  return { intro: parts[0], sections };
}

function registerAsset(src: string, dir: string, root: string, assets: Set<string>): string {
  if (/^[a-z]+:|^\//i.test(src)) return src;
  const path = relative(root, join(dir, src));
  assets.add(path);
  return `content-files/${path}`;
}

/** Images next to a markdown file become `content-files/<path from the repo root>`, see `assets` below. */
function renderMarkdown(markdown: string, dir: string, root: string, assets: Set<string>): string {
  const html = marked.parse(markdown, { async: false });
  return html.replace(/(<img[^>]*\ssrc=")([^"]+)"/g, (whole, head, src) => {
    if (/^[a-z]+:|^\//i.test(src)) return whole;
    return `${head}${registerAsset(src, dir, root, assets)}"`;
  });
}

/**
 * In arc prose, links to X posts we already have in content/ open our own post page;
 * all other external links open in a new tab.
 */
function enhanceArcLinks(html: string, knownPostIds: Set<string>, rewriteInternal: boolean): string {
  return html.replace(/<a href="(https?:\/\/[^"]+)">/g, (whole, href: string) => {
    if (rewriteInternal) {
      const match = href.match(/^https:\/\/x\.com\/theo\/status\/(\d+)$/);
      if (match && knownPostIds.has(match[1])) {
        return `<a href="#/post/${match[1]}" class="internal-post" data-x-url="${href}">`;
      }
    }
    return `<a href="${href}" target="_blank" rel="noreferrer">`;
  });
}

type Context = { root: string; file: TagsFile; assets: Set<string>; knownPostIds: Set<string> };

function parseItem(day: string | undefined, path: string, raw: string, context: Context): RawItem | undefined {
  const parts = split(path, raw);
  if (!parts) return undefined;
  const { meta, body } = parts;
  const { file } = context;
  const parent = foreign(meta.parent);
  const quoted = foreign(meta.quoted);
  const people = [parent, quoted]
    .map((post) => (post && post !== "unavailable" ? post.author : undefined))
    .filter((author): author is string => !!author && author.toLowerCase() !== "@theo");
  const createdAt = new Date(meta.createdAt).toISOString();
  const render = (markdown: string) => renderMarkdown(markdown, dirname(path), context.root, context.assets);

  const item: RawItem = {
    id: String(meta.id),
    url: meta.url,
    kind: meta.kind,
    createdAt,
    day: day ?? createdAt.slice(0, 10),
    title: meta.title ?? "",
    duration: meta.duration,
    weight: Number(meta.weight ?? 2),
    ...resolveTags(meta.tags ?? [], people, file),
    // a repost has no text of its own; the original lives in `quoted`
    text: meta.kind === "repost" ? undefined : meta.text?.trimEnd() || undefined,
    media: meta.media ?? [],
    parent,
    quoted,
    video: meta.video ?? undefined,
    metrics: metrics(meta.metrics),
    html: meta.kind === "arc" || (meta.kind === "video" && Array.isArray(meta.chapters)) ? "" : render(body),
    translations: {},
  };

  if (meta.kind === "video" && Array.isArray(meta.chapters)) {
    const total = meta.duration ? seconds(String(meta.duration)) : undefined;
    const { intro, chapters: sections } = splitChapters(body);
    if (sections.length !== meta.chapters.length) {
      console.warn(`${path}: ${meta.chapters.length} chapters in frontmatter, ${sections.length} sections in the text`);
    }
    item.seconds = total;
    item.html = render(intro);
    item.chapterText = sections.map((section) => ({ title: section.title, html: render(section.body) }));
    item.chapters = meta.chapters.map((chapter: any, index: number) => {
      const own = resolveTags(chapter.tags ?? [], [], file);
      return {
        start: Number(chapter.start ?? 0),
        end: Number(meta.chapters[index + 1]?.start ?? total ?? chapter.start),
        tags: own.tags,
        ownTags: own.ownTags,
        weight: Number(chapter.weight ?? 2),
        sponsor: chapter.sponsor ?? undefined,
      };
    });
    item.sponsors = (meta.sponsors ?? []).map((sponsor: any) => ({
      name: String(sponsor.name),
      url: sponsor.url,
      start: Number(sponsor.start),
      end: Number(sponsor.end),
      category: sponsor.category === "selfpromo" ? "selfpromo" : "sponsor",
    }));
    // the video is found by everything its chapters are about, and by its sponsors
    const sponsorTags = item.sponsors!.map((sponsor) => `sponsor:${sponsor.name.toLowerCase().replace(/\s+/g, "-")}`);
    item.tags = [...new Set([...item.tags, ...item.chapters!.flatMap((chapter) => chapter.tags), ...sponsorTags])];
    item.ownTags = [...new Set([...item.ownTags, ...sponsorTags])];
  }

  if (meta.kind === "arc") {
    const dir = dirname(path);
    const { intro, sections: parsed } = splitSections(body);
    const metaSections = Array.isArray(meta.sections) ? meta.sections : [];
    if (parsed.length !== metaSections.length) {
      console.warn(`${path}: ${metaSections.length} sections in frontmatter, ${parsed.length} sections in the text`);
    }
    item.from = meta.from ? String(meta.from) : undefined;
    item.to = meta.to ? String(meta.to) : undefined;
    item.summary = meta.summary ? String(meta.summary) : undefined;
    item.sourcesCount = meta.sourcesCount ? Number(meta.sourcesCount) : undefined;
    item.council = meta.council ? String(meta.council) : undefined;
    if (meta.cover) item.cover = registerAsset(String(meta.cover), dir, context.root, context.assets);
    item.html = enhanceArcLinks(render(intro), context.knownPostIds, true);
    item.sections = parsed.map((sec, index) => {
      const def = metaSections[index] ?? {};
      const own = resolveTags(def.tags ?? [], [], file);
      return {
        id: String(def.id ?? `section-${index + 1}`),
        tags: own.tags,
        ownTags: own.ownTags,
        collapsible: Boolean(def.collapsible),
      };
    });
    item.sectionText = parsed.map((sec, index) => ({
      id: item.sections![index].id,
      title: sec.title,
      html: enhanceArcLinks(render(sec.body), context.knownPostIds, !item.sections![index].collapsible),
    }));
    if (meta.embeds && typeof meta.embeds === "object") {
      const embeds: Record<string, ArcPostEmbed> = {};
      for (const [key, rawEmbed] of Object.entries(meta.embeds as Record<string, any>)) {
        embeds[key] = {
          id: String(rawEmbed.id ?? key),
          url: String(rawEmbed.url),
          createdAt: new Date(rawEmbed.createdAt).toISOString(),
          text: String(rawEmbed.text ?? "").trimEnd(),
          media: rawEmbed.media ?? [],
          parent: foreign(rawEmbed.parent),
          quoted: foreign(rawEmbed.quoted),
          metrics: metrics(rawEmbed.metrics),
        };
      }
      item.embeds = embeds;
    }
    if (meta.frames && typeof meta.frames === "object") {
      const frames: Record<string, ArcFrameEmbed> = {};
      for (const [key, rawFrame] of Object.entries(meta.frames as Record<string, any>)) {
        frames[key] = {
          id: key,
          src: registerAsset(String(rawFrame.src), dir, context.root, context.assets),
          videoUrl: String(rawFrame.videoUrl),
          time: String(rawFrame.time),
          videoTitle: String(rawFrame.videoTitle),
          caption: rawFrame.caption,
        };
      }
      item.frames = frames;
    }
    // the arc is found by every section's tags as well as its own
    item.tags = [...new Set([...item.tags, ...item.sections.flatMap((section) => section.tags)])];
  }
  return item;
}

/** One folder of `<id>.md` originals and `<id>.<lang>.md` translations. */
function readFolder(dir: string, day: string | undefined, context: Context, files: string[], preview = false): RawItem[] {
  const names = readdirSync(dir).filter((name) => name.endsWith(".md"));
  const items: RawItem[] = [];
  const byBase = new Map<string, RawItem>();
  for (const name of names.filter((name) => !TRANSLATION.test(name))) {
    const path = join(dir, name);
    files.push(path);
    const item = parseItem(day, path, readFileSync(path, "utf8"), context);
    if (item) {
      if (preview) item.preview = true;
      items.push(item);
      byBase.set(name.replace(/\.md$/, ""), item);
    }
  }
  for (const name of names) {
    const match = name.match(TRANSLATION);
    if (!match) continue;
    const path = join(dir, name);
    files.push(path);
    const item = byBase.get(match[1]);
    const parts = split(path, readFileSync(path, "utf8"));
    if (!item || !parts) {
      console.warn(`translation without an original: ${path}`);
      continue;
    }
    const render = (markdown: string) => renderMarkdown(markdown, dir, context.root, context.assets);
    if (item.chapters) {
      const { intro, chapters } = splitChapters(parts.body);
      item.translations[match[2]] = {
        title: parts.meta.title ?? item.title,
        html: render(intro),
        chapters: chapters.map((chapter) => ({ title: chapter.title, html: render(chapter.body) })),
      };
    } else if (item.sections) {
      const { intro, sections } = splitSections(parts.body);
      item.translations[match[2]] = {
        title: parts.meta.title ?? item.title,
        summary: parts.meta.summary ? String(parts.meta.summary) : undefined,
        html: enhanceArcLinks(render(intro), context.knownPostIds, true),
        sections: sections.map((section, index) => ({
          id: item.sections![index]?.id ?? `section-${index + 1}`,
          title: section.title,
          html: enhanceArcLinks(render(section.body), context.knownPostIds, !item.sections![index]?.collapsible),
        })),
      };
    } else {
      item.translations[match[2]] = { title: parts.meta.title ?? item.title, html: render(parts.body) };
    }
  }
  return items;
}

function readAll(root: string, previewDirs: string[]) {
  const files: string[] = [];
  const assets = new Set<string>();
  const tagsPath = join(root, "tags.yaml");
  files.push(tagsPath);
  const file: TagsFile = {
    namespaces: {},
    mood: [],
    format: [],
    tags: {},
    aliases: {},
    implies: {},
    drop: [],
    ...(existsSync(tagsPath) ? parseYaml(readFileSync(tagsPath, "utf8")) : {}),
  };
  const context: Context = { root, file, assets, knownPostIds: new Set() };

  const items: RawItem[] = [];
  const contentDir = join(root, "content");
  for (const day of readdirSync(contentDir).filter((name) => DAY.test(name))) {
    items.push(...readFolder(join(contentDir, day), day, context, files));
  }
  for (const dir of previewDirs) items.push(...readFolder(join(root, dir), undefined, context, files, true));
  for (const item of items) context.knownPostIds.add(item.id);
  const arcsDir = join(contentDir, "arcs");
  if (existsSync(arcsDir)) {
    items.push(...readFolder(arcsDir, undefined, context, files));
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // only the day and the reason: the dropped text itself never reaches the site
  const skipped: Skip[] = [];
  const skippedDir = join(root, "state", "skipped");
  for (const name of existsSync(skippedDir) ? readdirSync(skippedDir) : []) {
    const day = name.replace(/\.jsonl$/, "");
    if (!DAY.test(day)) continue;
    const path = join(skippedDir, name);
    files.push(path);
    for (const line of readFileSync(path, "utf8").split("\n").filter((line) => line.trim())) {
      skipped.push({ day, reason: String(JSON.parse(line).reason ?? "") });
    }
  }

  const vocabulary: Vocabulary = {
    namespaces: file.namespaces,
    mood: file.mood,
    format: file.format,
    tags: file.tags,
    aliases: file.aliases,
  };
  return { data: { items, skipped, vocabulary }, files, assets };
}

/**
 * Reads content/, tags.yaml and state/skipped/ at build time (read-only) and exposes
 * them as `virtual:content`. Images the markdown links to are served in dev and copied
 * into the build as `content-files/<path from the repo root>`.
 *
 * `preview` folders (from T3_PREVIEW, comma-separated, relative to the repo root) add
 * trial files kept outside content/, e.g. `T3_PREVIEW=drafts/trial pnpm dev`.
 */
export default function content(repoRoot: string, preview: string[] = []): Plugin {
  const root = resolve(repoRoot);
  const watched = [
    join(root, "content"),
    join(root, "tags.yaml"),
    join(root, "state", "skipped"),
    ...preview.map((dir) => join(root, dir)),
  ];
  let assets = new Set<string>();
  return {
    name: "t3-content",
    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const result = readAll(root, preview);
      assets = result.assets;
      for (const file of result.files) this.addWatchFile(file);
      return Object.entries(result.data)
        .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`)
        .join("\n");
    },
    generateBundle() {
      for (const path of assets) {
        this.emitFile({ type: "asset", fileName: `content-files/${path}`, source: readFileSync(join(root, path)) });
      }
    },
    configureServer(server) {
      server.watcher.add(watched);
      const reload = (file: string) => {
        if (!watched.some((path) => file.startsWith(path))) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload);
      server.watcher.on("change", reload);
      server.watcher.on("unlink", reload);
      // only files the markdown actually links to
      server.middlewares.use("/content-files/", (request, response, next) => {
        const path = decodeURIComponent((request.url ?? "").replace(/^\//, "").split("?")[0]);
        if (!assets.has(path)) return next();
        const type = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" }[path.split(".").pop()!];
        response.setHeader("Content-Type", type ?? "application/octet-stream");
        response.end(readFileSync(join(root, path)));
      });
    },
  };
}
