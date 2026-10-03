import { defineConfig } from "vite";
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/sistema-zapateria/" : "/",
  define: { __PAGES_DEMO__: JSON.stringify(mode === "pages") },
}));
