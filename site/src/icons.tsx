/** Line icons in the X action bar style, 24px grid, drawn with the current color. */
const paths = {
  reply: "M4.5 10.5a7 6.5 0 0 1 7-6.5h1a7 6.5 0 0 1 0 13H12l-5 3.5v-4.1a6.4 6.4 0 0 1-2.5-5.9Z",
  repost: "M7 4.5 3.8 7.7M7 4.5l3.2 3.2M7 4.5v10a2.5 2.5 0 0 0 2.5 2.5H13M17 19.5l3.2-3.2M17 19.5l-3.2-3.2M17 19.5v-10A2.5 2.5 0 0 0 14.5 7H11",
  like: "M12 20s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20Z",
  views: "M5 19.5v-6M10 19.5V4.5M15 19.5v-10M20 19.5v-4",
  bookmark: "M6.5 4.5h11v15.5L12 16.2l-5.5 3.8Z",
  share: "M12 3.8v11M7.8 8 12 3.8 16.2 8M5 13.5v4.2A1.8 1.8 0 0 0 6.8 19.5h10.4a1.8 1.8 0 0 0 1.8-1.8v-4.2",
  back: "M19 12H5M11 5.5 4.5 12l6.5 6.5",
  tiles: "M4.5 4.5h6v6h-6zM13.5 4.5h6v9h-6zM4.5 13.5h6v6h-6zM13.5 16.5h6v3h-6z",
  list: "M4.5 6h15M4.5 12h15M4.5 18h15",
  chevron: "M6.5 9.5 12 15l5.5-5.5",
  check: "M5 12.5 9.5 17 19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  search: "M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15.5 15.5l5 5",
} as const;

export type IconName = keyof typeof paths;

export function Icon(props: { name: IconName; class?: string }) {
  return (
    <svg
      class={props.class ?? "icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[props.name]} />
    </svg>
  );
}
