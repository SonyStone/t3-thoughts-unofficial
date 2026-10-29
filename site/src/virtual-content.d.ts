declare module "virtual:content" {
  export const items: import("./types").RawItem[];
  export const skipped: import("./types").Skip[];
  export const vocabulary: import("./types").Vocabulary;
}
