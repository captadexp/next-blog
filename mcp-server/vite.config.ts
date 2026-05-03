import dts from "vite-plugin-dts";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: {
        "index": path.resolve(__dirname, "src/index.ts"),
        "server": path.resolve(__dirname, "src/server.ts"),
        "auth/mcp-auth": path.resolve(__dirname, "src/auth/mcp-auth.ts"),
        "tools/index": path.resolve(__dirname, "src/tools/index.ts"),
      },
      fileName: (format, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@supergrowthai/next-blog-types",
        "@supergrowthai/oneapi",
        "node:crypto",
      ]
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      outDir: "dist",
      include: ["src"],
      rollupTypes: false,
    }),
  ]
});
