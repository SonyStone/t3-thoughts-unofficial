import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import content from "./content-plugin.ts";

export default defineConfig({
  plugins: [solid(), content("..", process.env.T3_PREVIEW?.split(",").filter(Boolean))],
  base: "./",
  server: { fs: { allow: [".."] } },
});
